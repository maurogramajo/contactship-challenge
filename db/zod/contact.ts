import { z } from "zod";

export const internationalPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{1,14}$/, "Invalid international phone number");

const emailStringSchema = z.string().email();

function optionalTrimmedString() {
  return z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined));
}

export const additionalDataItemSchema = z.object({
  type: z.string().trim().min(1, "Selecciona un tipo"),
  field: z.string().trim().min(1, "El campo es obligatorio"),
  value: z.string().trim().min(1, "El valor es obligatorio"),
});

export const createContactInputSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio"),
  phone_number: internationalPhoneSchema,
  country: optionalTrimmedString(),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || emailStringSchema.safeParse(value).success,
      "Ingresa un email valido",
    )
    .transform((value) => (value.length > 0 ? value : undefined)),
  description: optionalTrimmedString(),
  additional_data: z.array(additionalDataItemSchema).optional(),
});

export const contactSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().min(1),
  phone_number: internationalPhoneSchema,
  country: z.string().nullish(),
  email: z.email().nullish(),
  description: z.string().nullish(),
  external_id: z.string().nullish(),
  source: z.enum(["hubspot"]).nullish(),
  additional_data: z.array(additionalDataItemSchema).optional(),
  organization_id: z.string().nullish(),
  created_at: z.string().nullish(),
  external_lifecycle_stage: z.string().nullish(),
  external_lead_status: z.string().nullish(),
});

export type AdditionalDataItem = z.infer<typeof additionalDataItemSchema>;
export type CreateContactInput = z.output<typeof createContactInputSchema>;
export type CreateContactFormValues = z.input<typeof createContactInputSchema>;
export type Contact = z.infer<typeof contactSchema>;
