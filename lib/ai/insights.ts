import { aiClient } from "./client";
import { insightSchema } from "@/db/zod/insight";
import type { Insight } from "@/db/zod/insight";

export interface ContactInfo {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  source?: string | null;
  description?: string | null;
}

export interface CallsStats {
  total: number;
  lastDate?: string | null;
  inboundCount: number;
  outboundCount: number;
  answeredRate: number;
}

export interface CommentsStats {
  count: number;
  lastDate?: string | null;
  lastContent?: string | null;
}

export interface InsightContext {
  contact: ContactInfo;
  calls: CallsStats;
  comments: CommentsStats;
  tags: string[];
}

const SYSTEM_PROMPT = `Eres un asistente de inteligencia comercial que analiza datos de contactos para un CRM. Tu tarea es generar información útil sobre un contacto basándote en los datos proporcionados.

## Formato de respuesta
Responde ÚNICAMENTE con un objeto JSON válido. Sin explicaciones, sin markdown, sin texto adicional.

El JSON debe tener exactamente estos campos:
- summary: string — resumen del estado del contacto en una o dos frases en español. Describe el perfil, nivel de actividad y estado general.
- actions: string[] — lista de 2 a 4 acciones recomendadas en español. Cada acción debe ser concreta y accionable.

## Reglas
1. Solo responde con JSON. Nada más.
2. El summary debe ser contextual: menciona el país, fuente, nivel de actividad, etiquetas relevantes.
3. Las acciones deben ser específicas según los datos. Si no hay llamadas, sugiere llamar. Si tiene etiqueta "vip", prioriza seguimiento personalizado.
4. Si hay poca información, sugiere recopilar más datos.
5. Todo en español, tono profesional.`;

const TIMEOUT_MS = 15000;

function buildContextPrompt(ctx: InsightContext): string {
  const { contact, calls, comments, tags } = ctx;

  const lines: string[] = ["## Datos del contacto"];

  if (contact.full_name) lines.push(`Nombre: ${contact.full_name}`);
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.phone) lines.push(`Teléfono: ${contact.phone}`);
  if (contact.country) lines.push(`País: ${contact.country}`);
  if (contact.source) lines.push(`Origen: ${contact.source}`);
  if (contact.description) lines.push(`Descripción: ${contact.description}`);

  lines.push("");
  lines.push("## Actividad de llamadas");
  lines.push(`Total llamadas: ${calls.total}`);
  lines.push(`Entrantes: ${calls.inboundCount} | Salientes: ${calls.outboundCount}`);
  lines.push(`Tasa de respuesta: ${Math.round(calls.answeredRate * 100)}%`);
  if (calls.lastDate) lines.push(`Última llamada: ${calls.lastDate}`);

  lines.push("");
  lines.push("## Comentarios");
  lines.push(`Total comentarios: ${comments.count}`);
  if (comments.lastDate) lines.push(`Último comentario: ${comments.lastDate}`);
  if (comments.lastContent) lines.push(`Contenido reciente: "${comments.lastContent}"`);

  if (tags.length > 0) {
    lines.push("");
    lines.push(`## Etiquetas: ${tags.join(", ")}`);
  }

  return lines.join("\n");
}

export async function generateContactInsight(
  context: InsightContext
): Promise<Insight | { error: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const userMessage = buildContextPrompt(context);

    const completion = await aiClient.chat.completions.create(
      {
        model: process.env.AI_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 500,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.warn("[ai/insights] Empty LLM response");
      return { error: "AI unavailable" };
    }

    const parsed = JSON.parse(raw);
    const result = insightSchema.parse(parsed);
    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("[ai/insights] AI request timed out");
      return { error: "AI unavailable" };
    }
    if (err instanceof Error && err.message.includes("timeout")) {
      console.error("[ai/insights] AI request timed out");
      return { error: "AI unavailable" };
    }
    console.error("[ai/insights] Failed to generate insight:", err);
    return { error: "AI unavailable" };
  }
}
