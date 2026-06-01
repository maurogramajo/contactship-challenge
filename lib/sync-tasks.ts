import {
  completeOpenSyncTasksForResource,
  createSyncTask,
  getActionableById,
  getContactById,
  getHubSpotConnectionByOrganizationId,
  getLatestOpenSyncTaskForResource,
  getOldestPendingSyncTask,
  updateActionableActions,
  updateContact,
  updateSyncTask,
} from "@/db/repository";
import type { Contact, SyncTask } from "@/db/schema";
import type { ActionableAction } from "@/db/zod/actionable";
import type { SyncTaskType } from "@/db/zod/sync-task";
import type { StoredContactActionable } from "@/lib/actionables";
import {
  createHubSpotContact,
  executeHubSpotAction,
  HubSpotActionExecutionError,
  mapHubSpotContactToOurModel,
} from "@/lib/hubspot";
import { testConnection } from "@/lib/hubspot/test-connection";
import {
  findHubSpotDuplicateContact,
  normalizeContactEmail,
} from "@/lib/contact-deduplication";

const MAX_SYNC_TASK_RETRIES = 5;
const HUBSPOT_VIRTUAL_ID_PREFIX = "hubspot:";

type CreateContactPayload = {
  contactId: string;
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  description?: string | null;
  additional_data?: Contact["additional_data"];
};

function buildPendingAction(
  action: ActionableAction,
  message: string,
  retryCount = action.retryCount ?? 0,
): ActionableAction {
  return {
    ...action,
    status: "pending",
    lastError: message,
    retryCount,
  };
}

function buildExecutedAction(
  action: ActionableAction,
  externalId: string,
): ActionableAction {
  return {
    ...action,
    status: "executed",
    executedAt: new Date().toISOString(),
    externalId,
    lastError: undefined,
  };
}

function getPayloadContactId(payload: Record<string, unknown>): string | null {
  return typeof payload.contactId === "string" ? payload.contactId : null;
}

function getPayloadString(
  payload: Record<string, unknown>,
  key: keyof CreateContactPayload,
): string | null | undefined {
  const value = payload[key];
  return typeof value === "string" ? value : value === null ? null : undefined;
}

function getHubSpotExternalIdFromContactId(contactId: string): string | null {
  if (!contactId.startsWith(HUBSPOT_VIRTUAL_ID_PREFIX)) {
    return null;
  }

  const externalId = contactId.slice(HUBSPOT_VIRTUAL_ID_PREFIX.length);
  return externalId || null;
}

async function resolveExternalContactId(
  contactId: string,
  organizationId: string,
): Promise<string | null> {
  const virtualExternalId = getHubSpotExternalIdFromContactId(contactId);
  if (virtualExternalId) {
    return virtualExternalId;
  }

  const contact = await getContactById(contactId, organizationId);
  if (contact?.source !== "hubspot") {
    return null;
  }

  return contact.external_id ?? null;
}

async function ensurePendingSyncTask(input: {
  organizationId: string;
  contactId?: string | null;
  actionableId?: string | null;
  actionId?: string | null;
  type: SyncTaskType;
  payload: Record<string, unknown>;
  lastError: string;
}) {
  const existing = await getLatestOpenSyncTaskForResource({
    organizationId: input.organizationId,
    contactId: input.contactId,
    actionableId: input.actionableId,
    actionId: input.actionId,
    type: input.type,
  });

  if (existing) {
    return updateSyncTask(existing.id, {
      status: "pending",
      payload: input.payload,
      last_error: input.lastError,
      retry_count: existing.status === "failed" ? 0 : existing.retry_count,
      executed_at: null,
    });
  }

  return createSyncTask({
    organization_id: input.organizationId,
    contact_id: input.contactId ?? null,
    actionable_id: input.actionableId ?? null,
    action_id: input.actionId ?? null,
    type: input.type,
    status: "pending",
    payload: input.payload,
    retry_count: 0,
    last_error: input.lastError,
  });
}

async function markActionSyncFailure(params: {
  task: SyncTask;
  actionable: StoredContactActionable;
  action: ActionableAction;
  message: string;
}) {
  const nextRetryCount = params.task.retry_count + 1;
  const status = nextRetryCount >= MAX_SYNC_TASK_RETRIES ? "failed" : "pending";

  await updateSyncTask(params.task.id, {
    status,
    retry_count: nextRetryCount,
    last_error: params.message,
  });

  const nextActions = params.actionable.actions.map((item) =>
    item.id === params.action.id
      ? buildPendingAction(item, params.message, nextRetryCount)
      : item,
  );

  await updateActionableActions(
    params.actionable.id,
    params.task.organization_id,
    nextActions,
  );
}

