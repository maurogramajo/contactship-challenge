import { NextRequest, NextResponse } from "next/server";
import { getActionablesByContactId } from "@/db/repository";
import {
  getLocalMaterializedContactByIdentifier,
  isHubSpotVirtualContactId,
} from "@/lib/contacts";
import { getCurrentOrganization } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const { id } = await params;

    const contact = await getLocalMaterializedContactByIdentifier(id, organization.id);
    if (!contact && !isHubSpotVirtualContactId(id)) {
      return NextResponse.json(
        { error: "Contact not found", code: 404 },
        { status: 404, headers: NO_STORE }
      );
    }

    const actionables = contact
      ? await getActionablesByContactId(contact.id)
      : [];

    return NextResponse.json(actionables, { headers: NO_STORE });
  } catch (error) {
    console.error("GET /api/contacts/[id]/insights error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE }
    );
  }
}
