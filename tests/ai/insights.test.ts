import { describe, expect, it } from "bun:test";
import { parseAiJsonResponse } from "@/lib/ai/insights";

describe("parseAiJsonResponse", () => {
  it("parses valid JSON wrapped in markdown fences", () => {
    expect(
      parseAiJsonResponse(`\`\`\`json
{"summary":"ok","recommended_channel":"call","actions":[{"type":"create_task","title":"Llamada","description":"Contactar al prospecto.","priority":"HIGH","suggestedExecutionAt":"2026-06-01T10:00:00-03:00"}],"reasoning":"Lead activo."}
\`\`\``),
    ).toEqual({
      summary: "ok",
      recommended_channel: "call",
      actions: [
        {
          type: "create_task",
          title: "Llamada",
          description: "Contactar al prospecto.",
          priority: "HIGH",
          suggestedExecutionAt: "2026-06-01T10:00:00-03:00",
        },
      ],
      reasoning: "Lead activo.",
    });
  });

  it("repairs a response truncated at the reasoning tail", () => {
    expect(
      parseAiJsonResponse(`{
"summary":"Lead con alta intención.",
"recommended_channel":"call",
"actions":[
  {
    "type":"create_task",
    "title":"Llamada inicial",
    "description":"Contactar al prospecto hoy.",
    "priority":"HIGH",
    "suggestedExecutionAt":"2026-06-01T10:00:00-03:00"
  }
],
"reasoning":"Contacto con señal clara de recompra y sin seguimiento prev`),
    ).toEqual({
      summary: "Lead con alta intención.",
      recommended_channel: "call",
      actions: [
        {
          type: "create_task",
          title: "Llamada inicial",
          description: "Contactar al prospecto hoy.",
          priority: "HIGH",
          suggestedExecutionAt: "2026-06-01T10:00:00-03:00",
        },
      ],
      reasoning: "Contacto con señal clara de recompra y sin seguimiento prev",
    });
  });
});
