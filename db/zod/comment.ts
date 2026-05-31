import { z } from "zod";

export const commentSchema = z.object({
  id: z.uuid(),
  content: z.string().min(1),
  contact_id: z.uuid(),
  created_at: z.string().nullish(),
  updated_at: z.string().nullish(),
  user_id: z.uuid().nullish(),
  user_name: z.string().nullish(),
  organization_id: z.string().nullish(),
});

export type Comment = z.infer<typeof commentSchema>;
