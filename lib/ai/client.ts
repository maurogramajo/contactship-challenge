import OpenAI from "openai";

export const aiClient = new OpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.AI_API_KEY!,
  timeout: 15000,
  maxRetries: 1,
});
