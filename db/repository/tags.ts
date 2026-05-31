import { db } from "@/db";
import { tags, contactTags, type Tag } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAllTags(): Promise<Tag[]> {
  return db.select().from(tags).orderBy(tags.name);
}

export async function getTagsByContactId(
  contactId: string
): Promise<Tag[]> {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      label: tags.label,
    })
    .from(tags)
    .innerJoin(contactTags, eq(tags.id, contactTags.tag_id))
    .where(eq(contactTags.contact_id, contactId))
    .orderBy(tags.name);
}
