import crypto from "crypto";
import { getHubSpotConnectionByPortalId } from "@/db/repository";
import { getHubSpotClientForOrganization } from "./client";
import { mapHubSpotContactToOurModel } from "./contacts";
import { upsertContactByExternalId } from "@/db/repository/contacts";

// ── Types ──────────────────────────────────────────────────────────────────

export type WebhookEvent = {
  eventId: number;
  subscriptionId: number;
  portalId: number;
  appId: number;
  occurredAt: number;
  subscriptionType: string;
  attemptNumber: number;
  objectId: number;
  changeSource: string;
  changeFlag?: string;
  propertyName?: string;
  propertyValue?: string;
};

// ── Signature Validation ───────────────────────────────────────────────────

/**
 * Validate HubSpot webhook signature using HMAC-SHA256.
 *
 * HubSpot v3 signatures use the client secret as the HMAC key
 * and the raw request body as the message.
 */
export function validateWebhookSignature(
  method: string,
  requestUri: string,
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string,
): boolean {
  const decodedUri = requestUri
    .replace(/%3A/gi, ":")
    .replace(/%2F/gi, "/")
    .replace(/%3F/gi, "?")
    .replace(/%40/gi, "@")
    .replace(/%21/gi, "!")
    .replace(/%24/gi, "$")
    .replace(/%27/gi, "'")
    .replace(/%28/gi, "(")
    .replace(/%29/gi, ")")
    .replace(/%2A/gi, "*")
    .replace(/%2C/gi, ",")
    .replace(/%3B/gi, ";");
  const source = `${method}${decodedUri}${rawBody}${timestamp}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(source)
    .digest("base64");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(signature, "utf-8"),
    );
  } catch {
    // Buffer length mismatch → definitely invalid
    return false;
  }
}

// ── Event Processing ───────────────────────────────────────────────────────

/**
 * Process a single HubSpot webhook event.
 *
 * Currently handles:
 *   - `contact.creation`: fetches the full contact from HubSpot,
 *     maps it to the ContactShip model, and upserts into the database.
 *
 * Errors are logged but never thrown — HubSpot expects the endpoint
 * to acknowledge receipt regardless of internal processing failures.
 */
export async function processWebhookEvent(event: WebhookEvent): Promise<void> {
  if (event.subscriptionType !== "contact.creation") {
    console.log(`[webhook] Ignored event type: ${event.subscriptionType}`);
    return;
  }

  try {
    const objectIdStr = String(event.objectId);
    const connection = await getHubSpotConnectionByPortalId(String(event.portalId));

    if (!connection) {
      console.warn(
        `[webhook] No local organization linked to HubSpot portal ${event.portalId}`,
      );
      return;
    }

    const hubspotClient = await getHubSpotClientForOrganization(
      connection.organization_id,
    );

    // Fetch the full contact from HubSpot by ID
    const response = await hubspotClient.crm.contacts.basicApi.getById(
      objectIdStr,
      [
        "firstname",
        "lastname",
        "email",
        "phone",
        "company",
        "lifecyclestage",
        "hs_lead_status",
        "createdate",
        "lastmodifieddate",
      ],
    );

    // Map to our internal model
    const mapped = mapHubSpotContactToOurModel({
      id: objectIdStr,
      properties: response.properties as Record<string, string | null>,
    }, connection.organization_id);

    // Upsert into the database
    await upsertContactByExternalId(mapped);

    console.log(
      `[webhook] contact.creation upserted: ${objectIdStr} (${mapped.full_name ?? mapped.email})`,
    );
  } catch (error) {
    console.error(
      `[webhook] Failed to process contact.creation for ID ${event.objectId}:`,
      error instanceof Error ? error.message : error,
    );
    // Intentionally not re-throwing — HubSpot expects 200 even on error
  }
}
