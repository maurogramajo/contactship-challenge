import { getAiClient } from "./client";
import type { Insight } from "@/db/zod/insight";
import { actionableOutputSchema } from "@/db/zod/actionable-output";
import type { ActionableOutput } from "@/db/zod/actionable-output";
import { hydrateAiActions } from "@/lib/actionables";

export interface ContactInfo {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  source?: string | null;
  description?: string | null;
}

export interface CallsStats {
  items: Array<{
    direction?: string | null;
    from?: string | null;
    call_status?: string | null;
    call_result?: string | null;
    disconnection_reason?: string | null;
    start_at?: string | null;
    finished_at?: string | null;
    duration?: number | null;
    analysis_summary?: string | null;
    analysis_sentiment?: string | null;
    chat_history?: Array<{ role: string; content: string }>;
  }>;
}

export interface CommentsStats {
  items: Array<{
    updated_at?: string | null;
    created_at?: string | null;
    content: string;
    user_name?: string | null;
  }>;
}

export interface HubSpotActivityContext {
  notes: Array<{
    body: string;
    createdAt?: string | null;
  }>;
  tasks: Array<{
    title: string;
    body?: string | null;
    dueAt?: string | null;
    status?: string | null;
    priority?: string | null;
  }>;
  meetings: Array<{
    title: string;
    body?: string | null;
    internalNotes?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    outcome?: string | null;
  }>;
  error?: string | null;
}

export interface InsightContext {
  contact: ContactInfo;
  calls: CallsStats;
  comments: CommentsStats;
  hubspot: HubSpotActivityContext;
  organizationObjective?: string;
  organizationInstructions?: string;
  previousActionables?: string[];
}

