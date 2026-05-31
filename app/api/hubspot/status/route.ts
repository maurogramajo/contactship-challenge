import { NextResponse } from "next/server";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import { getCurrentOrganization } from "@/lib/session";

interface StatusResponse {
  connected: boolean;
  hubspotPortalId: string | null;
  hubspotUserEmail: string | null;
  hubspotHubDomain: string | null;
  scopes: string[];
}

export async function GET(): Promise<NextResponse<StatusResponse>> {
  const organization = await getCurrentOrganization();

  if (!organization) {
    return NextResponse.json(
      {
        connected: false,
        hubspotPortalId: null,
        hubspotUserEmail: null,
        hubspotHubDomain: null,
        scopes: [],
      },
      { status: 401 },
    );
  }

  const connection = await getHubSpotConnectionByOrganizationId(organization.id);

  if (!connection) {
    return NextResponse.json({
      connected: false,
      hubspotPortalId: null,
      hubspotUserEmail: null,
      hubspotHubDomain: null,
      scopes: [],
    });
  }

  return NextResponse.json({
    connected: true,
    hubspotPortalId: connection.hubspot_portal_id,
    hubspotUserEmail: connection.hubspot_user_email ?? null,
    hubspotHubDomain: connection.hubspot_hub_domain ?? null,
    scopes: connection.scopes,
  });
}
