import { getHubSpotClientForOrganization } from "./client";

type TestResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Verify that the HubSpot connection works.
 *
 * Calls `getPage(1)` to fetch a single contact — succeeds if the API
 * responds, fails if the token is invalid or the network is down.
 */
export async function testConnection(
  organizationId: string,
): Promise<TestResult> {
  try {
    const hubspotClient = await getHubSpotClientForOrganization(organizationId);

    await hubspotClient.crm.contacts.basicApi.getPage(1, undefined, [
      "email",
    ]);

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown HubSpot connection error";

    return { success: false, error: message };
  }
}
