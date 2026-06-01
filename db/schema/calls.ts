import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  index,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";

export const directionEnum = pgEnum("call_direction", ["inbound", "outbound"]);

export type CallAnalysis = {
  summary?: string | null;
  sentiment?: string | null;
};

export type CallChatMessage = {
  role: "agent" | "user" | "system" | string;
  content: string;
};

export const calls = pgTable(
  "calls",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    direction: directionEnum("direction").notNull(),
    from: varchar("from", { length: 255 }),
    call_record: varchar("call_record", { length: 1024 }),
    call_status: varchar("call_status", { length: 255 }).notNull(),
    call_result: varchar("call_result", { length: 255 }),
    disconnection_reason: varchar("disconnection_reason", { length: 255 }),
    finished_at: timestamp("finished_at"),
    start_at: timestamp("start_at").notNull(),
    duration: integer("duration"),
    call_analysis: jsonb("call_analysis").$type<CallAnalysis>(),
    type: varchar("type", { length: 255 }).default("ai_call").notNull(),
    agent_id: varchar("agent_id", { length: 255 }),
    contact_id: uuid("contact_id").references(() => contacts.id),
    chat_history: jsonb("chat_history").$type<CallChatMessage[]>().default([]).notNull(),
    transcript_format: varchar("transcript_format", { length: 50 })
      .default("json")
      .notNull(),
    organization_id: varchar("organization_id", { length: 255 }),
  },
  (table) => ({
    contactStartIdx: index("calls_contact_start_idx").on(
      table.contact_id,
      table.start_at,
    ),
  }),
);

export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
