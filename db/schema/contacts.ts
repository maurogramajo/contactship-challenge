import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const sourceEnum = pgEnum("source", ["hubspot"]);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    phone_number: varchar("phone_number", { length: 255 }),
    full_name: varchar("full_name", { length: 255 }),
    country: varchar("country", { length: 100 }),
    email: varchar("email", { length: 255 }),
    description: text("description"),
    additional_data: jsonb("additional_data").$type<
      { type: string; field: string; value: string }[]
    >(),
    organization_id: varchar("organization_id", { length: 255 }),
    external_id: varchar("external_id", { length: 255 }),
    external_lifecycle_stage: varchar("external_lifecycle_stage", { length: 50 }),
    external_lead_status: varchar("external_lead_status", { length: 50 }),
    source: sourceEnum("source"),
  },
  (table) => ({
    fullNameIdx: index("contacts_full_name_idx").on(table.full_name),
    emailIdx: index("contacts_email_idx").on(table.email),
    externalSourceOrgIdx: uniqueIndex("contacts_external_source_org_idx").on(
      table.organization_id,
      table.external_id,
      table.source,
    ),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
