import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { contacts } from "./contacts";
import { contactActionables } from "./contact-actionables";
import type { SyncTaskStatus, SyncTaskType } from "@/db/zod/sync-task";

export const syncTaskTypeEnum = pgEnum("sync_task_type", [
  "create_contact",
  "create_note",
  "create_task",
  "create_meeting",
]);

export const syncTaskStatusEnum = pgEnum("sync_task_status", [
  "pending",
  "completed",
  "failed",
]);

export const syncTasks = pgTable(
  "sync_tasks",
  {
    id: uuid("id")
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    organization_id: varchar("organization_id", { length: 255 }).notNull(),
    contact_id: uuid("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    actionable_id: uuid("actionable_id").references(() => contactActionables.id, {
      onDelete: "set null",
    }),
    action_id: varchar("action_id", { length: 255 }),
    type: syncTaskTypeEnum("type").$type<SyncTaskType>().notNull(),
    status: syncTaskStatusEnum("status")
      .$type<SyncTaskStatus>()
      .default("pending")
      .notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    retry_count: integer("retry_count").default(0).notNull(),
    last_error: text("last_error"),
    executed_at: timestamp("executed_at"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    organizationStatusCreatedIdx: index("sync_tasks_org_status_created_idx").on(
      table.organization_id,
      table.status,
      table.created_at,
    ),
    actionableActionIdx: index("sync_tasks_actionable_action_idx").on(
      table.actionable_id,
      table.action_id,
    ),
    contactTypeIdx: index("sync_tasks_contact_type_idx").on(
      table.contact_id,
      table.type,
    ),
  }),
);

export type SyncTask = typeof syncTasks.$inferSelect;
export type NewSyncTask = typeof syncTasks.$inferInsert;
