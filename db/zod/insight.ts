import { z } from "zod";

export const insightSchema = z
  .object({
    summary: z.string().min(1),
    actions: z.array(z.string()).min(1),
  })
  .strict();

export type Insight = z.infer<typeof insightSchema>;
