import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";

export const hubspotConnections = pgTable(
  "hubspot_connections",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organization_id: varchar("organization_id", { length: 255 })
      .notNull()
      .references(() => organizations.id),
    hubspot_portal_id: varchar("hubspot_portal_id", { length: 255 }).notNull(),
    hubspot_user_email: varchar("hubspot_user_email", { length: 255 }),
    hubspot_hub_domain: varchar("hubspot_hub_domain", { length: 255 }),
    access_token: text("access_token").notNull(),
    refresh_token: text("refresh_token").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    orgIdx: uniqueIndex("hubspot_connections_org_idx").on(table.organization_id),
    portalIdx: uniqueIndex("hubspot_connections_portal_idx").on(
      table.hubspot_portal_id,
    ),
  }),
);

export type HubSpotConnection = typeof hubspotConnections.$inferSelect;
export type NewHubSpotConnection = typeof hubspotConnections.$inferInsert;
