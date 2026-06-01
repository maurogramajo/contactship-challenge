import { NextRequest, NextResponse } from "next/server";
import { getActionableById } from "@/db/repository/actionables";
import { toActionableData } from "@/lib/actionables";
import {
  executeHubSpotAction,
  HubSpotActionExecutionError,
} from "@/lib/hubspot";
import { resolveHubSpotExternalIdForContactIdentifier } from "@/lib/contacts";
import { getCurrentOrganization } from "@/lib/session";
import {
  markActionSyncCompleted,
  queueActionSyncTask,
} from "@/lib/sync-tasks";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ actionableId: string; actionId: string }>;
  },
) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const { actionableId, actionId } = await params;
    const actionable = await getActionableById(actionableId, organization.id);

    if (!actionable) {
      return NextResponse.json(
        { error: "Actionable not found", code: 404 },
        { status: 404, headers: NO_STORE },
      );
    }

    const action = actionable.actions.find((item) => item.id === actionId);
    if (!action) {
      return NextResponse.json(
        { error: "Action not found", code: 404 },
        { status: 404, headers: NO_STORE },
      );
    }

    if (action.status === "executed") {
      return NextResponse.json(
        { actionable: toActionableData(actionable), status: "executed" },
        { headers: NO_STORE },
      );
    }

    if (!actionable.contact_id) {
      const updated = await queueActionSyncTask({
        organizationId: organization.id,
        actionable,
        action,
        message: "La acción no tiene un contacto local asociado.",
      });

      return NextResponse.json(
        {
          actionable: toActionableData(updated ?? actionable),
          status: "pending",
          message: "La acción quedó pendiente de sincronización.",
        },
        { status: 202, headers: NO_STORE },
      );
    }

    const externalId = await resolveHubSpotExternalIdForContactIdentifier(
      actionable.contact_id,
      organization.id,
    );

    if (!externalId) {
      const updated = await queueActionSyncTask({
        organizationId: organization.id,
        actionable,
        action,
        message: "El contacto todavía no tiene un ID externo de HubSpot.",
      });

      return NextResponse.json(
        {
          actionable: toActionableData(updated ?? actionable),
          status: "pending",
          message: "La acción quedó pendiente de sincronización.",
        },
        { status: 202, headers: NO_STORE },
      );
    }

    try {
      const result = await executeHubSpotAction(
        organization.id,
        externalId,
        action,
      );

      const updated = await markActionSyncCompleted({
        organizationId: organization.id,
        actionable,
        action,
        externalId: result.id,
      });

      return NextResponse.json(
        {
          actionable: toActionableData(updated ?? actionable),
          status: "executed",
        },
        { headers: NO_STORE },
      );
    } catch (error) {
      const message =
        error instanceof HubSpotActionExecutionError
          ? error.message
          : "No se pudo sincronizar la acción con HubSpot.";

      const updated = await queueActionSyncTask({
        organizationId: organization.id,
        actionable,
        action,
        message,
      });

      return NextResponse.json(
        {
          actionable: toActionableData(updated ?? actionable),
          status: "pending",
          message,
        },
        { status: 202, headers: NO_STORE },
      );
    }
  } catch (error) {
    console.error(
      "POST /api/actionables/[actionableId]/actions/[actionId] error:",
      error,
    );
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}
