import { z } from "zod";

export const upsertAiSettingsSchema = z.object({
  objective: z.string().min(1).max(1000),
  additional_instructions: z.string().max(2000).optional(),
});

export type UpsertAiSettingsInput = z.infer<typeof upsertAiSettingsSchema>;
