import type { Client } from "@hubspot/api-client";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import { resolveHubSpotExternalIdForContactIdentifier } from "@/lib/contacts";
import { getHubSpotClientForOrganization } from "./client";

const HUBSPOT_NOTE_PROPERTIES = ["hs_note_body", "hs_timestamp"];
const HUBSPOT_TASK_PROPERTIES = [
  "hs_task_subject",
  "hs_task_body",
  "hs_timestamp",
  "hs_task_status",
  "hs_task_priority",
];
const MAX_BATCH_SIZE = 100;

export interface HubSpotNoteSummary {
  id: string;
  body: string;
  createdAt: string | null;
}

export interface HubSpotTaskSummary {
  id: string;
  title: string;
  body: string;
  dueAt: string | null;
  status: string | null;
  priority: string | null;
}

export interface HubSpotContactActivity {
  hasHubSpotContact: boolean;
  notes: HubSpotNoteSummary[];
  tasks: HubSpotTaskSummary[];
  error: string | null;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

function stripHtml(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getAssociationIds(
  associations: Record<string, { results?: Array<{ id: string }> }> | undefined,
  key: string,
): string[] {
  return associations?.[key]?.results?.map((item) => item.id).filter(Boolean) ?? [];
}

function formatHubSpotError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "No se pudo cargar la actividad de HubSpot.";

  if (message.toLowerCase().includes("rate")) {
    return "HubSpot alcanzó su límite temporal. Reintenta en unos segundos.";
  }

  return "No se pudo cargar la actividad de HubSpot.";
}

async function readNotes(client: Client, ids: string[]): Promise<HubSpotNoteSummary[]> {
  if (ids.length === 0) return [];

  const batches = await Promise.all(
    chunk(ids, MAX_BATCH_SIZE).map((batch) =>
      client.crm.objects.notes.batchApi.read({
        properties: HUBSPOT_NOTE_PROPERTIES,
        propertiesWithHistory: [],
        inputs: batch.map((id) => ({ id })),
      }),
    ),
  );

  return batches
    .flatMap((batch) => batch.results)
    .map((item) => ({
      id: item.id,
      body: stripHtml(item.properties.hs_note_body) || "Nota sin contenido.",
      createdAt: toIsoDate(item.properties.hs_timestamp) ?? item.createdAt.toISOString(),
    }))
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

async function readTasks(client: Client, ids: string[]): Promise<HubSpotTaskSummary[]> {
  if (ids.length === 0) return [];

  const batches = await Promise.all(
    chunk(ids, MAX_BATCH_SIZE).map((batch) =>
      client.crm.objects.tasks.batchApi.read({
        properties: HUBSPOT_TASK_PROPERTIES,
        propertiesWithHistory: [],
        inputs: batch.map((id) => ({ id })),
      }),
    ),
  );

  return batches
    .flatMap((batch) => batch.results)
    .map((item) => ({
      id: item.id,
      title: item.properties.hs_task_subject?.trim() || "Tarea sin asunto",
      body: stripHtml(item.properties.hs_task_body),
      dueAt: toIsoDate(item.properties.hs_timestamp) ?? item.createdAt.toISOString(),
      status: item.properties.hs_task_status,
      priority: item.properties.hs_task_priority,
    }))
    .sort((left, right) => {
      const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : 0;
      const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : 0;
      return rightTime - leftTime;
    });
}

export async function getHubSpotContactActivity(
  contactIdentifier: string,
  organizationId: string,
): Promise<HubSpotContactActivity> {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    return {
      hasHubSpotContact: false,
      notes: [],
      tasks: [],
      error: null,
    };
  }

  const externalId = await resolveHubSpotExternalIdForContactIdentifier(
    contactIdentifier,
    organizationId,
  );

  if (!externalId) {
    return {
      hasHubSpotContact: false,
      notes: [],
      tasks: [],
      error: null,
    };
  }

  try {
    const client = await getHubSpotClientForOrganization(organizationId);
    const contact = await client.crm.contacts.basicApi.getById(
      externalId,
      [],
      [],
      ["notes", "tasks"],
    );

    const noteIds = getAssociationIds(contact.associations, "notes");
    const taskIds = getAssociationIds(contact.associations, "tasks");
    const [notes, tasks] = await Promise.all([
      readNotes(client, noteIds),
      readTasks(client, taskIds),
    ]);

    return {
      hasHubSpotContact: true,
      notes,
      tasks,
      error: null,
    };
  } catch (error) {
    return {
      hasHubSpotContact: true,
      notes: [],
      tasks: [],
      error: formatHubSpotError(error),
    };
  }
}
