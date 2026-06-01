import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";

export const comments = pgTable(
  "comments",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    content: text("content").notNull(),
    user_id: varchar("user_id", { length: 255 }),
    user_name: varchar("user_name", { length: 255 }),
    contact_id: uuid("contact_id").references(() => contacts.id),
    organization_id: varchar("organization_id", { length: 255 }),
  },
  (table) => ({
    contactCreatedIdx: index("comments_contact_created_idx").on(
      table.contact_id,
      table.created_at,
    ),
  }),
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
