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
    organizationCreatedIdx: index("contacts_org_created_idx").on(
      table.organization_id,
      table.created_at,
    ),
    organizationPhoneIdx: index("contacts_org_phone_idx").on(
      table.organization_id,
      table.phone_number,
    ),
    organizationLifecycleStageIdx: index("contacts_org_lifecycle_stage_idx").on(
      table.organization_id,
      table.external_lifecycle_stage,
    ),
    organizationLeadStatusIdx: index("contacts_org_lead_status_idx").on(
      table.organization_id,
      table.external_lead_status,
    ),
    normalizedEmailIdx: index("contacts_org_normalized_email_idx").on(
      table.organization_id,
      sql`lower(trim(${table.email}))`,
    ),
    normalizedPhoneIdx: index("contacts_org_normalized_phone_idx").on(
      table.organization_id,
      sql`regexp_replace(coalesce(${table.phone_number}, ''), '[^0-9]+', '', 'g')`,
    ),
    fullNameTrgmIdx: index("contacts_full_name_trgm_idx").using(
      "gin",
      sql`${table.full_name} gin_trgm_ops`,
    ),
    emailTrgmIdx: index("contacts_email_trgm_idx").using(
      "gin",
      sql`${table.email} gin_trgm_ops`,
    ),
    phoneTrgmIdx: index("contacts_phone_trgm_idx").using(
      "gin",
      sql`${table.phone_number} gin_trgm_ops`,
    ),
    externalSourceOrgIdx: uniqueIndex("contacts_external_source_org_idx").on(
      table.organization_id,
      table.external_id,
      table.source,
    ),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
