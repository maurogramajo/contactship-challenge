import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";

export const directionEnum = pgEnum("call_direction", ["inbound", "outbound"]);
export const statusEnum = pgEnum("call_status", [
  "answered",
  "missed",
  "rejected",
  "busy",
  "failed",
]);

export const calls = pgTable("calls", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  call_time: timestamp("call_time").notNull(),
  duration: integer("duration"),
  direction: directionEnum("direction").notNull(),
  status: statusEnum("status").notNull(),
  notes: text("notes"),
  recording_url: varchar("recording_url", { length: 1024 }),
  contact_id: uuid("contact_id").references(() => contacts.id),
  user_id: varchar("user_id", { length: 255 }),
  organization_id: varchar("organization_id", { length: 255 }),
});

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
