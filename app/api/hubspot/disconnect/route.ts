import { NextResponse } from "next/server";
import {
  deleteHubSpotConnection,
  getHubSpotConnectionByOrganizationId,
} from "@/db/repository";
import { getCurrentOrganization } from "@/lib/session";

export async function POST() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 },
    );
  }

  const connection = await getHubSpotConnectionByOrganizationId(organization.id);
  if (!connection) {
    return NextResponse.json({ success: true });
  }

  await deleteHubSpotConnection(connection.id);
  return NextResponse.json({ success: true });
}
