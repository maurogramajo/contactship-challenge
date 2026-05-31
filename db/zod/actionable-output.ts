import { z } from "zod";

export const actionableOutputSchema = z.object({
  summary: z.string().min(1),
  recommended_channel: z.enum(["whatsapp", "call", "email", "instagram"]),
  recommended_action: z.string().min(1),
  draft_message: z.string().optional(),
  reasoning: z.string().optional(),
});

export type ActionableOutput = z.infer<typeof actionableOutputSchema>;
