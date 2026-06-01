import {
  createContact,
  getContactsByExternalIds,
  getContactsWithoutExternalIds,
  getContactByExternalId,
  getContactById,
  getContactByNormalizedEmail,
  getContactByNormalizedPhoneNumber,
  getContacts,
  updateContact,
  upsertContactByExternalId,
  type GetContactsFilters,
  type PaginatedResponse,
} from "@/db/repository/contacts";
import { getHubSpotConnectionByOrganizationId } from "@/db/repository";
import type { Contact, NewContact } from "@/db/schema";
import {
  createHubSpotContact,
  getHubSpotContactsPage,
  getHubSpotContactById,
  mapHubSpotContactToOurModel,
  searchHubSpotContactsPage,
  type HubSpotContact,
} from "@/lib/hubspot";
import { queueContactSyncTask } from "@/lib/sync-tasks";
import { inferHubSpotLeadClassification } from "@/lib/ai/hubspot-classification";
import {
  findHubSpotDuplicateContact,
  normalizeContactEmail,
  normalizeContactPhone,
} from "@/lib/contact-deduplication";

const HUBSPOT_VIRTUAL_ID_PREFIX = "hubspot:";
const DEFAULT_CONTACT_LIST_LIMIT = 30;

export class DuplicateContactError extends Error {
  readonly code = 409;

  constructor(message = "Ya existe un contacto con ese telefono") {
    super(message);
    this.name = "DuplicateContactError";
  }
}

export interface CreateUnifiedContactResult {
  contact: Contact;
  syncPending: boolean;
  message?: string;
}

function shouldQueueContactSync(error: unknown): boolean {
  const err = error as { code?: number; statusCode?: number; message?: string };
  const code =
    typeof err.code === "number"
      ? err.code
      : typeof err.statusCode === "number"
        ? err.statusCode
        : null;

  if (code === 401 || code === 403 || code === 408 || code === 429) {
    return true;
  }

  if (code !== null && code >= 500) {
    return true;
  }

  const message = err.message?.toLowerCase() ?? "";

  return (
    message.includes("hubspot") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("socket") ||
    message.includes("fetch")
  );
}

type CreateUnifiedContactInput = {
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  description?: string | null;
  additional_data?: NewContact["additional_data"];
};

function parseHubSpotDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getContactSortTime(contact: Contact): number {
  const updated =
    contact.updated_at instanceof Date
      ? contact.updated_at.getTime()
      : new Date(contact.updated_at).getTime();
  const created =
    contact.created_at instanceof Date
      ? contact.created_at.getTime()
      : new Date(contact.created_at).getTime();

  if (!Number.isNaN(updated)) return updated;
  if (!Number.isNaN(created)) return created;
  return 0;
}

function buildSyncedContactData(
  mapped: NewContact,
  existing?: Contact | null,
): NewContact {
  return {
    organization_id: mapped.organization_id,
    external_id: mapped.external_id,
    source: "hubspot",
    full_name: mapped.full_name ?? existing?.full_name ?? null,
    email: mapped.email ?? existing?.email ?? null,
    phone_number: mapped.phone_number ?? existing?.phone_number ?? null,
    country: mapped.country ?? existing?.country ?? null,
    description: mapped.description ?? existing?.description ?? null,
    additional_data: existing?.additional_data ?? null,
    external_lifecycle_stage: mapped.external_lifecycle_stage ?? existing?.external_lifecycle_stage ?? null,
    external_lead_status: mapped.external_lead_status ?? existing?.external_lead_status ?? null,
  };
}

function buildInputContactData(
  organizationId: string,
  input: CreateUnifiedContactInput,
  classification: { lifecycleStage: string; leadStatus: string },
): NewContact {
  return {
    organization_id: organizationId,
    full_name: input.full_name,
    email: normalizeContactEmail(input.email),
    phone_number: input.phone_number?.trim() || null,
    country: input.country ?? null,
    description: input.description ?? null,
    additional_data: input.additional_data,
    external_lifecycle_stage: classification.lifecycleStage,
    external_lead_status: classification.leadStatus,
    external_id: null,
    source: null,
  };
}

