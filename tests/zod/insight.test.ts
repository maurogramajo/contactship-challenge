import { describe, it, expect } from "bun:test";
import { insightSchema } from "@/db/zod/insight";

describe("insightSchema", () => {
  it("should validate a valid insight with summary and actions", () => {
    const result = insightSchema.safeParse({
      summary: "Cliente con alto potencial de crecimiento",
      actions: [
        {
          id: "action-1",
          type: "create_task",
          title: "Programar llamada de seguimiento",
          description: "Coordinar una llamada de seguimiento para esta semana.",
          priority: "HIGH",
          suggestedExecutionAt: "2026-06-02T10:00:00-03:00",
          status: "available",
        },
        {
          id: "action-2",
          type: "create_note",
          title: "Enviar propuesta comercial",
          description: "Preparar y enviar una propuesta comercial adaptada al cliente.",
          priority: "MEDIUM",
          suggestedExecutionAt: "2026-06-03T15:30:00-03:00",
          status: "pending",
        },
      ],
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
      actions: [
        {
          id: "action-1",
          type: "create_task",
          title: "Llamar",
          description: "Contactar al cliente por telefono.",
          priority: "LOW",
          suggestedExecutionAt: "2026-06-02T09:00:00-03:00",
          status: "available",
        },
      ],
      extra_field: "should not be here",
    });
    expect(result.success).toBe(false);
  });
});
