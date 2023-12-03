import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { promises as fs } from "fs";
import { OpenAI } from "langchain/llms/openai";
import { LLMChain } from "langchain/chains";

import { PromptTemplate } from "langchain/prompts";
import { MemoryManager as TherapexMemory } from "../../utils/therapexMemory.js";
import { MemoryManager as TherapistsManager } from "../../utils/therapistsMemory.js";

import { rateLimit } from "../../../app/utils/rateLimit.js";

import ejsMate from "ejs-mate";
import path from "path";

import cors from "cors";
import bodyParser from "body-parser";

dotenv.config({ path: ".env.local" });

const app = express();
app.use(bodyParser.json());

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

app.get("/chat", async (req, res) => {
  try {
    // Get user's IP address from the X-Forwarded-For header or the remote address
    const userIP =
      req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Rest of your code...
    console.log("User IP:", userIP);

    // Make a request to ipinfo.io to get location information
    const response = await axios.get(
      `https://ipinfo.io/${userIP}?token=1054b0756799e0`
    );
    const location = response.data;
    console.log(location);

    res.render("frontend.ejs", { userLocation: location });
  } catch (error) {
    console.error("Error fetching location:", error.message);
    // Render the page without location information in case of an error
    res.render("frontend.ejs");
  }
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
  // let locationStr = "to be done";

  let vectorStr = `specialized in ${userIssue}`;

  // query Pinecone
  const similarDocs = await memoryManager.vectorSearch(
    vectorStr,
    "therapists.txt"
  );

  let relevantHistory = "";
  if (!!similarDocs && similarDocs.length !== 0) {
    relevantHistory = similarDocs.map((doc) => doc.pageContent).join("\n\n");
  }

  const model = new OpenAI({
    streaming: false,
    modelName: "gpt-3.5-turbo-16k",
    temperature: 0.5,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  model.verbose = true;

  const chainPrompt = PromptTemplate.fromTemplate(`
    Recommend the following therapists, by giving their full details in your output, in a way a therapist called Therapex would.
    Start your sentence with "I recommend the following proffesionals for your situation:" or something similar.

    Here are the therapists: ${relevantHistory}
`);

  const chain = new LLMChain({
    llm: model,
    prompt: chainPrompt,
  });

  const result = await chain
    .call({
      relevantHistory,
    })
    .catch((error) => {
      console.error("Error during model call:", error);
    });

  await memoryManager.writeToHistory(
    "Therapex: " + result.text + "\n",
    companionKey
  );

  res.send(result);
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

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
