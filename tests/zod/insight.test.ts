import { describe, it, expect } from "bun:test";
import { insightSchema } from "@/db/zod/insight";

describe("insightSchema", () => {
  it("should validate a valid insight with summary and actions", () => {
    const result = insightSchema.safeParse({
      summary: "Cliente con alto potencial de crecimiento",
      actions: ["Programar llamada de seguimiento", "Enviar propuesta comercial"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject insight missing actions field", () => {
    const result = insightSchema.safeParse({
      summary: "Cliente sin acciones definidas",
    });
    expect(result.success).toBe(false);
  });

  it("should reject insight with extra unknown fields (strict mode)", () => {
    const result = insightSchema.safeParse({
      summary: "Cliente con datos extra",
      actions: ["Llamar"],
      extra_field: "should not be here",
    });
    expect(result.success).toBe(false);
  });
});
