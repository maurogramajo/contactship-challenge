import type { SearchFilters } from "@/db/zod/search-filters";
import { contacts, calls, comments, tags, contactTags } from "@/db/schema";
import { sql, ilike } from "drizzle-orm";

export interface FilterTranslation {
  /** Drizzle SQL conditions to pass to the where clause via `and(...conditions)` */
  conditions: ReturnType<typeof sql>[];
  /** Human-readable interpretation in Spanish */
  interpretation: string;
}

/**
 * Translates natural-language search filters into Drizzle ORM conditions
 * and a human-readable interpretation string (Spanish).
 *
 * @param filters - The partial SearchFilters object from the AI agent
 * @returns Drizzle conditions array and a Spanish interpretation string
 */
export function translateFiltersToDrizzle(
  filters: Partial<SearchFilters>
): FilterTranslation {
  const conditions: ReturnType<typeof sql>[] = [];
  const parts: string[] = [];

  // ── name_contains → ILIKE ────────────────────────────────────────────
  if (filters.name_contains) {
    conditions.push(
      ilike(contacts.full_name, `%${filters.name_contains}%`)
    );
    parts.push(`nombre contiene "${filters.name_contains}"`);
  }

  // ── email_contains → ILIKE ───────────────────────────────────────────
  if (filters.email_contains) {
    conditions.push(
      ilike(contacts.email, `%${filters.email_contains}%`)
    );
    parts.push(`email contiene "${filters.email_contains}"`);
  }

  // ── source → equality ────────────────────────────────────────────────
  if (filters.source) {
    conditions.push(sql`${contacts.source} = ${filters.source}`);
    parts.push(`origen "${filters.source}"`);
  }

  // ── has_activity_since → EXISTS subquery on calls + comments ─────────
  if (filters.has_activity_since) {
    conditions.push(sql`
      EXISTS (
        SELECT 1 FROM ${calls}
        WHERE ${calls.contact_id} = ${contacts.id}
          AND ${calls.call_time} >= ${filters.has_activity_since}::timestamp
        UNION
        SELECT 1 FROM ${comments}
        WHERE ${comments.contact_id} = ${contacts.id}
          AND ${comments.created_at} >= ${filters.has_activity_since}::timestamp
      )
    `);
    parts.push(`con actividad desde ${filters.has_activity_since}`);
  }

  // ── has_tag → EXISTS on contact_tags join ────────────────────────────
  if (filters.has_tag) {
    conditions.push(sql`
      EXISTS (
        SELECT 1 FROM ${contactTags} ct
        INNER JOIN ${tags} t ON t.id = ct.tag_id
        WHERE ct.contact_id = ${contacts.id}
          AND t.name = ${filters.has_tag}
      )
    `);
    parts.push(`con etiqueta "${filters.has_tag}"`);
  }

  // ── activity_type → calls / comments / none ──────────────────────────
  if (filters.activity_type) {
    switch (filters.activity_type) {
      case "call":
        conditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${calls}
            WHERE ${calls.contact_id} = ${contacts.id}
          )
        `);
        parts.push("con llamadas");
        break;
      case "comment":
        conditions.push(sql`
          EXISTS (
            SELECT 1 FROM ${comments}
            WHERE ${comments.contact_id} = ${contacts.id}
          )
        `);
        parts.push("con comentarios");
        break;
      case "none":
        conditions.push(sql`
          NOT EXISTS (
            SELECT 1 FROM ${calls}
            WHERE ${calls.contact_id} = ${contacts.id}
          )
        `);
        conditions.push(sql`
          NOT EXISTS (
            SELECT 1 FROM ${comments}
            WHERE ${comments.contact_id} = ${contacts.id}
          )
        `);
        parts.push("sin actividad");
        break;
    }
  }

  // ── min_calls → scalar subquery with COUNT ───────────────────────────
  if (filters.min_calls !== undefined) {
    conditions.push(sql`
      (SELECT COUNT(*)::int FROM ${calls}
       WHERE ${calls.contact_id} = ${contacts.id})
      >= ${filters.min_calls}
    `);
    parts.push(`con al menos ${filters.min_calls} llamadas`);
  }

  // ── max_days_inactive → NOT EXISTS on recent calls + comments ────────
  if (filters.max_days_inactive !== undefined) {
    const cutoff = sql`now() - interval '1 day' * ${filters.max_days_inactive}`;

    conditions.push(sql`
      NOT EXISTS (
        SELECT 1 FROM ${calls}
        WHERE ${calls.contact_id} = ${contacts.id}
          AND ${calls.call_time} >= ${cutoff}
      )
    `);
    conditions.push(sql`
      NOT EXISTS (
        SELECT 1 FROM ${comments}
        WHERE ${comments.contact_id} = ${contacts.id}
          AND ${comments.created_at} >= ${cutoff}
      )
    `);
    parts.push(`inactivos por más de ${filters.max_days_inactive} días`);
  }

  // ── Build interpretation ─────────────────────────────────────────────
  const interpretation =
    parts.length > 0
      ? `Mostrando contactos ${parts.join(", ")}`
      : "Mostrando todos los contactos";

  return { conditions, interpretation };
}
