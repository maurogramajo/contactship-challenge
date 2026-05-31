import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organizations";

export const organizationRefreshTokens = pgTable(
  "organization_refresh_tokens",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organization_id: varchar("organization_id", { length: 255 })
      .notNull()
      .references(() => organizations.id),
    token_hash: text("token_hash").notNull(),
    expires_at: timestamp("expires_at").notNull(),
    revoked_at: timestamp("revoked_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index("organization_refresh_tokens_org_idx").on(
      table.organization_id,
    ),
    tokenHashIdx: index("organization_refresh_tokens_hash_idx").on(
      table.token_hash,
    ),
  }),
);

export type OrganizationRefreshToken =
  typeof organizationRefreshTokens.$inferSelect;
export type NewOrganizationRefreshToken =
  typeof organizationRefreshTokens.$inferInsert;
