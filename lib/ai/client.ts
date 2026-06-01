import OpenAI from "openai";

let aiClient: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (aiClient) {
    return aiClient;
  }

  aiClient = new OpenAI({
    baseURL: "https://api.deepseek.com/v1",
    apiKey: process.env.AI_API_KEY!,
    timeout: 15000,
    maxRetries: 1,
  });

  return aiClient;
}
