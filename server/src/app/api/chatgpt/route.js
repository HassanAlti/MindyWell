import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import nodemailer from "nodemailer";

import dotenv from "dotenv";

import json5 from "json5";

import axios from "axios";
import mongoose from "mongoose";
import fs from "fs";
import { OpenAI } from "langchain/llms/openai";
import { LLMChain } from "langchain/chains";

import { PromptTemplate } from "langchain/prompts";
import { MemoryManager as MindywellMemory } from "../../utils/MindywellMemory.js";
import { MemoryManager as TherapistsManager } from "../../utils/therapistsMemory.js";
import { MemoryManager } from "../../utils/memory.js";

import { rateLimit } from "../../../app/utils/rateLimit.js";

import OtpModel from "../../../../models/otpModel.js";

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

app.use(
  session({
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
    resave: true,
    secret: "keyboard cat",
  })
);

// Correct the path to serve static files from the 'public' directory
const __dirname = path.dirname(new URL(import.meta.url).pathname);
app.use(express.static(path.join(__dirname, "../../../../public")));

app.get("/api/get-ip-location", async (req, res) => {
  try {
    const userIP =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    console.log("User IP:", userIP);

    // Fetch location information based on IP
    const response = await axios.get(
      `https://ipinfo.io/${userIP}?token=1054b0756799e0`
    );
    const location = response.data;

    res.json({
      country: location.country,
      region: location.region,
      city: location.city,
    });
  } catch (error) {
    console.error("Error fetching location:", error.message);
    res.status(500).send("Error fetching location");
  }
});

app.get("/api/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../../public", "privacy.html"));
});

app.post("/api/chat", async (req, res) => {
  const name = req.headers["name"];
  const companionFileName = name + ".txt";

  let clerkUserId;

  const { prompt, userId, fullKey } = req.body;

  console.log("THE FULL KEY " + fullKey);

  const identifier = req.url + "-" + (userId || "anonymous");
  const { success } = await rateLimit(identifier);
  if (!success) {
    console.log("INFO: rate limit exceeded");
    return res.status(429).send({ text: "Hi, the bot can't speak this fast" });
  }

  console.log("prompt: ", prompt);

  clerkUserId = userId;

  if (!clerkUserId) {
    console.log("user not authorized");
    return res.status(401).json({ text: "User not authorized" });
  }
  if (name == "mindywell") {
    const data = await fs.promises.readFile(
      "companions/" + companionFileName,
      "utf8"
    );

    const presplit = data.split("###ENDPREAMBLE###");
    const preamble = presplit[0];
    const seedsplit = presplit[1].split("###ENDSEEDCHAT###");
    const seedchat = seedsplit[0];
    const instructionsSplit = data.split("###Instructions###");
    const instructionsSection = instructionsSplit[1]; // Content after ###Instructions###

    // const companionKey = {
    //   companionName: name,
    //   date: date,
    //   userId: clerkUserId,
    // };

    const memoryManager = await MindywellMemory.getInstance();

    const records = await memoryManager.readLatestHistory(fullKey);
    if (records.length === 0) {
      await memoryManager.seedChatHistory(seedchat, "\n\n", fullKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", fullKey);
    let recentChatHistory = await memoryManager.readLatestHistory(fullKey);
    recentChatHistory = recentChatHistory.join("\n");

    let readSearchHistoryQuery = await memoryManager.readSearchHistoryQuery(
      fullKey
    );
    readSearchHistoryQuery = readSearchHistoryQuery.join("\n");

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
      "Mindywell: " + result.text + "\n",
      fullKey
    );

    // const testObj = {
    //   text: "HELP5587",
    // };

    res.send({ botResponse: result.text });
  } else {
    return res.status(422).send({
      text: "Hi there, was invalid headers sent, please check again",
    });
  }
});

app.post("/api/therapists", async (req, res) => {
  const clerkUserId = req.body.userId;

  // const userPreference = req.query.user_preference;
  const userIssue = req.query.issue;

  const companionKey = {
    companionName: "mindywell",
    modelName: "chatgpt",
    userId: clerkUserId,
  };

  const memoryManager = await TherapistsManager.getInstance();

  // let preferenceStr = "to be done"
  let locationStr = req.body.locationStr;

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

  // Split the string into individual therapist entries
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
    "Mindywell: " + therapists.text + "\n",
    companionKey
  );

  res.send({ therapists, therapistsArray });
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
  // Handle the error as needed
});

// Configure nodemailer to use Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "alti646@gmail.com", // Your Gmail address
    pass: "uwbc acun afbo kewj", // Your Gmail password or App password
  },
});

// Endpoint to send email
app.post("/api/send-email", async (req, res) => {
  let { fullName, email, message } = req.body;

  let mailOptions = {
    from: "alti646@gmail.com", // Your Gmail address
    to: process.env.EMAIL, // Where you want to receive the emails
    subject: "MindyWell message from contact form",
    text: `Message from: ${fullName} <${email}>\n\n${message}`,
    html: `<strong>Message from:</strong> ${fullName} <${email}><br><br>${message}`,
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Email sent successfully", info: info });
  } catch (error) {
    res.status(500).send({ message: "Error in sending email", error: error });
  }
});

