import { Client } from "@hubspot/api-client";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import { refreshHubSpotConnectionIfNeeded } from "./oauth";

export function createHubSpotClient(accessToken: string): Client {
  return new Client({ accessToken });
}

export async function getHubSpotClientForOrganization(
  organizationId: string,
): Promise<Client> {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    throw new Error("HubSpot is not connected for this organization.");
  }

  const freshConnection = await refreshHubSpotConnectionIfNeeded(connection);
  return createHubSpotClient(freshConnection.access_token);
}

/** Simple promise-based sleep for delays between API calls. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