const SYSTEM_PROMPT = `Eres un asistente de inteligencia comercial que genera recomendaciones accionables alineadas con el objetivo de negocio de la organización.

Tu función NO es actuar como vendedor, operador o ejecutivo comercial.

Tu función es generar acciones CRM estructuradas que posteriormente podrán ser ejecutadas directamente en HubSpot desde la plataforma.

Recibes:

* Objetivo organizacional.
* Instrucciones adicionales.
* Datos del contacto.
* Historial de actividad.
* Recomendaciones previas.

## Formato de respuesta

Responde ÚNICAMENTE con un objeto JSON válido.
Responde el JSON en una sola línea para minimizar truncamientos.

No utilices markdown.
No agregues explicaciones.
No agregues texto adicional.

El JSON debe tener exactamente los siguientes campos:

{
"summary": string,
"recommended_channel": "whatsapp" | "call" | "email" | "instagram",
"actions": [
{
"type": "create_note" | "create_task" | "create_meeting",
"title": string,
"description": string,
"priority": "LOW" | "MEDIUM" | "HIGH",
"suggestedExecutionAt": string
}
],
"reasoning": string
}

## Objetivo de cada campo

### summary

Resumen ejecutivo del estado actual del contacto.

Debe describir:

* Perfil.
* Nivel de actividad.
* Nivel de interés.
* Situación actual.

Máximo 3 frases.

---

### recommended_channel

Canal recomendado para la próxima interacción.

Debe ser uno de:

* whatsapp
* call
* email
* instagram

---

### actions

Lista de acciones recomendadas.

Debe contener al menos una acción.

Las acciones serán almacenadas y posteriormente ejecutadas desde la plataforma.
Los campos title, description, priority y suggestedExecutionAt se enviarán a HubSpot tal como los generes.

Por lo tanto:

NO debes describir cómo ejecutar la acción.

NO debes escribir instrucciones paso a paso.

NO debes escribir mensajes completos.

NO debes redactar emails.

NO debes generar contenido listo para enviar.

NO debes usar placeholders, variables o texto genérico.

Debes describir únicamente la intención operativa.

---

### priority

Indica la prioridad recomendada para la acción.

Valores permitidos:

* LOW
* MEDIUM
* HIGH

Guía:

HIGH:

* Lead caliente.
* Interacción reciente.
* Oportunidad activa.
* Riesgo de perder interés.
* Acción urgente.

MEDIUM:

* Seguimiento normal.
* Prospecto con interés moderado.
* Acción recomendada durante los próximos días.

LOW:

* Seguimiento futuro.
* Contactos con baja actividad.
* Registro de contexto o información.

---

### suggestedExecutionAt

Fecha y hora sugerida para ejecutar la acción.

Debe estar en formato ISO 8601.

Ejemplo:

2026-06-01T10:00:00-03:00

La fecha representa el momento óptimo para ejecutar la acción.

No representa una fecha obligatoria.

La plataforma podrá ajustarla posteriormente.

Reglas:

* Nunca programar acciones entre las 22:00 y las 08:00.
* Priorizar días hábiles.
* Respetar horarios laborales.
* Si existe timezone del contacto utilizarla.
* Si no existe timezone asumir la timezone de la organización.

Reglas según prioridad:

HIGH:

* Dentro de las próximas 48 horas.

MEDIUM:

* Dentro de los próximos 7 días.

LOW:

* Dentro de los próximos 30 días.

Reglas según canal:

Llamadas:

* Preferentemente entre 09:00 y 12:00.
* O entre 15:00 y 18:00.

WhatsApp:

* Entre 09:00 y 20:00.

Email:

* Entre 09:00 y 17:00.

Meetings:

* Entre 10:00 y 17:00.

Para create_note utilizar la fecha y hora actual.

Usa siempre una fecha y hora concreta, realista y consistente con el contexto temporal entregado.

---

### reasoning

Explica brevemente por qué se recomienda la acción.

Conecta:

* Objetivo organizacional.
* Datos del contacto.
* Actividad registrada.

Máximo 2 frases.

## Reglas generales

1. Responde únicamente con JSON válido.
2. Debe existir al menos una acción.
3. Todo el contenido debe estar en español.
4. Utiliza tono profesional.
5. No inventes datos que no estén presentes.
6. No incluyas nombres completos, emails ni teléfonos dentro de las acciones.
7. No repitas información que ya existe en el contacto.
8. Las acciones deben ser específicas y ejecutables.
9. Las acciones deben parecer registros reales de CRM.
10. El título debe ser corto y descriptivo.
11. La descripción debe ser breve y concreta.
12. Evita acciones genéricas como "hacer seguimiento".
13. Prioriza acciones que generen avance comercial o mayor conocimiento del contacto.
14. No generes más de 3 acciones por respuesta.
15. Prioriza calidad sobre cantidad.
16. Las acciones deben estar ordenadas por relevancia.
17. Las acciones deben ser coherentes con la prioridad asignada.
18. La fecha suggestedExecutionAt debe ser consistente con la prioridad asignada.
19. Las acciones deben ser independientes entre sí.
20. No generes acciones redundantes.
21. Si recomiendas create_meeting, la fecha sugerida debe representar el inicio propuesto de la reunión.
22. Si recomiendas create_task, la fecha sugerida debe representar el momento exacto de seguimiento.
23. Si recomiendas create_note, la fecha sugerida debe ser inmediata.

## Tipos de acciones

### create_note

Utilizar cuando sea necesario registrar información relevante sobre el contacto.

Casos de uso:

* Registrar interés.
* Registrar contexto.
* Registrar hallazgos.
* Registrar restricciones.
* Registrar preferencias.
* Registrar observaciones comerciales.

Buenos ejemplos:

{
"type": "create_note",
"title": "Interés en demo",
"description": "Mostró interés en conocer el producto.",
"priority": "MEDIUM",
"suggestedExecutionAt": "2026-05-31T15:00:00-03:00"
}

{
"type": "create_note",
"title": "Restricción presupuestaria",
"description": "Mencionó limitaciones de presupuesto.",
"priority": "LOW",
"suggestedExecutionAt": "2026-05-31T15:00:00-03:00"
}

Malos ejemplos:

{
"type": "create_note",
"title": "Llamar al cliente",
"description": "Realizar llamada mañana."
}

---

### create_task

Utilizar para una única acción de seguimiento.

La tarea debe representar una actividad concreta.

Buenos ejemplos:

{
"type": "create_task",
"title": "Primer contacto comercial",
"description": "Contactar al prospecto por email.",
"priority": "HIGH",
"suggestedExecutionAt": "2026-06-01T10:00:00-03:00"
}

{
"type": "create_task",
"title": "Seguimiento comercial",
"description": "Contactar al prospecto por WhatsApp.",
"priority": "HIGH",
"suggestedExecutionAt": "2026-06-01T15:00:00-03:00"
}

{
"type": "create_task",
"title": "Confirmar propuesta",
"description": "Solicitar confirmación sobre la propuesta enviada.",
"priority": "MEDIUM",
"suggestedExecutionAt": "2026-06-03T11:00:00-03:00"
}

Malos ejemplos:

{
"type": "create_task",
"title": "Enviar correo",
"description": "Redactar y enviar un correo personalizado explicando toda la propuesta comercial."
}

{
"type": "create_task",
"title": "Seguimiento",
"description": "Llamar, enviar email y coordinar una reunión."
}

---

### create_meeting

Utilizar únicamente cuando exista una razón clara para coordinar una conversación sincrónica.

No utilizar reuniones para:

* Primer contacto.
* Seguimiento simple.
* Solicitar información básica.

Utilizar reuniones para:

* Demo comercial.
* Discovery call.
* Reunión técnica.
* Presentación de propuesta.
* Negociación.
* Resolución de dudas complejas.

Buenos ejemplos:

{
"type": "create_meeting",
"title": "Demo comercial",
"description": "Presentar la solución al prospecto.",
"priority": "HIGH",
"suggestedExecutionAt": "2026-06-02T10:00:00-03:00"
}

{
"type": "create_meeting",
"title": "Reunión técnica",
"description": "Resolver dudas técnicas sobre la implementación.",
"priority": "MEDIUM",
"suggestedExecutionAt": "2026-06-04T15:00:00-03:00"
}

{
"type": "create_meeting",
"title": "Discovery call",
"description": "Profundizar necesidades y objetivos del cliente.",
"priority": "MEDIUM",
"suggestedExecutionAt": "2026-06-05T11:00:00-03:00"
}

Malos ejemplos:

{
"type": "create_meeting",
"title": "Primer contacto",
"description": "Intentar contactar al prospecto."
}

## Selección de acciones

Si el objetivo es registrar información:
→ create_note

Si el objetivo es realizar una acción de seguimiento:
→ create_task

Si el objetivo es coordinar una conversación futura:
→ create_meeting

Prioriza siempre la acción más específica y de mayor valor para el contexto disponible.

La inteligencia artificial debe comportarse como un analista comercial experimentado que recomienda acciones concretas, oportunas y realistas para maximizar la probabilidad de avance de cada contacto.`;


