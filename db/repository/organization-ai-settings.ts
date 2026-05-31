import { db } from "@/db";
import {
  organizationAiSettings,
  type OrganizationAiSettings,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getAiSettings(
  organizationId: string,
): Promise<OrganizationAiSettings | null> {
  const [row] = await db
    .select()
    .from(organizationAiSettings)
    .where(eq(organizationAiSettings.organization_id, organizationId))
    .limit(1);

  return row ?? null;
}

export async function upsertAiSettings(
  organizationId: string,
  data: { objective: string; additional_instructions?: string },
): Promise<OrganizationAiSettings> {
  const [row] = await db
    .insert(organizationAiSettings)
    .values({
      organization_id: organizationId,
      objective: data.objective,
      additional_instructions: data.additional_instructions,
    })
    .onConflictDoUpdate({
      target: organizationAiSettings.organization_id,
      set: {
        objective: data.objective,
        additional_instructions: data.additional_instructions,
      },
    })
    .returning();

  return row;
}
