import { z } from "zod";

export const callSchema = z.object({
  id: z.uuid(),
  contact_id: z.uuid(),
  created_at: z.string().nullish(),
  direction: z.enum(["inbound", "outbound"]).nullish(),
  from: z.string().nullish(),
  call_record: z.url().nullish(),
  call_status: z.string().nullish(),
  call_result: z.string().nullish(),
  disconnection_reason: z.string().nullish(),
  finished_at: z.string().nullish(),
  start_at: z.string().nullish(),
  duration: z.number().nullish(),
  call_analysis: z
    .object({
      summary: z.string().nullish(),
      sentiment: z.string().nullish(),
    })
    .nullish(),
  type: z.string().nullish(),
  agent_id: z.string().nullish(),
  chat_history: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    )
    .nullish(),
  transcript_format: z.string().nullish(),
  organization_id: z.string().nullish(),
});

export type Call = z.infer<typeof callSchema>;