const TIMEOUT_MS = 30000;
const MAX_TOKENS = 2500;
const MAX_RETRY_TOKENS = 3500;

function normalizeJsonCandidate(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .replace(/^\uFEFF/, "")
    .trim();
}

function extractJsonObject(raw: string): string {
  const start = raw.indexOf("{");
  if (start < 0) {
    return raw;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < raw.length; i += 1) {
    const char = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(start, i + 1);
      }
    }
  }

  return raw.slice(start);
}

function repairJsonLikeContent(raw: string): string {
  return raw
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    .replace(/,\s*([}\]])/g, "$1");
}

function repairJsonStrings(raw: string): string {
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];

    if (!inString) {
      if (char === '"') {
        inString = true;
      }
      result += char;
      continue;
    }

    if (escaped) {
      result += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      result += char;
      escaped = true;
      continue;
    }

    if (char === "\n") {
      result += "\\n";
      continue;
    }

    if (char === "\r") {
      if (raw[i + 1] === "\n") {
        i += 1;
      }
      result += "\\n";
      continue;
    }

    if (char === "\t") {
      result += "\\t";
      continue;
    }

    if (char === '"') {
      let nextIndex = i + 1;
      while (nextIndex < raw.length && /\s/.test(raw[nextIndex])) {
        nextIndex += 1;
      }

      const nextSignificant = raw[nextIndex];
      const looksLikeStringClosure =
        nextSignificant === "," ||
        nextSignificant === "}" ||
        nextSignificant === "]" ||
        nextSignificant === ":" ||
        nextSignificant === undefined;

      if (looksLikeStringClosure) {
        inString = false;
        result += char;
      } else {
        result += '\\"';
      }
      continue;
    }

    result += char;
  }

  if (inString && !result.endsWith('"')) {
    result += '"';
  }

  return result;
}

