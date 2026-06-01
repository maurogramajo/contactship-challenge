import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildContactContext } from "@/lib/ai/build-context";
import { generateContactInsight } from "@/lib/ai/insights";
import { createActionable } from "@/db/repository/actionables";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import { toActionableData } from "@/lib/actionables";
import { ensureLocalContactForActionables } from "@/lib/contacts";
import { getCurrentOrganization } from "@/lib/session";
import { queueActionSyncTask } from "@/lib/sync-tasks";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  contactId: z.string().min(1),
});

function normalizeContactId(contactId: string): string {
  try {
    return decodeURIComponent(contactId);
  } catch {
    return contactId;
  }
}

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
        { status: 400, headers: NO_STORE }
      );
    }

    const contactId = normalizeContactId(parsed.data.contactId);

    const localContact = await ensureLocalContactForActionables(
      contactId,
      organization.id,
    );
    if (!localContact) {
      return NextResponse.json(
        { error: "Contact not found", code: 404 },
        { status: 404, headers: NO_STORE }
      );
    }

    const context = await buildContactContext(localContact.id, organization.id, {
      includeOrgSettings: true,
      includePreviousActionables: true,
    });
    if (!context) {
      return NextResponse.json(
        { error: "Contact not found", code: 404 },
        { status: 404, headers: NO_STORE }
      );
    }

    const result = await generateContactInsight(context);
    if ("error" in result) {
      return NextResponse.json(
        { error: "AI service unavailable", code: 503 },
        { status: 503, headers: NO_STORE }
      );
    }

    const { insight, prompt, output } = result;

    let actionable = await createActionable({
      contact_id: localContact.id,
      organization_id: organization.id,
      prompt,
      summary: insight.summary,
      actions: insight.actions,
      snapshot: JSON.parse(JSON.stringify(context)) as Record<string, unknown>,
      recommended_channel: output.recommended_channel,
      reasoning: output.reasoning,
    });

    const hubSpotConnection = await getHubSpotConnectionByOrganizationId(
      organization.id,
    );
    const shouldQueueGeneratedActions =
      !hubSpotConnection ||
      localContact.source !== "hubspot" ||
      !localContact.external_id;

    if (shouldQueueGeneratedActions) {
      const message = !hubSpotConnection
        ? "HubSpot no está conectado para esta organización."
        : "El contacto todavía no tiene un ID externo de HubSpot.";

      for (const action of actionable.actions) {
        actionable =
          (await queueActionSyncTask({
            organizationId: organization.id,
            actionable,
            action,
            message,
          })) ?? actionable;
      }
    }

    return NextResponse.json(
      { actionable: toActionableData(actionable) },
      { status: 201, headers: NO_STORE }
    );
  } catch (error) {
    console.error("POST /api/ai/insights error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE }
    );
  }
}
