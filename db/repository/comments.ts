import { db } from "@/db";
import { comments, type Comment } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getCommentsByContactId(
  contactId: string,
  limit?: number,
  offset?: number
): Promise<Comment[]> {
  const base = db
    .select()
    .from(comments)
    .where(eq(comments.contact_id, contactId))
    .orderBy(desc(comments.created_at));

  if (limit !== undefined && offset !== undefined) {
    return base.limit(limit).offset(offset);
  }
  if (limit !== undefined) {
    return base.limit(limit);
  }
  return base;
}
