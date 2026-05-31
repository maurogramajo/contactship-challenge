import { db } from "@/db";
import {
  contactActionables,
  type ContactActionable,
  type NewContactActionable,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function createActionable(
  data: NewContactActionable
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
