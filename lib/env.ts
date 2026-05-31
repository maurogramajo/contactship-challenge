import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.url(),
  AI_API_KEY: z.string().min(1),
  AI_PROVIDER: z.enum(["deepseek", "openai", "anthropic", "google"]),
  AI_MODEL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  HUBSPOT_CLIENT_ID: z.string().min(1),
  HUBSPOT_CLIENT_SECRET: z.string().min(1),
  HUBSPOT_REDIRECT_URI: z.url(),

  // Optional (no defaults)
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  WEBHOOK_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
