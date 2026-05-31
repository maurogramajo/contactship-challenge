import {
  pgTable,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const organizations = pgTable(
  "organizations",
  {
    id: varchar("id", { length: 255 })
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    password_hash: text("password_hash").notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("organizations_email_idx").on(table.email),
  }),
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