// Route To Send OTP
app.post("/api/send-otp", async (req, res) => {
  console.log("Send otp was called");
  const phoneNumber = req.body.phoneNumber;

  req.session.phoneNumber = phoneNumber;

  try {
    // Check if the phone number is already verified
    const existingOtp = await OtpModel.findOne({ phoneNumber, verified: true });
    if (existingOtp) {
      return res.status(200).json({ message: "Phone number already verified" });
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

    // Send OTP via Twilio
    await client.messages.create({
      body: `Your OTP for Mindywell is: ${otp}`,
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
app.post("/api/verify-otp", async (req, res) => {
  const { otp, phoneNumber } = req.body;

  console.log(phoneNumber);

  try {
    // Check if the phone number is already verified
    const existingOtp = await OtpModel.findOne({ phoneNumber, verified: true });
    if (existingOtp) {
      return res.status(200).json({ message: "Phone number already verified" });
    }

    // Check if OTP exists in the database
    const storedOtp = await OtpModel.findOne({ phoneNumber, otp });

    if (storedOtp) {
      // Update the OTP as verified
      await OtpModel.updateOne({ phoneNumber, otp }, { verified: true });

      res
        .status(200)
        .json({ success: true, message: "OTP verified successfully" });
    } else {
      res.status(401).json({ error: "Invalid OTP" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

app.post("/api/user-location", async (req, res) => {
  const { latitude, longitude } = req.query;
  console.log("Received user location:", { latitude, longitude });

  try {
    // Make a request to the OpenCage Geocoding API
    const response = await axios.get(
      `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=fa0bba2fd7b144bbb84235a74e041f20`
    );

    console.log(response.data.results[0].components);

    // Check if the response is successful
    if (response.data.results && response.data.results.length > 0) {
      // Extract relevant location information
      const components = response.data.results[0].components;

      const country = components.country;
      const region = components.state;
      const city = components.city;

      const formattedLocation = `${country}, ${region}, ${city}`;

      console.log("Formatted location:", formattedLocation);

      // You can do further processing or respond to the client with the formatted location
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

app.get("/api/getId", async (req, res) => {
  if (!req.session.userId) {
    console.log("NOT FOUND IN SESSIOn");
    const min = 1000000000;
    const max = 9999999999;
    const userId = Math.floor(Math.random() * (max - min + 1)) + min;
    req.session.userId = userId;
    res.send({ userId: req.session.userId });
  } else {
    console.log("userId found in session");
    res.send({ userId: req.session.userId });
  }
});

app.post("/api/keys", async (req, res) => {
  const userId = req.body.userId;

  console.log("USER ID" + userId);

  const memoryManager = await MemoryManager.getInstance();
  const keyArr = await memoryManager.getMatchingKeys(userId);

  console.log(keyArr);

  const transformedKeys = keyArr.map((key) => {
    const [time, user, _mindywell] = key.split("-");
    return { date: Number(time), key };
  });

  console.log(transformedKeys.reverse());

  res.send(transformedKeys.reverse());
});

app.post("/api/retrieve-chats", async (req, res) => {
  const { fullKey } = req.body;
  const memoryManager = await MemoryManager.getInstance();

  const messages = await memoryManager.readLatestHistory(fullKey);

  // Remove the intro message if present
  if (
    messages.length > 0 &&
    messages[0].includes("Intro Message For Every User-->")
  ) {
    messages.shift();
  }

  // Transform array into array of objects
  const transformedArray = [];
  let currentObject = {};

  messages.forEach((message) => {
    if (message.startsWith("User:")) {
      // Set chatPrompt property
      currentObject.chatPrompt = message.replace("User:", "").trim();
    } else if (message.startsWith("Mindywell:")) {
      // Set botMessage property
      currentObject.botMessage = message.replace("Mindywell:", "").trim();
      // Push the current object to the result array and reset
      transformedArray.push({ ...currentObject });
      currentObject = {};
    }
  });

  res.send({ chats: transformedArray });
});

app.post("/api/followup", async (req, res) => {
  const { fullKey } = req.body;

  const memoryManager = await MemoryManager.getInstance();

  let convoHistory = await memoryManager.readSearchHistoryQuery(fullKey);
  convoHistory = convoHistory.join("\n");
  try {
    // Request configuration
    const config = {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    };

    // API request payload
    const payload = {
      model: "gpt-3.5-turbo-1106",
      messages: [
        {
          role: "system",
          content: `You are a follow up question/statement generator and always respond with 4 short follow up questions/statements sugestions for the user to use based on this conversation between a User (mental health patient) and a therapist called Mindywell. With the last message being from Mindywell, You will generate questions/statements that the user might want to follow up with to Mindywell's latest message:  (convo from oldest to newest) *Start of convo* ${convoHistory} *End of convo*. Your output will strictly be in JSON format. i.e. { 'follow_up': ['User: QUESTION_GOES_HERE','User: QUESTION_GOES_HERE', 'User: QUESTION_GOES_HERE', 'User: QUESTION_GOES_HERE'] } . YOU WILL GENERATE QUESTIONS/STATEMENTS FROM THE USER'S PERSPECTIVE AND NOT FROM THE THERAPIST'S PERSPECTIVE. Use 'I' and 'ME' in your questions, those will refer to the user. Make the questions related to mental health and what the user might ask the therapist up next. Your follow ups will be things that the user might ask about his mental health or his situation, AND utterly not what the therapist might ask HIM. Do NOT output what the therapist might follow up with, output what the user might follow up with!`,
        },
        {
          role: "user",
          content: `Generate 4 follow up questions/statements for the User to use based on this conversation history (from oldest to newest):*Start of convo* ${convoHistory} *End of convo*`,
        },
      ],
      temperature: 0.5,
    };

    // Make the API request
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      config
    );

    // Parse the JSON response using json5
    const responseData = await json5.parse(
      response.data.choices[0].message.content
    );

    // Extract 4 questions from the user's perspective
    const followUpQuestions = responseData.follow_up.map((question) =>
      question.replace("User: ", "")
    );

    // Send the result as JSON
    res.json({ followup: followUpQuestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(4242, () => {
  console.log("Server is running on http://localhost:4242");
});
