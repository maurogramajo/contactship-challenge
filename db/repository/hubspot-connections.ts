import { db } from "@/db";
import {
  hubspotConnections,
  type HubSpotConnection,
  type NewHubSpotConnection,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getHubSpotConnectionByOrganizationId(
  organizationId: string,
): Promise<HubSpotConnection | null> {
  const [connection] = await db
    .select()
    .from(hubspotConnections)
    .where(eq(hubspotConnections.organization_id, organizationId))
    .limit(1);

  return connection ?? null;
}

export async function getHubSpotConnectionByPortalId(
  portalId: string,
): Promise<HubSpotConnection | null> {
  const [connection] = await db
    .select()
    .from(hubspotConnections)
    .where(eq(hubspotConnections.hubspot_portal_id, portalId))
    .limit(1);

  return connection ?? null;
}

export async function createHubSpotConnection(
  data: NewHubSpotConnection,
): Promise<HubSpotConnection> {
  const [connection] = await db
    .insert(hubspotConnections)
    .values(data)
    .returning();

  return connection;
}

export async function updateHubSpotConnection(
  id: string,
  data: Partial<NewHubSpotConnection>,
): Promise<HubSpotConnection> {
  const [connection] = await db
    .update(hubspotConnections)
    .set({ ...data, updated_at: new Date() })
    .where(eq(hubspotConnections.id, id))
    .returning();

  return connection;
}

export async function deleteHubSpotConnection(id: string): Promise<void> {
  await db.delete(hubspotConnections).where(eq(hubspotConnections.id, id));
}
