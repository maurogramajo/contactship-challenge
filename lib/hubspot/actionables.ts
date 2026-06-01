import { AssociationTypes } from "@hubspot/api-client";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import type {
  ActionPriority,
  ActionType,
  ActionableAction,
} from "@/db/zod/actionable";
import { getHubSpotClientForOrganization } from "./client";

export class HubSpotActionExecutionError extends Error {
  code: number;
  retryable: boolean;

  constructor(message: string, code: number, retryable = true) {
    super(message);
    this.name = "HubSpotActionExecutionError";
    this.code = code;
    this.retryable = retryable;
  }
}

function buildAssociation(contactId: string, associationTypeId: number) {
  return [
    {
      to: { id: contactId },
      types: [
        {
          associationCategory: "HUBSPOT_DEFINED" as never,
          associationTypeId,
        },
      ],
    },
  ];
}

function getScheduledExecutionDate(action: ActionableAction): Date {
  const parsed = new Date(action.suggestedExecutionAt);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  if (action.type === "create_note") {
    return new Date();
  }

  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function getDefaultMeetingWindow(action: ActionableAction) {
  const start = getScheduledExecutionDate(action);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function formatPriority(priority: ActionPriority): string {
  if (priority === "HIGH") return "Alta";
  if (priority === "LOW") return "Baja";
  return "Media";
}

function buildNoteBody(action: ActionableAction): string {
  return [
    action.title,
    action.description,
    `Prioridad sugerida: ${formatPriority(action.priority)}`,
    `Momento sugerido: ${action.suggestedExecutionAt}`,
  ].join("\n\n");
}

async function ensureHubSpotConnection(organizationId: string) {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    throw new HubSpotActionExecutionError(
      "HubSpot no está conectado para esta organización.",
      400,
      true,
    );
  }
}

function toHubSpotError(error: unknown): HubSpotActionExecutionError {
  const err = error as { code?: number; message?: string };

  if (err.code === 429) {
    return new HubSpotActionExecutionError(
      "HubSpot alcanzó el límite de solicitudes.",
      429,
      true,
    );
  }

  if (err.code === 400 || err.code === 403) {
    return new HubSpotActionExecutionError(
      err.message ?? "HubSpot rechazó la solicitud.",
      err.code,
      true,
    );
  }

  return new HubSpotActionExecutionError(
    err.message ?? "No se pudo ejecutar la acción en HubSpot.",
    502,
    true,
  );
}

async function createNote(
  organizationId: string,
  contactId: string,
  action: ActionableAction,
): Promise<{ id: string }> {
  const client = await getHubSpotClientForOrganization(organizationId);
  const scheduledAt = getScheduledExecutionDate(action);

  const response = await client.crm.objects.notes.basicApi.create({
    properties: {
      hs_note_body: buildNoteBody(action),
      hs_timestamp: scheduledAt.toISOString(),
    },
    associations: buildAssociation(contactId, AssociationTypes.noteToContact),
  });

  return { id: response.id };
}

async function createTask(
  organizationId: string,
  contactId: string,
  action: ActionableAction,
): Promise<{ id: string }> {
  const client = await getHubSpotClientForOrganization(organizationId);
  const scheduledAt = getScheduledExecutionDate(action);

  const response = await client.crm.objects.tasks.basicApi.create({
    properties: {
      hs_timestamp: scheduledAt.toISOString(),
      hs_task_subject: action.title,
      hs_task_body: action.description,
      hs_task_status: "NOT_STARTED",
      hs_task_priority: action.priority,
      hs_task_type: "TODO",
    },
    associations: buildAssociation(contactId, AssociationTypes.taskToContact),
  });

  return { id: response.id };
}

async function createMeeting(
  organizationId: string,
  contactId: string,
  action: ActionableAction,
): Promise<{ id: string }> {
  const client = await getHubSpotClientForOrganization(organizationId);
  const { start, end } = getDefaultMeetingWindow(action);

  const response = await client.crm.objects.meetings.basicApi.create({
    properties: {
      hs_timestamp: start,
      hs_meeting_title: action.title,
      hs_meeting_body: action.description,
      hs_internal_meeting_notes: [
        action.description,
        `Prioridad sugerida: ${formatPriority(action.priority)}`,
        `Inicio sugerido: ${action.suggestedExecutionAt}`,
      ].join("\n\n"),
      hs_meeting_start_time: start,
      hs_meeting_end_time: end,
      hs_meeting_outcome: "SCHEDULED",
    },
    associations: buildAssociation(contactId, AssociationTypes.meetingToContact),
  });

  return { id: response.id };
}

const EXECUTORS: Record<
  ActionType,
  (
    organizationId: string,
    contactId: string,
    action: ActionableAction,
  ) => Promise<{ id: string }>
> = {
  create_note: createNote,
  create_task: createTask,
  create_meeting: createMeeting,
};

export async function executeHubSpotAction(
  organizationId: string,
  contactId: string,
  action: ActionableAction,
): Promise<{ id: string }> {
  await ensureHubSpotConnection(organizationId);

  try {
    return await EXECUTORS[action.type](organizationId, contactId, action);
  } catch (error) {
    if (error instanceof HubSpotActionExecutionError) {
      throw error;
    }
    throw toHubSpotError(error);
  }
}
