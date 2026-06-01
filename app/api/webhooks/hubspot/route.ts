import { type NextRequest } from "next/server";
import {
  validateWebhookSignature,
  processWebhookEvent,
  type WebhookEvent,
} from "@/lib/hubspot/webhook";
import { requireEnv } from "@/lib/required-env";

const WEBHOOK_SECRET = requireEnv("WEBHOOK_SECRET");

const TIMESTAMP_MAX_AGE_MS = 300_000; // 5 minutes

/**
 * POST /api/webhooks/hubspot
 *
 * Receives HubSpot webhook events. Validates the v3 signature and
 * request age before processing. Always returns 200 for valid signatures
 * (HubSpot best practice: acknowledge receipt even if processing fails).
 */
export async function POST(request: NextRequest): Promise<Response> {
  // ── 1. Read raw body as text (must happen before JSON parsing) ──────────
  const rawBody = await request.text();

  // ── 2. Validate signature header ───────────────────────────────────────
  const signature = request.headers.get("X-HubSpot-Signature-v3");
  const timestamp = request.headers.get("X-HubSpot-Request-Timestamp");
  if (!signature) {
    console.warn("[webhook] Missing X-HubSpot-Signature-v3 header");
    return new Response("Missing signature", { status: 401 });
  }

  if (!timestamp) {
    console.warn("[webhook] Missing X-HubSpot-Request-Timestamp header");
    return new Response("Missing timestamp", { status: 401 });
  }

  if (
    !validateWebhookSignature(
      request.method,
      request.url,
      rawBody,
      timestamp,
      signature,
      WEBHOOK_SECRET,
    )
  ) {
    console.warn("[webhook] Invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  // ── 3. Validate timestamp (replay protection) ───────────────────────────
  const age = Date.now() - parseInt(timestamp, 10);
  if (Number.isNaN(age) || age > TIMESTAMP_MAX_AGE_MS) {
    console.warn(`[webhook] Expired timestamp — age: ${age}ms`);
    return new Response("Expired timestamp", { status: 401 });
  }

  // ── 4. Parse JSON body ─────────────────────────────────────────────────
  let events: WebhookEvent[];
  try {
    events = JSON.parse(rawBody) as WebhookEvent[];
  } catch {
    console.warn("[webhook] Invalid JSON body");
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!Array.isArray(events)) {
    console.warn("[webhook] Body is not an array");
    return new Response("Expected array of events", { status: 400 });
  }

  // ── 5. Process events (fire-and-forget — do NOT await) ─────────────────
  for (const event of events) {
    if (event.subscriptionType === "contact.creation") {
      // Fire and forget — HubSpot requires <5s response
      processWebhookEvent(event).catch((err) => {
        console.error("[webhook] Unhandled error in event processing:", err);
      });
    }
  }

  // ── 6. Return 200 immediately ──────────────────────────────────────────
  return new Response("OK", { status: 200 });
}