function buildHubSpotCreateInput(
  input: CreateUnifiedContactInput,
  classification: { lifecycleStage: string; leadStatus: string },
) {
  return {
    full_name: input.full_name,
    email: normalizeContactEmail(input.email),
    phone_number: input.phone_number?.trim() || null,
    description: input.description ?? null,
    additional_data: input.additional_data,
    lifecycleStage: classification.lifecycleStage,
    leadStatus: classification.leadStatus,
  };
}

async function materializeHubSpotContactFromInput(
  organizationId: string,
  hubSpotContact: HubSpotContact,
  input: CreateUnifiedContactInput,
  existing?: Contact | null,
): Promise<Contact> {
  const mapped = mapHubSpotContactToOurModel(hubSpotContact, organizationId);

  return upsertContactByExternalId({
    ...buildSyncedContactData(mapped, existing),
    full_name: mapped.full_name ?? input.full_name,
    email: normalizeContactEmail(mapped.email) ?? normalizeContactEmail(input.email),
    phone_number: mapped.phone_number ?? input.phone_number?.trim() ?? null,
    country: existing?.country ?? input.country ?? null,
    description: existing?.description ?? input.description ?? mapped.description ?? null,
    additional_data: existing?.additional_data ?? input.additional_data ?? null,
  });
}

async function createLocalContactWithPendingSync(params: {
  organizationId: string;
  input: CreateUnifiedContactInput;
  classification: { lifecycleStage: string; leadStatus: string };
  message: string;
}): Promise<CreateUnifiedContactResult> {
  const contact = await createContact(
    buildInputContactData(
      params.organizationId,
      params.input,
      params.classification,
    ),
  );

  await queueContactSyncTask({
    organizationId: params.organizationId,
    contact,
    input: {
      full_name: params.input.full_name,
      email: normalizeContactEmail(params.input.email),
      phone_number: params.input.phone_number?.trim() || null,
      country: params.input.country ?? null,
      description: params.input.description ?? null,
      additional_data: params.input.additional_data,
    },
    message: params.message,
  });

  return {
    contact,
    syncPending: true,
    message: "El contacto se guardó localmente y quedó pendiente de sincronización con HubSpot.",
  };
}

function mapHubSpotContactToUnifiedContact(
  hubSpotContact: HubSpotContact,
  organizationId: string,
  existing?: Contact | null,
): Contact {
  const mapped = mapHubSpotContactToOurModel(hubSpotContact, organizationId);
  const createdAt = parseHubSpotDate(hubSpotContact.properties.createdate) ?? new Date();
  const updatedAt =
    parseHubSpotDate(hubSpotContact.properties.lastmodifieddate) ?? createdAt;

  return {
    id: existing?.id ?? toHubSpotVirtualContactId(hubSpotContact.id),
    organization_id: organizationId,
    full_name: mapped.full_name ?? existing?.full_name ?? null,
    email: mapped.email ?? existing?.email ?? null,
    phone_number: mapped.phone_number ?? existing?.phone_number ?? null,
    country: mapped.country ?? existing?.country ?? null,
    description: existing?.description ?? mapped.description ?? null,
    additional_data: existing?.additional_data ?? null,
    external_id: hubSpotContact.id,
    source: "hubspot",
    created_at: existing?.created_at ?? createdAt,
    updated_at: updatedAt,
    external_lifecycle_stage: mapped.external_lifecycle_stage ?? existing?.external_lifecycle_stage ?? null,
    external_lead_status: mapped.external_lead_status ?? existing?.external_lead_status ?? null,
  };
}

async function getHubSpotContactsPageForList(
  organizationId: string,
  options: {
    search?: string;
    limit: number;
    after?: string;
    lifecycleStage?: string;
    leadStatus?: string;
  },
) {
  const after = options.after?.trim() || undefined;
  const hasHubSpotFilters = Boolean(options.lifecycleStage || options.leadStatus);

  if (options.search?.trim() || hasHubSpotFilters) {
    return searchHubSpotContactsPage(organizationId, options.search?.trim() ?? "", {
      limit: options.limit,
      after,
      lifecycleStage: options.lifecycleStage,
      leadStatus: options.leadStatus,
    });
  }

  return getHubSpotContactsPage(organizationId, {
    limit: options.limit,
    after,
  });
}