function closeIncompleteJson(raw: string): string {
  let result = raw.trimEnd();
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < result.length; i += 1) {
    const char = result[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      stack.push("}");
      continue;
    }

    if (char === "[") {
      stack.push("]");
      continue;
    }

    if ((char === "}" || char === "]") && stack.at(-1) === char) {
      stack.pop();
    }
  }

  if (inString) {
    result += '"';
  }

  while (/[,:]$/.test(result)) {
    result = result.slice(0, -1).trimEnd();
  }

  return result + stack.reverse().join("");
}

export function parseAiJsonResponse(raw: string): unknown {
  const normalized = normalizeJsonCandidate(raw);
  const extracted = extractJsonObject(normalized);
  const repaired = repairJsonLikeContent(extracted);
  const repairedStrings = repairJsonStrings(repaired);
  const closedJson = closeIncompleteJson(repairedStrings);
  const candidates = [
    normalized,
    extracted,
    repaired,
    repairedStrings,
    closedJson,
  ];

  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  console.error("[ai/insights] Unable to parse AI JSON response", {
    raw: raw.slice(0, 1200),
    candidates: candidates.slice(-2),
  });

  throw lastError instanceof Error ? lastError : new Error("Invalid JSON");
}

function extractCompletionText(message: { content?: unknown } | undefined): string {
  const content = message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          part &&
          typeof part === "object" &&
          "type" in part &&
          part.type === "text" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

function isLikelyTruncatedResponse(raw: string, finishReason: string | null | undefined): boolean {
  if (finishReason === "length") {
    return true;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  return !(trimmed.endsWith("}") || trimmed.endsWith("]"));
}

async function requestInsightCompletion(
  userMessage: string,
  maxTokens: number,
  retryHint?: string,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    return await getAiClient().chat.completions.create(
      {
        model: process.env.AI_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
          ...(retryHint
            ? [{ role: "user" as const, content: retryHint }]
            : []),
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: maxTokens,
      },
      { signal: controller.signal },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function buildContextPrompt(ctx: InsightContext): string {
  const { contact, calls, comments, hubspot } = ctx;
  const now = new Date();

  const lines: string[] = [];

  lines.push("## Contexto temporal");
  lines.push(`Fecha y hora actual del sistema: ${now.toISOString()}`);
  lines.push("Si falta otra referencia horaria, usa un offset explicito en ISO 8601.");
  lines.push("");

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
  if (calls.items.length === 0) {
    lines.push("Sin llamadas registradas en ContactShip.");
  } else {
    for (const [index, call] of calls.items.entries()) {
      lines.push(`### Llamada ${index + 1}`);
      if (call.direction) lines.push(`Dirección: ${call.direction}`);
      if (call.from) lines.push(`Origen telefónico: ${call.from}`);
      if (call.call_status) lines.push(`Estado técnico: ${call.call_status}`);
      if (call.call_result) lines.push(`Resultado: ${call.call_result}`);
      if (call.disconnection_reason) {
        lines.push(`Motivo de desconexión: ${call.disconnection_reason}`);
      }
      if (call.start_at) lines.push(`Inicio: ${call.start_at}`);
      if (call.finished_at) lines.push(`Fin: ${call.finished_at}`);
      if (call.duration != null) lines.push(`Duración segundos: ${call.duration}`);
      if (call.analysis_summary) lines.push(`Resumen: ${call.analysis_summary}`);
      if (call.analysis_sentiment) lines.push(`Sentimiento: ${call.analysis_sentiment}`);
      if (call.chat_history && call.chat_history.length > 0) {
        lines.push("Conversación:");
        for (const message of call.chat_history.slice(0, 8)) {
          lines.push(`- ${message.role}: ${message.content}`);
        }
      }
    }
  }

  lines.push("");
  lines.push("## Comentarios");
  if (comments.items.length === 0) {
    lines.push("Sin comentarios registrados en ContactShip.");
  } else {
    for (const [index, comment] of comments.items.entries()) {
      lines.push(`### Comentario ${index + 1}`);
      if (comment.updated_at) lines.push(`Actualizado: ${comment.updated_at}`);
      if (comment.created_at) lines.push(`Creado: ${comment.created_at}`);
      if (comment.user_name) lines.push(`Usuario: ${comment.user_name}`);
      lines.push(`Contenido: ${comment.content}`);
    }
  }

  lines.push("");
  lines.push("## Actividad de HubSpot");
  if (hubspot.error) {
    lines.push(`Error al consultar HubSpot: ${hubspot.error}`);
  }

  lines.push("### Notas");
  if (hubspot.notes.length === 0) {
    lines.push("Sin notas asociadas.");
  } else {
    for (const [index, note] of hubspot.notes.entries()) {
      lines.push(`Nota ${index + 1}${note.createdAt ? ` (${note.createdAt})` : ""}: ${note.body}`);
    }
  }

  lines.push("### Tareas");
  if (hubspot.tasks.length === 0) {
    lines.push("Sin tareas asociadas.");
  } else {
    for (const [index, task] of hubspot.tasks.entries()) {
      lines.push(`Tarea ${index + 1}: ${task.title}`);
      if (task.body) lines.push(`Detalle: ${task.body}`);
      if (task.dueAt) lines.push(`Fecha: ${task.dueAt}`);
      if (task.status) lines.push(`Estado: ${task.status}`);
      if (task.priority) lines.push(`Prioridad: ${task.priority}`);
    }
  }

  lines.push("### Meetings");
  if (hubspot.meetings.length === 0) {
    lines.push("Sin meetings asociados.");
  } else {
    for (const [index, meeting] of hubspot.meetings.entries()) {
      lines.push(`Meeting ${index + 1}: ${meeting.title}`);
      if (meeting.body) lines.push(`Detalle: ${meeting.body}`);
      if (meeting.internalNotes) lines.push(`Notas internas: ${meeting.internalNotes}`);
      if (meeting.startAt) lines.push(`Inicio: ${meeting.startAt}`);
      if (meeting.endAt) lines.push(`Fin: ${meeting.endAt}`);
      if (meeting.outcome) lines.push(`Resultado: ${meeting.outcome}`);
    }
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
    const userMessage = buildContextPrompt(context);
    const attempts = [
      { maxTokens: MAX_TOKENS, retryHint: undefined },
      {
        maxTokens: MAX_RETRY_TOKENS,
        retryHint:
          "La respuesta anterior puede haber quedado vacía o truncada. Regenera desde cero el objeto JSON completo, compacto y válido, sin markdown y sin texto adicional.",
      },
    ] as const;

    let output: ActionableOutput | null = null;
    let lastError: unknown = null;

    for (const [attemptIndex, attempt] of attempts.entries()) {
      const completion = await requestInsightCompletion(
        userMessage,
        attempt.maxTokens,
        attempt.retryHint,
      );
      const choice = completion.choices[0];
      const raw = extractCompletionText(choice?.message);
      const finishReason = choice?.finish_reason;

      console.log("[ai/insights] LLM response metadata:", {
        attempt: attemptIndex + 1,
        finishReason,
        hasContent: raw.length > 0,
        contentLength: raw.length,
      });

      if (!raw) {
        lastError = new Error("Empty LLM response");
        console.warn("[ai/insights] Empty LLM response", {
          attempt: attemptIndex + 1,
          finishReason,
        });
        continue;
      }

      try {
        const parsed = parseAiJsonResponse(raw);
        output = actionableOutputSchema.parse(parsed);
        break;
      } catch (error) {
        lastError = error;
        console.warn("[ai/insights] Invalid AI JSON response", {
          attempt: attemptIndex + 1,
          finishReason,
          truncated: isLikelyTruncatedResponse(raw, finishReason),
          error: error instanceof Error ? error.message : String(error),
        });

        if (!isLikelyTruncatedResponse(raw, finishReason) && attemptIndex === attempts.length - 1) {
          throw error;
        }
      }
    }

    if (!output) {
      throw (lastError instanceof Error ? lastError : new Error("AI unavailable"));
    }

    const insight: Insight = {
      summary: output.summary,
      actions: hydrateAiActions(output.actions),
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