async function markContactSyncFailure(task: SyncTask, message: string) {
  const nextRetryCount = task.retry_count + 1;
  const status = nextRetryCount >= MAX_SYNC_TASK_RETRIES ? "failed" : "pending";

  await updateSyncTask(task.id, {
    status,
    retry_count: nextRetryCount,
    last_error: message,
  });
}

export async function isHubSpotAvailable(
  organizationId: string,
): Promise<boolean> {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    return false;
  }

  const result = await testConnection(organizationId);
  return result.success;
}

export async function queueActionSyncTask(params: {
  organizationId: string;
  actionable: StoredContactActionable;
  action: ActionableAction;
  message: string;
}): Promise<StoredContactActionable> {
  const nextActions = params.actionable.actions.map((item) =>
    item.id === params.action.id ? buildPendingAction(item, params.message) : item,
  );

  const updated = await updateActionableActions(
    params.actionable.id,
    params.organizationId,
    nextActions,
  );

  await ensurePendingSyncTask({
    organizationId: params.organizationId,
    contactId: params.actionable.contact_id ?? null,
    actionableId: params.actionable.id,
    actionId: params.action.id,
    type: params.action.type,
    payload: {
      contactId: params.actionable.contact_id,
      actionableId: params.actionable.id,
      actionId: params.action.id,
    },
    lastError: params.message,
  });

  return updated ?? { ...params.actionable, actions: nextActions };
}

export async function markActionSyncCompleted(params: {
  organizationId: string;
  actionable: StoredContactActionable;
  action: ActionableAction;
  externalId: string;
}): Promise<StoredContactActionable> {
  const nextActions = params.actionable.actions.map((item) =>
    item.id === params.action.id
      ? buildExecutedAction(item, params.externalId)
      : item,
  );

  const updated = await updateActionableActions(
    params.actionable.id,
    params.organizationId,
    nextActions,
  );

  await completeOpenSyncTasksForResource({
    organizationId: params.organizationId,
    contactId: params.actionable.contact_id ?? null,
    actionableId: params.actionable.id,
    actionId: params.action.id,
    type: params.action.type,
  });

  return updated ?? { ...params.actionable, actions: nextActions };
}

export async function queueContactSyncTask(params: {
  organizationId: string;
  contact: Contact;
  input: Omit<CreateContactPayload, "contactId">;
  message: string;
}) {
  await ensurePendingSyncTask({
    organizationId: params.organizationId,
    contactId: params.contact.id,
    actionableId: null,
    actionId: null,
    type: "create_contact",
    payload: {
      contactId: params.contact.id,
      full_name: params.input.full_name,
      email: params.input.email ?? null,
      phone_number: params.input.phone_number ?? null,
      country: params.input.country ?? null,
      description: params.input.description ?? null,
      additional_data: params.input.additional_data ?? null,
    },
    lastError: params.message,
  });
}

async function processCreateContactSyncTask(task: SyncTask) {
  const contactId = task.contact_id ?? getPayloadContactId(task.payload);
  if (!contactId) {
    await markContactSyncFailure(
      task,
      "La tarea de sincronización no tiene un contacto local asociado.",
    );
    return { status: "failed" as const, reason: "missing_contact_id" };
  }

  const contact = await getContactById(contactId, task.organization_id);
  if (!contact) {
    await markContactSyncFailure(
      task,
      "El contacto local ya no existe para sincronizar con HubSpot.",
    );
    return { status: "failed" as const, reason: "contact_not_found" };
  }

  if (contact.source === "hubspot" && contact.external_id) {
    await updateSyncTask(task.id, {
      status: "completed",
      executed_at: new Date(),
      last_error: null,
    });
    return { status: "completed" as const, taskId: task.id };
  }

  const fullName = getPayloadString(task.payload, "full_name") ?? contact.full_name;
  if (!fullName) {
    await markContactSyncFailure(
      task,
      "No se pudo sincronizar el contacto porque no tiene nombre.",
    );
    return { status: "failed" as const, reason: "missing_full_name" };
  }

  try {
    const email = normalizeContactEmail(
      getPayloadString(task.payload, "email") ?? contact.email,
    );
    const phoneNumber =
      getPayloadString(task.payload, "phone_number") ?? contact.phone_number;
    const description =
      getPayloadString(task.payload, "description") ?? contact.description;
    const additionalData =
      (task.payload.additional_data as Contact["additional_data"] | null | undefined) ??
      contact.additional_data;
    const duplicateSearch = await findHubSpotDuplicateContact(
      task.organization_id,
      {
        full_name: fullName,
        email,
        phone_number: phoneNumber,
      },
    );

    if (duplicateSearch.status === "unverified") {
      const message =
        duplicateSearch.error instanceof Error
          ? duplicateSearch.error.message
          : "No se pudo verificar si el contacto ya existe en HubSpot.";
      await markContactSyncFailure(task, message);
      return { status: "failed" as const, reason: message };
    }

    if (duplicateSearch.status === "match") {
      const mapped = mapHubSpotContactToOurModel(
        duplicateSearch.contact,
        task.organization_id,
      );

      await updateContact(contact.id, task.organization_id, {
        full_name: mapped.full_name ?? contact.full_name,
        email: normalizeContactEmail(mapped.email) ?? email,
        phone_number: mapped.phone_number ?? contact.phone_number,
        country: contact.country,
        description: contact.description ?? mapped.description,
        additional_data: contact.additional_data,
        external_lifecycle_stage:
          mapped.external_lifecycle_stage ?? contact.external_lifecycle_stage,
        external_lead_status:
          mapped.external_lead_status ?? contact.external_lead_status,
        external_id: duplicateSearch.contact.id,
        source: "hubspot",
      });
      await updateSyncTask(task.id, {
        status: "completed",
        executed_at: new Date(),
        last_error: null,
      });

      return { status: "completed" as const, taskId: task.id };
    }

    const hubSpotContact = await createHubSpotContact(task.organization_id, {
      full_name: fullName,
      email,
      phone_number: phoneNumber,
      description,
      additional_data: additionalData,
      lifecycleStage: contact.external_lifecycle_stage,
      leadStatus: contact.external_lead_status,
    });

    await updateContact(contact.id, task.organization_id, {
      external_id: hubSpotContact.id,
      source: "hubspot",
    });
    await updateSyncTask(task.id, {
      status: "completed",
      executed_at: new Date(),
      last_error: null,
    });

    return { status: "completed" as const, taskId: task.id };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el contacto en HubSpot.";
    await markContactSyncFailure(task, message);
    return { status: "failed" as const, reason: message };
  }
}

