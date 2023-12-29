import { Redis } from "@upstash/redis";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import pkg from "@supabase/supabase-js";
const { SupabaseClient, createClient } = pkg;

export class MemoryManager {
  constructor() {
    this.history = Redis.fromEnv();
    if (process.env.VECTOR_DB === "pinecone") {
      this.vectorDBClient = new PineconeClient();
    } else {
      const auth = {
        detectSessionInUrl: false,
        persistSession: false,
        autoRefreshToken: false,
      };
      const url = process.env.SUPABASE_URL;
      const privateKey = process.env.SUPABASE_PRIVATE_KEY;
      this.vectorDBClient = createClient(url, privateKey, { auth });
    }
  }

  async init() {
    if (this.vectorDBClient instanceof PineconeClient) {
      await this.vectorDBClient.init({
        apiKey: "39baed47-fd35-4ca5-bae4-89f46b435096",
        environment: "gcp-starter",
      });
    }
  }

  static async getInstance() {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
      await MemoryManager.instance.init();
    }
    return MemoryManager.instance;
  }

  generateRedisCompanionKey(companionKey) {
    return `${companionKey.companionName}-${companionKey.modelName}-${companionKey.userId}`;
  }

  async writeToHistory(text, companionKey) {
    if (!companionKey || typeof companionKey.userId === "undefined") {
      console.log("Companion key set incorrectly");
      return "";
    }

    const key = this.generateRedisCompanionKey(companionKey);
    const result = await this.history.zadd(key, {
      score: Date.now(),
      member: text,
    });

    return result;
  }

  async getMatchingKeys(userId) {
    userId = Number(userId);
    const [newCursor, keys] = await this.history.scan(0, {
      match: `*-${userId}-*`,
      count: 100,
    });

    console.log("New cursor: " + newCursor);

    return keys;
  }

  async readLatestHistory(fullKey, companionKey) {
    let key;
    if (!fullKey) {
      if (!companionKey || typeof companionKey.userId === "undefined") {
        console.log("Companion key set incorrectly");
        return "";
      } else {
        key = this.generateRedisCompanionKey(companionKey);
      }
    } else {
      key = fullKey;
    }

    let result = await this.history.zrange(key, 0, Date.now(), {
      byScore: true,
    });

    result = result.slice(-30);

    return result;

    // to do bil route.js
    // const recentChats = result.reverse().join("\n");
    // return recentChats;
  }

  async readSearchHistoryQuery(fullKey, companionKey) {
    let key;
    if (!fullKey) {
      if (!companionKey || typeof companionKey.userId === "undefined") {
        console.log("Companion key set incorrectly");
        return "";
      } else {
        key = this.generateRedisCompanionKey(companionKey);
      }
    } else {
      key = fullKey;
    }

    let result = await this.history.zrange(key, 0, Date.now(), {
      byScore: true,
    });

    result = result.slice(-8);

    return result;
  }

  async seedChatHistory(seedContent, delimiter = "\n", companionKey) {
    const key = this.generateRedisCompanionKey(companionKey);
    if (await this.history.exists(key)) {
      console.log("User already has chat history");
      return;
    }

    const content = seedContent.split(delimiter);
    let counter = 0;
    for (const line of content) {
      await this.history.zadd(key, { score: counter, member: line });
      counter += 1;
    }
  }
}
