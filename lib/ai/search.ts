import { aiClient } from "./client";
import { searchFiltersSchema } from "@/db/zod/search-filters";
import type { SearchFilters } from "@/db/zod/search-filters";

const SYSTEM_PROMPT = `Eres un asistente que convierte consultas en lenguaje natural a filtros de búsqueda JSON para una base de datos de contactos.

## Campos disponibles (todos opcionales):
- name_contains: string — parte del nombre del contacto
- email_contains: string — parte del email
- source: string — origen del contacto (ej: "hubspot", "manual")
- has_activity_since: string — fecha ISO desde la cual hay actividad
- has_tag: string — etiqueta que debe tener el contacto
- activity_type: "call" | "comment" | "none" — tipo de actividad reciente
- min_calls: number — mínimo de llamadas registradas
- max_days_inactive: number — máximo de días sin actividad

## Reglas:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin explicaciones, sin markdown.
2. Solo incluye los campos que tengan filtros activos.
3. Si la consulta no menciona ningún filtro reconocible, responde {}.
4. Las fechas relativas ("última semana", "hoy") conviértelas a ISO 8601.

## Ejemplos:

Consulta: "Juan Pérez de México"
Respuesta: {"name_contains": "Juan Pérez"}

Consulta: "contactos con etiqueta vip"
Respuesta: {"has_tag": "vip"}

Consulta: "clientes hubspot con más de 5 llamadas"
Respuesta: {"source": "hubspot", "min_calls": 5}

Consulta: "inactivos hace 30 días"
Respuesta: {"max_days_inactive": 30}

Consulta: "hola, ¿cómo estás?"
Respuesta: {}`;

const TIMEOUT_MS = 15000;

/** Thrown when the AI request times out (AbortError or fetch timeout). */
export class AITimeoutError extends Error {
  constructor() {
    super("AI request timed out");
    this.name = "AITimeoutError";
  }
}

/** Thrown when the LLM returns invalid JSON or an unsupported structure. */
export class AIInvalidResponseError extends Error {
  constructor(message = "Invalid response from AI") {
    super(message);
    this.name = "AIInvalidResponseError";
  }
}

export async function generateSearchFilters(
  query: string
): Promise<Partial<SearchFilters>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const completion = await aiClient.chat.completions.create(
      {
        model: process.env.AI_MODEL || "deepseek-chat",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 500,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new AIInvalidResponseError("LLM returned empty response");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AIInvalidResponseError("LLM returned invalid JSON");
    }

    const result = searchFiltersSchema.safeParse(parsed);
    if (!result.success) {
      throw new AIInvalidResponseError(
        `LLM returned unsupported filter structure: ${result.error.message}`
      );
    }

    return result.data;
  } catch (err) {
    // Re-throw known error types so callers can handle them specifically
    if (err instanceof AITimeoutError || err instanceof AIInvalidResponseError) {
      throw err;
    }

    // Detect abort / fetch timeout signals from the underlying client
    if (err instanceof DOMException && err.name === "AbortError") {
      console.error("[ai/search] AI request timed out");
      throw new AITimeoutError();
    }
    if (err instanceof Error && err.message.includes("timeout")) {
      console.error("[ai/search] AI request timed out");
      throw new AITimeoutError();
    }

    console.error("[ai/search] Failed to generate filters:", err);
    throw err;
  }
}
