import { NextRequest, NextResponse } from "next/server";
import {
  getCallsByContactId,
  getCommentsByContactId,
  getTagsByContactId,
} from "@/db/repository";
import {
  getLocalMaterializedContactByIdentifier,
  getUnifiedContactById,
} from "@/lib/contacts";
import { buildContactshipTimeline } from "@/lib/contactship/timeline";
import { getHubSpotContactActivity } from "@/lib/hubspot/contact-activity";
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

    const [contact, localContact] = await Promise.all([
      getUnifiedContactById(id, organization.id),
      getLocalMaterializedContactByIdentifier(id, organization.id),
    ]);

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found", code: 404 },
        { status: 404, headers: NO_STORE }
      );
    }

    const [calls, comments, tags] = localContact
      ? await Promise.all([
          getCallsByContactId(localContact.id, 20),
          getCommentsByContactId(localContact.id, 20),
          getTagsByContactId(localContact.id),
        ])
      : [[], [], []];

    const hubspotActivity = await getHubSpotContactActivity(id, organization.id);
    const timeline = buildContactshipTimeline({
      contact,
      calls,
      comments,
    });

    return NextResponse.json(
      {
        ...contact,
        calls,
        comments,
        tags,
        hubspotNotes: hubspotActivity.notes,
        hubspotTasks: hubspotActivity.tasks,
        hubspotActivityError: hubspotActivity.error,
        hasHubSpotContact: hubspotActivity.hasHubSpotContact,
        timeline,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("GET /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE }
    );
  }
}
