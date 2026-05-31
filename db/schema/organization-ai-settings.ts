import {
  pgTable,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

export const organizationAiSettings = pgTable(
  "organization_ai_settings",
  {
    organization_id: varchar("organization_id", { length: 255 })
      .unique()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    objective: text("objective").notNull(),
    additional_instructions: text("additional_instructions"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
);

export type OrganizationAiSettings =
  typeof organizationAiSettings.$inferSelect;
export type NewOrganizationAiSettings =
  typeof organizationAiSettings.$inferInsert;
