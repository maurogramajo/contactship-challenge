import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import type { ActionableAction } from "@/db/zod/actionable";

export const contactActionables = pgTable(
  "contact_actionables",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    contact_id: uuid("contact_id").references(() => contacts.id),
    prompt: text("prompt").notNull(),
    summary: text("summary"),
    actions: jsonb("actions").$type<ActionableAction[]>().notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
    organization_id: varchar("organization_id", { length: 255 }),
    recommended_channel: varchar("recommended_channel", { length: 255 }),
    recommended_action: text("recommended_action"),
    draft_message: text("draft_message"),
    reasoning: text("reasoning"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    contactCreatedIdx: index("contact_actionables_contact_created_idx").on(
      table.contact_id,
      table.created_at,
    ),
  }),
);

export type ContactActionable = typeof contactActionables.$inferSelect;
export type NewContactActionable = typeof contactActionables.$inferInsert;
