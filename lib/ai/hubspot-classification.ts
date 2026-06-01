import { z } from "zod";
import type { NewContact } from "@/db/schema";
import { getAiClient } from "./client";

export const HUBSPOT_LIFECYCLE_STAGE_VALUES = [
  "subscriber",
  "lead",
  "marketingqualifiedlead",
  "evangelist",
  "salesqualifiedlead",
  "opportunity",
  "customer",
] as const;

export const HUBSPOT_LEAD_STATUS_VALUES = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "OPEN_DEAL",
  "UNQUALIFIED",
  "ATTEMPTED_TO_CONTACT",
  "CONNECTED",
  "BAD_TIMING",
] as const;

export const hubSpotLeadClassificationSchema = z.object({
  lifecycleStage: z.enum(HUBSPOT_LIFECYCLE_STAGE_VALUES),
  leadStatus: z.enum(HUBSPOT_LEAD_STATUS_VALUES),
});

export type HubSpotLifecycleStage =
  (typeof HUBSPOT_LIFECYCLE_STAGE_VALUES)[number];
export type HubSpotLeadStatus = (typeof HUBSPOT_LEAD_STATUS_VALUES)[number];
export type HubSpotLeadClassification = z.infer<
  typeof hubSpotLeadClassificationSchema
>;

type AdditionalData = NewContact["additional_data"];

export interface HubSpotClassificationInput {
  description?: string | null;
  additional_data?: AdditionalData;
}

const SYSTEM_PROMPT = `Eres un asistente de operaciones comerciales para ContactShip.

Tu tarea es clasificar un contacto nuevo de HubSpot usando exactamente dos propiedades:
- lifecycleStage
- leadStatus

## lifecycleStage permitido
- subscriber
- lead
- marketingqualifiedlead
- evangelist
- salesqualifiedlead
- opportunity
- customer

## leadStatus permitido
- NEW
- OPEN
- IN_PROGRESS
- OPEN_DEAL
- UNQUALIFIED
- ATTEMPTED_TO_CONTACT
- CONNECTED
- BAD_TIMING

## Criterios
1. Usa solo la descripcion y los datos adicionales.
2. Si el contacto ya parece cliente activo, usa customer.
3. Si hay señales de negociacion, presupuesto, propuesta o cierre cercano, usa opportunity u OPEN_DEAL.
4. Si hay señales de calificacion comercial fuerte, usa salesqualifiedlead.
5. Si hay interes validado por marketing pero no oportunidad clara, usa marketingqualifiedlead.
6. Si solo hay interes inicial o poco contexto, usa lead.
7. Si el caso parece descalificado, usa UNQUALIFIED.
8. Si el problema es timing, usa BAD_TIMING.
9. Si no hay suficiente informacion, responde lead + NEW.

Responde UNICAMENTE con JSON valido con esta forma exacta:
{"lifecycleStage":"lead","leadStatus":"NEW"}`;

const TIMEOUT_MS = 12000;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesOneOf(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildClassificationPrompt(input: HubSpotClassificationInput): string {
  const lines: string[] = [];

  lines.push("## Descripcion");
  lines.push(input.description?.trim() || "Sin descripcion");
  lines.push("");
  lines.push("## Datos adicionales");

  if (!input.additional_data || input.additional_data.length === 0) {
    lines.push("Sin datos adicionales");
    return lines.join("\n");
  }

  for (const item of input.additional_data) {
    lines.push(`- tipo: ${item.type} | campo: ${item.field} | valor: ${item.value}`);
  }

  return lines.join("\n");
}

export function inferHubSpotLeadClassificationFallback(
  input: HubSpotClassificationInput,
): HubSpotLeadClassification {
  const description = input.description?.trim() ?? "";
  const additionalDataText = (input.additional_data ?? [])
    .map((item) => `${item.type} ${item.field} ${item.value}`)
    .join(" ");
  const text = normalizeText(`${description} ${additionalDataText}`.trim());

  if (!text) {
    return { lifecycleStage: "lead", leadStatus: "NEW" };
  }

  if (
    includesOneOf(text, [
      "cliente actual",
      "customer",
      "cuenta activa",
      "renovacion",
      "soporte",
      "onboarding",
      "facturacion",
      "postventa",
    ])
  ) {
    return { lifecycleStage: "customer", leadStatus: "CONNECTED" };
  }

  if (
    includesOneOf(text, [
      "sin presupuesto ahora",
      "mas adelante",
      "proximo trimestre",
      "proximo mes",
      "despues",
      "bad timing",
      "timing",
    ])
  ) {
    return { lifecycleStage: "lead", leadStatus: "BAD_TIMING" };
  }

  if (
    includesOneOf(text, [
      "spam",
      "estudiante",
      "competencia",
      "no encaja",
      "sin fit",
      "descalificado",
      "unqualified",
      "no interesado",
    ])
  ) {
    return { lifecycleStage: "lead", leadStatus: "UNQUALIFIED" };
  }

  if (
    includesOneOf(text, [
      "propuesta",
      "cotizacion",
      "presupuesto aprobado",
      "negociacion",
      "open deal",
      "deal",
      "contrato",
      "pricing",
      "compra",
      "cierre",
    ])
  ) {
    return { lifecycleStage: "opportunity", leadStatus: "OPEN_DEAL" };
  }

  if (
    includesOneOf(text, [
      "decision maker",
      "decisor",
      "demo agendada",
      "reunion agendada",
      "llamada agendada",
      "sql",
      "sales qualified",
      "calificado por ventas",
      "alto presupuesto",
    ])
  ) {
    return { lifecycleStage: "salesqualifiedlead", leadStatus: "CONNECTED" };
  }

  if (
    includesOneOf(text, [
      "webinar",
      "descargo",
      "descargado",
      "campana",
      "newsletter",
      "ebook",
      "lead magnet",
      "mql",
      "marketing qualified",
    ])
  ) {
    return { lifecycleStage: "marketingqualifiedlead", leadStatus: "OPEN" };
  }

  if (
    includesOneOf(text, [
      "suscriptor",
      "blog",
      "contenido",
      "registro newsletter",
      "seguir novedades",
    ])
  ) {
    return { lifecycleStage: "subscriber", leadStatus: "NEW" };
  }

  if (
    includesOneOf(text, [
      "llamar",
      "contactar",
      "seguimiento",
      "primer contacto",
      "outreach",
      "prospecto",
    ])
  ) {
    return { lifecycleStage: "lead", leadStatus: "ATTEMPTED_TO_CONTACT" };
  }

  return { lifecycleStage: "lead", leadStatus: "NEW" };
}

export async function inferHubSpotLeadClassification(
  input: HubSpotClassificationInput,
): Promise<HubSpotLeadClassification> {
  const fallback = inferHubSpotLeadClassificationFallback(input);
  const hasSignal =
    Boolean(input.description?.trim()) ||
    Boolean(input.additional_data && input.additional_data.length > 0);

  if (!hasSignal) {
    return fallback;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const completion = await getAiClient().chat.completions.create(
      {
        model: process.env.AI_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildClassificationPrompt(input) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 120,
      },
      { signal: controller.signal },
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return hubSpotLeadClassificationSchema.parse(parsed);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.error("[ai/hubspot-classification] Failed to classify contact:", error);
    }
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