export function toHubSpotVirtualContactId(externalId: string): string {
  return `${HUBSPOT_VIRTUAL_ID_PREFIX}${externalId}`;
}

export function isHubSpotVirtualContactId(contactId: string): boolean {
  return contactId.startsWith(HUBSPOT_VIRTUAL_ID_PREFIX);
}

export function getHubSpotExternalIdFromContactId(
  contactId: string,
): string | null {
  if (!isHubSpotVirtualContactId(contactId)) {
    return null;
  }

  const externalId = contactId.slice(HUBSPOT_VIRTUAL_ID_PREFIX.length);
  return externalId || null;
}

export function getHubSpotExternalIdFromContact(
  contact: Pick<Contact, "external_id" | "source"> | null,
): string | null {
  if (contact?.source !== "hubspot") {
    return null;
  }

  return contact.external_id ?? null;
}

export async function resolveHubSpotExternalIdForContactIdentifier(
  contactId: string,
  organizationId: string,
  getContact: (
    id: string,
    orgId: string,
  ) => Promise<Pick<Contact, "external_id" | "source"> | null> = getContactById,
): Promise<string | null> {
  const virtualExternalId = getHubSpotExternalIdFromContactId(contactId);
  if (virtualExternalId) {
    return virtualExternalId;
  }

  const contact = await getContact(contactId, organizationId);
  return getHubSpotExternalIdFromContact(contact);
}

