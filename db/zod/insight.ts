import { z } from "zod";
import { actionableActionSchema } from "./actionable";

export const insightSchema = z
  .object({
    summary: z.string().min(1),
    actions: z.array(actionableActionSchema).min(1),
  })
  .strict();

export type Insight = z.infer<typeof insightSchema>;
