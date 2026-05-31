import { z } from "zod";

export const callSchema = z.object({
  id: z.uuid(),
  contact_id: z.uuid(),
  created_at: z.string().nullish(),
  call_time: z.string().nullish(),
  duration: z.number().nullish(),
  direction: z.enum(["inbound", "outbound"]).nullish(),
  status: z
    .enum(["answered", "missed", "rejected", "busy", "failed"])
    .nullish(),
  notes: z.string().nullish(),
  recording_url: z.url().nullish(),
  user_id: z.uuid().nullish(),
  organization_id: z.string().nullish(),
});

export type Call = z.infer<typeof callSchema>;
