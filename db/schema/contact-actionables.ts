import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";

export const contactActionables = pgTable("contact_actionables", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  contact_id: uuid("contact_id").references(() => contacts.id),
  prompt: text("prompt").notNull(),
  summary: text("summary"),
  actions: jsonb("actions").$type<string[]>().notNull(),
  snapshot: jsonb("snapshot").$type<Record<string, unknown>>(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type ContactActionable = typeof contactActionables.$inferSelect;
export type NewContactActionable = typeof contactActionables.$inferInsert;
