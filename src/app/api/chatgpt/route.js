import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import { promises as fs } from "fs";
import { OpenAI } from "langchain/llms/openai";
import { LLMChain } from "langchain/chains";

import { PromptTemplate } from "langchain/prompts";
import { MemoryManager as TherapexMemory } from "../../utils/therapexMemory.js";
import { MemoryManager as TherapistsManager } from "../../utils/therapistsMemory.js";
import { rateLimit } from "../../../app/utils/rateLimit.js";

import OtpModel from "../../../../models/otpModel.js";

import ejsMate from "ejs-mate";
import path from "path";

import cors from "cors";
import bodyParser from "body-parser";

dotenv.config({ path: ".env.local" });

const app = express();

// MongoDB configuration
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on("connected", function () {
  console.log("Mongoose default connection open to " + process.env.MONGODB_URI);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Twilio client setup
import twilio from "twilio";
// Twilio configuration
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

app.use(cors());

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set(
  "views",
  path.join(new URL("../../../../", import.meta.url).pathname, "views")
);

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const rootDir = path.resolve(__dirname, "../../../../");

const assetsPath = path.join(rootDir, "assets");

app.use(express.static(assetsPath));

app.use(
  session({
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    resave: true,
    secret: "keyboard cat",
  })
);

app.get("/chat", async (req, res) => {
  try {
    // Get user's IP address from the X-Forwarded-For header or the remote address
    const userIP =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    console.log("User IP:", userIP);

    // Make a request to ipinfo.io to get location information
    const response = await axios.get(
      `https://ipinfo.io/${userIP}?token=1054b0756799e0`
    );
    const location = response.data;
    console.log(location);

    const locationStr = `${location.country}, ${location.region}, ${location.city}`;

    const locationObj = {
      locationStr: locationStr,
      id: "iplocation",
    };

    if (!req.session.location || req.session.id !== "geolocation") {
      req.session.location = locationObj;
    }

    res.render("frontend.ejs", { userLocation: location });
  } catch (error) {
    console.error("Error fetching location:", error.message);
    // Render the page without location information in case of an error
    res.render("frontend.ejs");
  }
});

app.get("/therapists", async (req, res) => {
  let therapistsArray;

  if (req.session.therapists) {
    therapistsArray = req.session.therapists;
  }

  res.render("therapists.ejs", { therapistsArray });
});

app.get("/privacy", (req, res) => {
  res.render("privacy.ejs");
});

app.post("/api/chat", async (req, res) => {
  let clerkUserId;
  let user;
  let clerkUserName;
  const { prompt, isText, userId, userName } = req.body;

  const identifier = req.url + "-" + (userId || "anonymous");
  const { success } = await rateLimit(identifier);
  if (!success) {
    console.log("INFO: rate limit exceeded");
    return res.status(429).send({ text: "Hi, the bot can't speak this fast" });
  }

  const name = req.headers["name"];
  const companionFileName = name + ".txt";

  console.log("prompt: ", prompt);

  clerkUserId = userId;
  clerkUserName = userName;

  if (!clerkUserId) {
    console.log("user not authorized");
    return res.status(401).json({ Message: "User not authorized" });
  }

  const data = await fs.readFile("companions/" + companionFileName, "utf8");

  const presplit = data.split("###ENDPREAMBLE###");
  const preamble = presplit[0];
  const seedsplit = presplit[1].split("###ENDSEEDCHAT###");
  const seedchat = seedsplit[0];
  const instructionsSplit = data.split("###Instructions###");
  const instructionsSection = instructionsSplit[1]; // Content after ###Instructions###

  const companionKey = {
    companionName: name,
    modelName: "chatgpt",
    userId: clerkUserId,
  };

  const memoryManager = await TherapexMemory.getInstance();

  const records = await memoryManager.readLatestHistory(companionKey);
  if (records.length === 0) {
    await memoryManager.seedChatHistory(seedchat, "\n\n", companionKey);
  }

  await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);
  let recentChatHistory = await memoryManager.readLatestHistory(companionKey);

  let readSearchHistoryQuery = await memoryManager.readSearchHistoryQuery(
    companionKey
  );

  // query Pinecone
  const similarDocs = await memoryManager.vectorSearch(
    readSearchHistoryQuery,
    companionFileName
  );

  // relevant history is the context, not chat history
  let relevantHistory = "";
  if (!!similarDocs && similarDocs.length !== 0) {
    relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n");
  }

  const model = new OpenAI({
    streaming: false,
    modelName: "gpt-4-1106-preview",
    frequencyPenalty: 1.2,
    presencePenalty: 0.5,
    temperature: 1,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  model.verbose = true;

  const chainPrompt = PromptTemplate.fromTemplate(`
  ${preamble}

  Below is relevant made up data that you should use to answer the user's prompt. Use same style and/or wording. Add to it as you wish and be creative:

  *START OF RELEVANT DATA*

   ${relevantHistory}

   *END OF RELEVANT DATA*

  Below is a ongoing conversation history between You and the user

  * START OF CHAT HISTORY*

  ${recentChatHistory}

  *END OF CHAT HISTORY*

  USE ABOVE CHAT HISTORY TO REPLY TO THIS PROMPT FROM YOUR CURRENT USER
   --> User: ${prompt}

  ${instructionsSection}`);

  const chain = new LLMChain({
    llm: model,
    prompt: chainPrompt,
  });

  const result = await chain
    .call({
      recentChatHistory: recentChatHistory,
      prompt,
    })
    .catch((error) => {
      console.error("Error during model call:", error);
    });

  await memoryManager.writeToHistory(
    "Therapex: " + result.text + "\n",
    companionKey
  );

  // const testObj = {
  //   text: "HELP5587",
  // };

  res.send(result);
});

app.post("/api/therapists", async (req, res) => {
  const clerkUserId = req.body.userId;

  const userPreference = req.query.user_preference;
  const userIssue = req.query.issue;

  const companionKey = {
    companionName: "therapex",
    modelName: "chatgpt",
    userId: clerkUserId,
  };

  const memoryManager = await TherapistsManager.getInstance();

  // let preferenceStr = "to be done"
  let locationStr = req.session.location.locationStr;

  let vectorStr = ` whose location is ${locationStr} specialized in ${userIssue}`;

  // query Pinecone
  const similarDocs = await memoryManager.vectorSearch(
    vectorStr,
    "therapists.txt"
  );

  let relevantHistory = "";
  if (!!similarDocs && similarDocs.length !== 0) {
    relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n\n");
  }

  let therapistsArray = relevantHistory.split("\n\n");

  console.log(therapistsArray);

  const model = new OpenAI({
    streaming: false,
    modelName: "gpt-3.5-turbo-16k",
    temperature: 0.3,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  model.verbose = true;

  const chainPrompt = PromptTemplate.fromTemplate(`
    Recommend 3 out of the 10 following therapists, by giving their full details in your output.
    You will recommend the three best top matches based on these factors: the location: ${locationStr} and the issues they specialize in: ${userIssue}. Prioritize location, then the issues.

    Here are the therapists: ${relevantHistory}\n\n

    Start your sentence with "I recommend the following proffesionals for your situation:" or something similar.
    Stop your output at the last of the three therapist , and dont say anything afterwards. Do not be elaborate or explain things. Essentially just give the recommendations and be concise.
`);

  const chain = new LLMChain({
    llm: model,
    prompt: chainPrompt,
  });

  const therapists = await chain
    .call({
      relevantHistory,
    })
    .catch((error) => {
      console.error("Error during model call:", error);
    });

  await memoryManager.writeToHistory(
    "Therapex: " + therapists.text + "\n",
    companionKey
  );

  req.session.therapists = therapistsArray;

  console.log("THE ABSOLUTE FINAL RESULT");

  res.send(therapists);
});

app.post("/api/speech", async (req, res) => {
  const apiUrl = "https://api.openai.com/v1/audio/speech";

  const msgText = req.body.msgText;

  const requestData = {
    model: "tts-1",
    input: `${msgText}`,
    voice: "nova",
  };

  const config = {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    responseType: "arraybuffer",
  };

  try {
    const response = await axios.post(apiUrl, requestData, config);

    res.status(200).send(response.data);
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
    res.send("Error reading file");
  }
});

// Route To Send OTP
app.post("/send-otp", async (req, res) => {
  console.log("Send otp was called");
  const phoneNumber = req.body.phoneNumber;

  req.session.phoneNumber = phoneNumber;

  try {
    // Check if the phone number is already verified
    const existingOtp = await OtpModel.findOne({ phoneNumber, verified: true });
    if (existingOtp) {
      return res.status(400).json({ error: "Phone number already verified" });
    }

    // Check if an OTP is already generated for the phone number
    const storedOtp = await OtpModel.findOne({ phoneNumber });
    let otp;

    if (storedOtp) {
      otp = storedOtp.otp;
    } else {
      // Generate a random 6-digit OTP
      otp = Math.floor(100000 + Math.random() * 900000);

      // Save OTP in the database
      await OtpModel.create({ phoneNumber, otp });
    }

    await client.messages.create({
      body: `Your OTP for Therapex is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error(`Error sending OTP: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

// Route to verify OTP
app.post("/verify-otp", async (req, res) => {
  const { otp } = req.body;

  const phoneNumber = req.session.phoneNumber;

  console.log(phoneNumber);

  try {
    // Check if the phone number is already verified
    const existingOtp = await OtpModel.findOne({ phoneNumber, verified: true });
    if (existingOtp) {
      return res.status(400).json({ error: "Phone number already verified" });
    }

    // Check if OTP exists in the database
    const storedOtp = await OtpModel.findOne({ phoneNumber, otp });

    if (storedOtp) {
      // Update the OTP as verified
      await OtpModel.updateOne({ phoneNumber, otp }, { verified: true });

      res.status(200).json({ message: "OTP verified successfully" });
    } else {
      res.status(401).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

// Potential Use Later on
// app.post("/make-call", (req, res) => {
//   const phoneNumber = req.body.phoneNumber;

//   // Generate TTS message
//   const ttsMessage =
//     "Hello Saeed, your phone is being hacked, and there is nothing that you cn do about it. Send us one million dollars or we will kill your phone, goodbye!";

//   // Make a call via Twilio
//   client.calls
//     .create({
//       twiml: `<Response><Say>${ttsMessage}</Say></Response>`,
//       to: phoneNumber,
//       from: twilioPhoneNumber,
//     })
//     .then((call) => {
//       console.log(`Call initiated: ${call.sid}`);
//       res.json({ success: true, message: "Call initiated successfully" });
//     })
//     .catch((error) => {
//       console.error(`Error making call: ${error.message}`);
//       res
//         .status(500)
//         .json({ success: false, message: "Failed to initiate call" });
//     });
// });

app.post("/user-location", async (req, res) => {
  const { latitude, longitude } = req.query;
  console.log("Received user location:", { latitude, longitude });

  try {
    // Make a request to the OpenCage Geocoding API
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=fa0bba2fd7b144bbb84235a74e041f20`
    );

    console.log(response.data.results[0].components);

    if (response.data.results && response.data.results.length > 0) {
      const components = response.data.results[0].components;

      const country = components.country;
      const region = components.state;
      const city = components.city;

      const formattedLocation = `${country}, ${region}, ${city}`;

      const locationObj = {
        locationStr: formattedLocation,
        id: "geolocation",
      };

      req.session.location = locationObj;

      console.log("Formatted location:", formattedLocation);

      res.json({
        message: "User location received successfully",
        formattedLocation,
      });
    } else {
      console.error(
        "Error from OpenCage Geocoding API:",
        response.data.message || "Unknown error"
      );
      res.status(500).json({ error: "Internal Server Error" });
    }
  } catch (error) {
    console.error("Error getting location information:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
