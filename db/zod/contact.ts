import { z } from "zod";

export const additionalDataItemSchema = z.object({
  type: z.string(),
  field: z.string(),
  value: z.string(),
});

export const contactSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().min(1),
  phone_number: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, "Invalid international phone number"),
  country: z.string().nullish(),
  email: z.email().nullish(),
  description: z.string().nullish(),
  external_id: z.string().nullish(),
  source: z.enum(["hubspot"]).nullish(),
  additional_data: z.array(additionalDataItemSchema).optional(),
  organization_id: z.string().nullish(),
  created_at: z.string().nullish(),
});

export type AdditionalDataItem = z.infer<typeof additionalDataItemSchema>;
export type Contact = z.infer<typeof contactSchema>;
