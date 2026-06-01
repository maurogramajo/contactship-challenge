import { db } from "@/db";
import { contactActionables } from "@/db/schema";
import type { ActionableAction } from "@/db/zod/actionable";
import {
  normalizeActionableRecord,
  type StoredContactActionable,
} from "@/lib/actionables";
import { and, desc, eq, sql } from "drizzle-orm";

export interface CreateActionableInput {
  contact_id: string;
  prompt: string;
  summary?: string | null;
  actions: ActionableAction[];
  snapshot?: Record<string, unknown> | null;
  organization_id?: string | null;
  recommended_channel?: string | null;
  recommended_action?: string | null;
  draft_message?: string | null;
  reasoning?: string | null;
}

export async function createActionable(
  data: CreateActionableInput
): Promise<StoredContactActionable> {
  const result = await db
    .insert(contactActionables)
    .values(data)
    .returning();

  return normalizeActionableRecord(result[0]);
}

export async function getActionablesByContactId(
  contactId: string
): Promise<StoredContactActionable[]> {
  const records = await db
    .select()
    .from(contactActionables)
    .where(eq(contactActionables.contact_id, contactId))
    .orderBy(desc(contactActionables.created_at));

  return records.map(normalizeActionableRecord);
}

export async function getActionableById(
  actionableId: string,
  organizationId: string,
): Promise<StoredContactActionable | null> {
  const result = await db
    .select()
    .from(contactActionables)
    .where(
      and(
        eq(contactActionables.id, actionableId),
        eq(contactActionables.organization_id, organizationId),
      ),
    )
    .limit(1);

  const actionable = result[0];
  return actionable ? normalizeActionableRecord(actionable) : null;
}

export async function updateActionableActions(
  actionableId: string,
  organizationId: string,
  actions: ActionableAction[],
): Promise<StoredContactActionable | null> {
  const result = await db
    .update(contactActionables)
    .set({ actions })
    .where(
      and(
        eq(contactActionables.id, actionableId),
        eq(contactActionables.organization_id, organizationId),
      ),
    )
    .returning();

  const actionable = result[0];
  return actionable ? normalizeActionableRecord(actionable) : null;
}

/**
 * Atomically updates a single action within an actionable's actions array.
 *
 * Uses SELECT ... FOR UPDATE inside a transaction to serialize concurrent
 * updates to the same actionable row. Without this, parallel API calls
 * modifying different actions on the same actionable suffer a last-write-wins
 * race condition where the second writer inadvertently reverts the first
 * writer's status change.
 */
export async function updateActionableActionAtomically(
  actionableId: string,
  organizationId: string,
  actionId: string,
  transformFn: (action: ActionableAction) => ActionableAction,
): Promise<StoredContactActionable | null> {
  return db.transaction(async (tx) => {
    // pg_advisory_xact_lock is a PostgreSQL session-level lock that
    // serializes concurrent access to the same actionable. It is
    // automatically released at transaction commit/rollback.
    const lockId = hashStringToInt32(actionableId);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

    const [record] = await tx
      .select()
      .from(contactActionables)
      .where(
        and(
          eq(contactActionables.id, actionableId),
          eq(contactActionables.organization_id, organizationId),
        ),
      );

    if (!record) return null;

    const current = normalizeActionableRecord(record);
    const nextActions = current.actions.map((item) =>
      item.id === actionId ? transformFn(item) : item,
    );

    const [updated] = await tx
      .update(contactActionables)
      .set({ actions: nextActions })
      .where(
        and(
          eq(contactActionables.id, actionableId),
          eq(contactActionables.organization_id, organizationId),
        ),
      )
      .returning();

    return updated ? normalizeActionableRecord(updated) : null;
  });
}

function hashStringToInt32(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}
