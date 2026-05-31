import { z } from "zod";

export const searchFiltersSchema = z.object({
  name_contains: z.string().optional(),
  email_contains: z.string().optional(),
  source: z.string().optional(),
  has_activity_since: z.string().optional(),
  has_tag: z.string().optional(),
  activity_type: z.enum(["call", "comment", "none"]).optional(),
  min_calls: z.number().optional(),
  max_days_inactive: z.number().optional(),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;
