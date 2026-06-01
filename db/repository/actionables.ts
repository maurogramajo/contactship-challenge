import { db } from "@/db";
import { contactActionables } from "@/db/schema";
import type { ActionableAction } from "@/db/zod/actionable";
import {
  normalizeActionableRecord,
  type StoredContactActionable,
} from "@/lib/actionables";
import { and, desc, eq } from "drizzle-orm";

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
