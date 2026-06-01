import { db } from "@/db";
import { calls, type Call } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getCallsByContactId(
  contactId: string,
  limit?: number,
  offset?: number
): Promise<Call[]> {
  const base = db
    .select()
    .from(calls)
    .where(eq(calls.contact_id, contactId))
    .orderBy(desc(calls.start_at));

  if (limit !== undefined && offset !== undefined) {
    return base.limit(limit).offset(offset);
  }
  if (limit !== undefined) {
    return base.limit(limit);
  }
  return base;
}
