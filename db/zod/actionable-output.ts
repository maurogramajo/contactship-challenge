import { z } from "zod";
import {
  actionableActionInputSchema,
  recommendedChannelSchema,
} from "./actionable";

export const actionableOutputSchema = z.object({
  summary: z.string().min(1),
  recommended_channel: recommendedChannelSchema,
  actions: z.array(actionableActionInputSchema).min(1),
  reasoning: z.string().optional(),
});

export type ActionableOutput = z.infer<typeof actionableOutputSchema>;
