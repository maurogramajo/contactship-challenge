import { describe, it, expect } from "bun:test";
import { contactSchema, createContactInputSchema } from "@/db/zod/contact";

describe("contactSchema", () => {
  it("should validate a fully populated contact", () => {
    const result = contactSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      full_name: "María García",
      phone_number: "+5491123456789",
      country: "Argentina",
      email: "maria@example.com",
      description: "Cliente VIP",
      external_id: "hubspot-123",
      source: "hubspot",
      additional_data: [{ type: "custom", field: "empresa", value: "Acme" }],
      organization_id: "550e8400-e29b-41d4-a716-446655440001",
      created_at: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("should validate a minimal contact with only required fields", () => {
    const result = contactSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440002",
      full_name: "Carlos López",
      phone_number: "+51987654321",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
      expect(result.data.country).toBeUndefined();
    }
  });

  it("should reject a contact with invalid phone number (no + prefix)", () => {
    const result = contactSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440003",
      full_name: "Invalid Phone",
      phone_number: "5491123456789",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a contact with empty full_name", () => {
    const result = contactSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440004",
      full_name: "",
      phone_number: "+5491123456789",
    });
    expect(result.success).toBe(false);
  });

  it("should reject a contact with invalid email format", () => {
    const result = contactSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440005",
      full_name: "Bad Email",
      phone_number: "+5491123456789",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("createContactInputSchema", () => {
  it("should require a valid international phone number", () => {
    const result = createContactInputSchema.safeParse({
      full_name: "Lucia Perez",
      phone_number: "1123456789",
    });

    expect(result.success).toBe(false);
  });

  it("should normalize empty optional fields", () => {
    const result = createContactInputSchema.safeParse({
      full_name: "Lucia Perez",
      phone_number: "+5491123456789",
      email: "   ",
      country: "",
      description: "  ",
      additional_data: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
      expect(result.data.country).toBeUndefined();
      expect(result.data.description).toBeUndefined();
      expect(result.data.additional_data).toEqual([]);
    }
  });

  it("should validate additional_data items", () => {
    const result = createContactInputSchema.safeParse({
      full_name: "Lucia Perez",
      phone_number: "+5491123456789",
      additional_data: [{ type: "text", field: "", value: "VIP" }],
    });

    expect(result.success).toBe(false);
  });
});
