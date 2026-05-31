import {
  pgTable,
  uuid,
  varchar,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";

export const tags = pgTable("tags", {
  id: uuid("id")
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  color: varchar("color", { length: 50 }),
  label: varchar("label", { length: 255 }),
});

export const contactTags = pgTable(
  "contact_tags",
  {
    contact_id: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
    tag_id: uuid("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.contact_id, table.tag_id] }),
  }),
);

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type ContactTag = typeof contactTags.$inferSelect;
export type NewContactTag = typeof contactTags.$inferInsert;
