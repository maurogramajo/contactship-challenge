import { aiClient } from "./client";
import type { Insight } from "@/db/zod/insight";
import { actionableOutputSchema } from "@/db/zod/actionable-output";
import type { ActionableOutput } from "@/db/zod/actionable-output";

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
  organizationObjective?: string;
  organizationInstructions?: string;
  previousActionables?: string[];
}

const SYSTEM_PROMPT = `Eres un asistente de inteligencia comercial que genera recomendaciones accionables alineadas con el objetivo de negocio de la organización.

Recibes: el objetivo organizacional, instrucciones adicionales (si existen), datos del contacto, historial de actividad y recomendaciones previas.

## Formato de respuesta
Responde ÚNICAMENTE con un objeto JSON válido. Sin explicaciones, sin markdown, sin texto adicional.

El JSON debe tener exactamente estos campos:
- summary: string — resumen del estado del contacto en español. Describe el perfil, nivel de actividad y estado general.
- recommended_channel: string — el canal más adecuado según el objetivo y las instrucciones adicionales. Debe ser uno de: "whatsapp", "call", "email", "instagram".
- recommended_action: string — acción concreta a ejecutar, alineada con el objetivo de negocio.
- draft_message: string (opcional) — borrador del mensaje a enviar, en español profesional, listo para copiar y pegar.
- reasoning: string (opcional) — explicación de por qué se recomienda esta acción, conectando el objetivo de negocio con los datos del contacto.

## Reglas
1. Solo responde con JSON. Nada más.
2. El canal debe alinearse con las instrucciones adicionales si existen.
3. Las acciones deben ser específicas según el objetivo de negocio.
4. draft_message debe ser un mensaje listo para enviar.
5. reasoning debe explicar la conexión entre el objetivo y la acción.
6. Todo en español, tono profesional.`;

const TIMEOUT_MS = 15000;

function buildContextPrompt(ctx: InsightContext): string {
  const { contact, calls, comments, tags } = ctx;

  const lines: string[] = [];

  if (ctx.organizationObjective) {
    lines.push("## Objetivo organizacional");
    lines.push(ctx.organizationObjective);
    lines.push("");
  }

  if (ctx.organizationInstructions) {
    lines.push("## Instrucciones adicionales");
    lines.push(ctx.organizationInstructions);
    lines.push("");
  }

  lines.push("## Datos del contacto");

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

  if (ctx.previousActionables && ctx.previousActionables.length > 0) {
    lines.push("");
    lines.push("## Recomendaciones anteriores");
    for (const summary of ctx.previousActionables) {
      lines.push(`- ${summary}`);
    }
  }

  return lines.join("\n");
}

export async function generateContactInsight(
  context: InsightContext
): Promise<{ insight: Insight; prompt: string; output: ActionableOutput } | { error: string }> {
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
    const output = actionableOutputSchema.parse(parsed);
    const insight: Insight = {
      summary: output.summary,
      actions: [output.recommended_action],
    };

    return {
      insight,
      prompt: userMessage,
      output,
    };
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