async function processActionSyncTask(task: SyncTask) {
  if (!task.actionable_id || !task.action_id) {
    await markContactSyncFailure(
      task,
      "La tarea de sincronización no tiene actionable o action asociados.",
    );
    return { status: "failed" as const, reason: "missing_action_reference" };
  }

  const actionable = await getActionableById(task.actionable_id, task.organization_id);
  if (!actionable) {
    await markContactSyncFailure(
      task,
      "El actionable original ya no existe para sincronizar la acción.",
    );
    return { status: "failed" as const, reason: "actionable_not_found" };
  }

  const action = actionable.actions.find((item) => item.id === task.action_id);
  if (!action) {
    await markContactSyncFailure(
      task,
      "La acción original ya no existe para sincronizar con HubSpot.",
    );
    return { status: "failed" as const, reason: "action_not_found" };
  }

  if (action.status === "executed" && action.externalId) {
    await completeOpenSyncTasksForResource({
      organizationId: task.organization_id,
      contactId: actionable.contact_id ?? null,
      actionableId: actionable.id,
      actionId: action.id,
      type: task.type,
    });
    return { status: "completed" as const, taskId: task.id };
  }

  const contactId = actionable.contact_id ?? getPayloadContactId(task.payload);
  if (!contactId) {
    await markActionSyncFailure({
      task,
      actionable,
      action,
      message: "La acción no tiene un contacto local asociado.",
    });
    return { status: "failed" as const, reason: "missing_contact" };
  }

  const externalId = await resolveExternalContactId(
    contactId,
    task.organization_id,
  );

  if (!externalId) {
    await markActionSyncFailure({
      task,
      actionable,
      action,
      message: "El contacto todavía no tiene un ID externo de HubSpot.",
    });
    return { status: "failed" as const, reason: "missing_external_id" };
  }

  try {
    const result = await executeHubSpotAction(task.organization_id, externalId, action);

    await markActionSyncCompleted({
      organizationId: task.organization_id,
      actionable,
      action,
      externalId: result.id,
    });

    return { status: "completed" as const, taskId: task.id };
  } catch (error) {
    const message =
      error instanceof HubSpotActionExecutionError
        ? error.message
        : "No se pudo sincronizar la acción con HubSpot.";

    await markActionSyncFailure({
      task,
      actionable,
      action,
      message,
    });

    return { status: "failed" as const, reason: message };
  }
}

export async function processNextPendingSyncTask() {
  const task = await getOldestPendingSyncTask();
  if (!task) {
    return { status: "idle" as const };
  }

  const available = await isHubSpotAvailable(task.organization_id);
  if (!available) {
    return {
      status: "hubspot_unavailable" as const,
      organizationId: task.organization_id,
      taskId: task.id,
    };
  }

  if (task.type === "create_contact") {
    return processCreateContactSyncTask(task);
  }

  return processActionSyncTask(task);
}
