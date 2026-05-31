import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentOrganization } from "@/lib/session";
import { createHubSpotNote, HubSpotNotesError } from "@/lib/hubspot";
import { getHubSpotExternalIdFromContactId } from "@/lib/contacts";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  contactId: z.string().min(1),
  note: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: 400,
          details: parsed.error.flatten(),
        },
        { status: 400, headers: NO_STORE },
      );
    }

    const { contactId, note } = parsed.data;

    // Resolve the real HubSpot external contact ID
    const externalId = getHubSpotExternalIdFromContactId(contactId);
    if (!externalId) {
      return NextResponse.json(
        { error: "Contact does not have a HubSpot external ID", code: 400 },
        { status: 400, headers: NO_STORE },
      );
    }

    try {
      const result = await createHubSpotNote(organization.id, externalId, note);
      return NextResponse.json(
        { note: result },
        { status: 201, headers: NO_STORE },
      );
    } catch (error) {
      if (error instanceof HubSpotNotesError) {
        if (error.code === 403) {
          return NextResponse.json(
            {
              error: "HubSpot scope missing",
              code: 403,
              required_scope: "crm.objects.notes.write",
            },
            { status: 403, headers: NO_STORE },
          );
        }
        if (error.code === 400) {
          return NextResponse.json(
            { error: "HubSpot not connected", code: 400 },
            { status: 400, headers: NO_STORE },
          );
        }
        return NextResponse.json(
          { error: "HubSpot API error", code: 502 },
          { status: 502, headers: NO_STORE },
        );
      }
      throw error; // unexpected error → 500
    }
  } catch (error) {
    console.error("POST /api/hubspot/notes error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}
