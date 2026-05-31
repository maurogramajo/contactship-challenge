import { z } from "zod";

export const tagSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color (e.g. #FF0000)")
    .nullish(),
  label: z.string().nullish(),
});

export type Tag = z.infer<typeof tagSchema>;
