import { db } from "@/db";
import { syncTasks, type NewSyncTask, type SyncTask } from "@/db/schema";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { SyncTaskStatus, SyncTaskType } from "@/db/zod/sync-task";

interface SyncTaskResourceFilter {
  organizationId: string;
  type: SyncTaskType;
  contactId?: string | null;
  actionableId?: string | null;
  actionId?: string | null;
}

function isMissingSyncTasksSchemaError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  if (err.code === "42P01") {
    return true;
  }

  if (err.code === "42704" && err.message?.includes("sync_task")) {
    return true;
  }

  return false;
}

function warnMissingSyncTasksSchema(operation: string, error: unknown) {
  console.warn(
    `[sync_tasks] Skipping ${operation} because the schema is not migrated yet.`,
    error,
  );
}

export async function createSyncTask(
  data: NewSyncTask,
): Promise<SyncTask | null> {
  try {
    const result = await db.insert(syncTasks).values(data).returning();
    return result[0];
  } catch (error) {
    if (isMissingSyncTasksSchemaError(error)) {
      warnMissingSyncTasksSchema("createSyncTask", error);
      return null;
    }

    throw error;
  }
}

export async function listSyncTasksByOrganizationId(
  organizationId: string,
): Promise<SyncTask[]> {
  try {
    return await db
      .select()
      .from(syncTasks)
      .where(eq(syncTasks.organization_id, organizationId))
      .orderBy(desc(syncTasks.created_at));
  } catch (error) {
    if (isMissingSyncTasksSchemaError(error)) {
      warnMissingSyncTasksSchema("listSyncTasksByOrganizationId", error);
      return [];
    }

    throw error;
  }
}

export async function getOldestPendingSyncTask(): Promise<SyncTask | null> {
  try {
    const result = await db
      .select()
      .from(syncTasks)
      .where(eq(syncTasks.status, "pending"))
      .orderBy(asc(syncTasks.created_at))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    if (isMissingSyncTasksSchemaError(error)) {
      warnMissingSyncTasksSchema("getOldestPendingSyncTask", error);
      return null;
    }

    throw error;
  }
}

function buildResourceConditions(filters: SyncTaskResourceFilter) {
  return [
    eq(syncTasks.organization_id, filters.organizationId),
    eq(syncTasks.type, filters.type),
    filters.contactId === undefined
      ? undefined
      : filters.contactId === null
        ? isNull(syncTasks.contact_id)
        : eq(syncTasks.contact_id, filters.contactId),
    filters.actionableId === undefined
      ? undefined
      : filters.actionableId === null
        ? isNull(syncTasks.actionable_id)
        : eq(syncTasks.actionable_id, filters.actionableId),
    filters.actionId === undefined
      ? undefined
      : filters.actionId === null
        ? isNull(syncTasks.action_id)
        : eq(syncTasks.action_id, filters.actionId),
  ].filter(Boolean);
}

export async function getLatestOpenSyncTaskForResource(
  filters: SyncTaskResourceFilter,
): Promise<SyncTask | null> {
  try {
    const result = await db
      .select()
      .from(syncTasks)
      .where(
        and(
          ...buildResourceConditions(filters),
          inArray(syncTasks.status, ["pending", "failed"] satisfies SyncTaskStatus[]),
        ),
      )
      .orderBy(desc(syncTasks.created_at))
      .limit(1);

    return result[0] ?? null;
  } catch (error) {
    if (isMissingSyncTasksSchemaError(error)) {
      warnMissingSyncTasksSchema("getLatestOpenSyncTaskForResource", error);
      return null;
    }

    throw error;
  }
}

export async function updateSyncTask(
  id: string,
  data: Partial<NewSyncTask>,
): Promise<SyncTask | null> {
  try {
    const result = await db
      .update(syncTasks)
      .set({ ...data, updated_at: new Date() })
      .where(eq(syncTasks.id, id))
      .returning();

    return result[0] ?? null;
  } catch (error) {
    if (isMissingSyncTasksSchemaError(error)) {
      warnMissingSyncTasksSchema("updateSyncTask", error);
      return null;
    }

    throw error;
  }
}

export async function completeOpenSyncTasksForResource(
  filters: SyncTaskResourceFilter,
  executedAt = new Date(),
): Promise<SyncTask[]> {
  try {
    return await db
      .update(syncTasks)
      .set({
        status: "completed",
        executed_at: executedAt,
        last_error: null,
        updated_at: executedAt,
      })
      .where(
        and(
          ...buildResourceConditions(filters),
          inArray(syncTasks.status, ["pending", "failed"] satisfies SyncTaskStatus[]),
        ),
      )
      .returning();
  } catch (error) {
    if (isMissingSyncTasksSchemaError(error)) {
      warnMissingSyncTasksSchema("completeOpenSyncTasksForResource", error);
      return [];
    }

    throw error;
  }
}
