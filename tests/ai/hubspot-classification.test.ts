import { describe, expect, it } from "bun:test";
import { inferHubSpotLeadClassificationFallback } from "@/lib/ai/hubspot-classification";

describe("inferHubSpotLeadClassificationFallback", () => {
  it("returns lead + NEW when there is no usable signal", () => {
    expect(
      inferHubSpotLeadClassificationFallback({
        description: "",
        additional_data: [],
      }),
    ).toEqual({
      lifecycleStage: "lead",
      leadStatus: "NEW",
    });
  });

  it("classifies existing customers as customer + CONNECTED", () => {
    expect(
      inferHubSpotLeadClassificationFallback({
        description: "Cliente actual con onboarding completo y consultas de soporte.",
      }),
    ).toEqual({
      lifecycleStage: "customer",
      leadStatus: "CONNECTED",
    });
  });

  it("classifies negotiation contexts as opportunity + OPEN_DEAL", () => {
    expect(
      inferHubSpotLeadClassificationFallback({
        description: "Pidio cotizacion y esta en negociacion de contrato anual.",
      }),
    ).toEqual({
      lifecycleStage: "opportunity",
      leadStatus: "OPEN_DEAL",
    });
  });

  it("classifies bad timing correctly", () => {
    expect(
      inferHubSpotLeadClassificationFallback({
        description: "Interesado, pero sin presupuesto ahora. Revisar el proximo trimestre.",
      }),
    ).toEqual({
      lifecycleStage: "lead",
      leadStatus: "BAD_TIMING",
    });
  });

  it("can use additional_data when description is weak", () => {
    expect(
      inferHubSpotLeadClassificationFallback({
        description: "Contacto inbound.",
        additional_data: [
          { type: "text", field: "origen", value: "registro webinar IA ventas" },
        ],
      }),
    ).toEqual({
      lifecycleStage: "marketingqualifiedlead",
      leadStatus: "OPEN",
    });
  });
});
