import { getHubSpotClientForOrganization } from "./client";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";

const REQUIRED_SCOPE = "crm.objects.notes.write";

export class HubSpotNotesError extends Error {
  code: number;
  constructor(message: string, code: number) {
    super(message);
    this.name = "HubSpotNotesError";
    this.code = code;
  }
}

export async function createHubSpotNote(
  organizationId: string,
  contactId: string,
  noteBody: string,
): Promise<{ id: string }> {
  // 1. Check scope
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    throw new HubSpotNotesError("HubSpot is not connected for this organization.", 400);
  }
  if (!connection.scopes.includes(REQUIRED_SCOPE)) {
    throw new HubSpotNotesError(
      `Missing required scope: ${REQUIRED_SCOPE}`,
      403,
    );
  }

  // 2. Get authenticated client
  const client = await getHubSpotClientForOrganization(organizationId);

  // 3. Create the note via CRM Objects API
  try {
    const response = await client.crm.objects.notes.basicApi.create({
      properties: {
        hs_note_body: noteBody,
        hs_timestamp: new Date().toISOString(),
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED" as never,
              associationTypeId: 202, // Note-to-Contact association type
            },
          ],
        },
      ],
    });

    return { id: response.id };
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 429) {
      throw new HubSpotNotesError("HubSpot rate limit exceeded", 429);
    }
    throw new HubSpotNotesError(
      err.message ?? "Failed to create note in HubSpot",
      502,
    );
  }
}
