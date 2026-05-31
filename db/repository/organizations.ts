import { db } from "@/db";
import {
  organizations,
  type Organization,
  type NewOrganization,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

function getOrganizationIdCandidates(id: string): string[] {
  if (id.startsWith("org_")) {
    return [id, id.slice(4)];
  }

  return [id];
}

export async function createOrganization(
  data: NewOrganization,
): Promise<Organization> {
  const [organization] = await db.insert(organizations).values(data).returning();
  return organization;
}

export async function getOrganizationByEmail(
  email: string,
): Promise<Organization | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.email, normalizedEmail))
    .limit(1);

  return organization ?? null;
}

export async function getOrganizationById(
  id: string,
): Promise<Organization | null> {
  const candidates = getOrganizationIdCandidates(id);
  const [organization] = await db
    .select()
    .from(organizations)
    .where(
      candidates.length === 1
        ? eq(organizations.id, candidates[0])
        : inArray(organizations.id, candidates),
    )
    .limit(1);

  return organization ?? null;
}
