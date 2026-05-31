import { db } from "@/db";
import {
  contactActionables,
  type ContactActionable,
  type NewContactActionable,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface CreateActionableInput {
  contact_id: string;
  prompt: string;
  summary?: string | null;
  actions: string[];
  snapshot?: Record<string, unknown> | null;
  organization_id?: string | null;
  recommended_channel?: string | null;
  recommended_action?: string | null;
  draft_message?: string | null;
  reasoning?: string | null;
}

export async function createActionable(
  data: CreateActionableInput
): Promise<ContactActionable> {
  const result = await db
    .insert(contactActionables)
    .values(data)
    .returning();

  return result[0];
}

export async function getActionablesByContactId(
  contactId: string
): Promise<ContactActionable[]> {
  return db
    .select()
    .from(contactActionables)
    .where(eq(contactActionables.contact_id, contactId))
    .orderBy(desc(contactActionables.created_at));
}