export async function getUnifiedContacts(
  filters: GetContactsFilters,
): Promise<PaginatedResponse> {
  const connection = await getHubSpotConnectionByOrganizationId(filters.organizationId);
  if (!connection) {
    return getContacts(filters);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? DEFAULT_CONTACT_LIST_LIMIT;
  const hubSpotPage = await getHubSpotContactsPageForList(filters.organizationId, {
    search: filters.search,
    limit,
    after: filters.after,
    lifecycleStage: filters.lifecycleStage,
    leadStatus: filters.leadStatus,
  });
  const hubSpotExternalIds = hubSpotPage.results.map((contact) => contact.id);

  const [materializedHubSpotContacts, pendingLocalContacts] = await Promise.all([
    getContactsByExternalIds(hubSpotExternalIds, filters.organizationId),
    filters.source === "hubspot" || filters.after || page > 1
      ? Promise.resolve([])
      : getContactsWithoutExternalIds(filters.organizationId, {
          limit,
          search: filters.search,
          lifecycleStage: filters.lifecycleStage,
          leadStatus: filters.leadStatus,
        }),
  ]);

  const materializedHubSpotByExternalId = new Map(
    materializedHubSpotContacts
      .filter((contact) => contact.external_id)
      .map((contact) => [contact.external_id as string, contact]),
  );

  const hubSpotUnifiedContacts = hubSpotPage.results.map((hubSpotContact) =>
    mapHubSpotContactToUnifiedContact(
      hubSpotContact,
      filters.organizationId,
      materializedHubSpotByExternalId.get(hubSpotContact.id),
    ),
  );

  const mergedContacts = [...pendingLocalContacts, ...hubSpotUnifiedContacts].sort(
    (a, b) => getContactSortTime(b) - getContactSortTime(a),
  );
  const total = (hubSpotPage.total ?? hubSpotUnifiedContacts.length) +
    pendingLocalContacts.length;
  const hasNextPage = Boolean(hubSpotPage.nextAfter);

  return {
    data: mergedContacts,
    total,
    page,
    totalPages: hasNextPage
      ? Math.max(page + 1, Math.ceil(total / limit))
      : Math.max(1, Math.ceil(total / limit)),
    hasNextPage,
    nextAfter: hubSpotPage.nextAfter,
    totalIsApproximate: hubSpotPage.total === undefined,
  };
}

export async function getUnifiedContactById(
  contactId: string,
  organizationId: string,
): Promise<Contact | null> {
  const externalId = getHubSpotExternalIdFromContactId(contactId);

  if (externalId) {
    const existing = await getContactByExternalId(externalId, organizationId);
    const connection = await getHubSpotConnectionByOrganizationId(organizationId);
    if (!connection) {
      return existing;
    }

    const hubSpotContact = await getHubSpotContactById(organizationId, externalId);

    return mapHubSpotContactToUnifiedContact(
      hubSpotContact,
      organizationId,
      existing,
    );
  }

  const localContact = await getContactById(contactId, organizationId);
  if (!localContact) {
    return null;
  }

  if (localContact.source === "hubspot" && localContact.external_id) {
    const connection = await getHubSpotConnectionByOrganizationId(organizationId);
    if (!connection) {
      return localContact;
    }

    try {
      const hubSpotContact = await getHubSpotContactById(
        organizationId,
        localContact.external_id,
      );
      return mapHubSpotContactToUnifiedContact(
        hubSpotContact,
        organizationId,
        localContact,
      );
    } catch {
      return localContact;
    }
  }

  return localContact;
}

export async function getLocalMaterializedContactByIdentifier(
  contactId: string,
  organizationId: string,
): Promise<Contact | null> {
  const externalId = getHubSpotExternalIdFromContactId(contactId);

  if (externalId) {
    return getContactByExternalId(externalId, organizationId);
  }

  return getContactById(contactId, organizationId);
}

export async function ensureLocalContactForActionables(
  contactId: string,
  organizationId: string,
): Promise<Contact | null> {
  const externalId = getHubSpotExternalIdFromContactId(contactId);

  if (!externalId) {
    return getContactById(contactId, organizationId);
  }

  const existing = await getContactByExternalId(externalId, organizationId);
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  if (!connection) {
    return existing;
  }

  const hubSpotContact = await getHubSpotContactById(organizationId, externalId);
  const mapped = mapHubSpotContactToOurModel(hubSpotContact, organizationId);

  if (existing) {
    return updateContact(
      existing.id,
      organizationId,
      buildSyncedContactData(mapped, existing),
    );
  }

  return upsertContactByExternalId(mapped);
}

export async function createUnifiedContact(
  organizationId: string,
  input: CreateUnifiedContactInput,
): Promise<CreateUnifiedContactResult> {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);
  const normalizedEmail = normalizeContactEmail(input.email);
  const normalizedPhone = normalizeContactPhone(input.phone_number);

  if (normalizedEmail) {
    const existing = await getContactByNormalizedEmail(
      normalizedEmail,
      organizationId,
    );
    if (existing) {
      throw new DuplicateContactError("Ya existe un contacto con ese email");
    }
  } else if (normalizedPhone) {
    const existing = await getContactByNormalizedPhoneNumber(
      normalizedPhone,
      organizationId,
    );

    if (existing) {
      throw new DuplicateContactError();
    }
  }

  // Infer HubSpot lifecycle/lead classification always, regardless of connection status
  const classification = await inferHubSpotLeadClassification({
    description: input.description ?? null,
    additional_data: input.additional_data,
  });

  if (!connection) {
    return createLocalContactWithPendingSync({
      organizationId,
      input,
      classification,
      message: "HubSpot no está conectado para esta organización.",
    });
  }

  const duplicateSearch = await findHubSpotDuplicateContact(
    organizationId,
    input,
  );

  if (duplicateSearch.status === "match") {
    const contact = await materializeHubSpotContactFromInput(
      organizationId,
      duplicateSearch.contact,
      input,
    );

    return {
      contact,
      syncPending: false,
      message: "El contacto ya existía en HubSpot y quedó vinculado localmente.",
    };
  }

  if (duplicateSearch.status === "unverified") {
    const message =
      duplicateSearch.error instanceof Error
        ? duplicateSearch.error.message
        : "No se pudo verificar si el contacto ya existe en HubSpot.";

    return createLocalContactWithPendingSync({
      organizationId,
      input,
      classification,
      message,
    });
  }

  try {
    const hubSpotContact = await createHubSpotContact(
      organizationId,
      buildHubSpotCreateInput(input, classification),
    );
    const contact = await materializeHubSpotContactFromInput(
      organizationId,
      hubSpotContact,
      input,
    );

    return { contact, syncPending: false };
  } catch (error) {
    if (!shouldQueueContactSync(error)) {
      throw error;
    }

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el contacto en HubSpot.";

    return createLocalContactWithPendingSync({
      organizationId,
      input,
      classification,
      message,
    });
  }
}
