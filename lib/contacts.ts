import {
  createContact,
  getAllContacts,
  getContactByExternalId,
  getContactById,
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
  getAllHubSpotContacts,
  getHubSpotContactById,
  mapHubSpotContactToOurModel,
  searchAllHubSpotContacts,
  type HubSpotContact,
} from "@/lib/hubspot";

const HUBSPOT_VIRTUAL_ID_PREFIX = "hubspot:";

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
    description: mapped.description ?? existing?.description ?? null,
    additional_data: existing?.additional_data ?? null,
    external_id: hubSpotContact.id,
    source: "hubspot",
    created_at: existing?.created_at ?? createdAt,
    updated_at: updatedAt,
  };
}

async function getHubSpotContactsForList(
  organizationId: string,
  search?: string,
): Promise<HubSpotContact[]> {
  if (search?.trim()) {
    return searchAllHubSpotContacts(organizationId, search.trim());
  }

  return getAllHubSpotContacts(organizationId);
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

export async function getUnifiedContacts(
  filters: GetContactsFilters,
): Promise<PaginatedResponse> {
  const connection = await getHubSpotConnectionByOrganizationId(filters.organizationId);
  if (!connection) {
    return getContacts(filters);
  }

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  const [localContacts, materializedHubSpotContacts, hubSpotContacts] =
    await Promise.all([
      getAllContacts({
        organizationId: filters.organizationId,
        search: filters.search,
        extraConditions: filters.extraConditions,
      }),
      getAllContacts({
        organizationId: filters.organizationId,
        source: "hubspot",
      }),
      getHubSpotContactsForList(filters.organizationId, filters.search),
    ]);

  const materializedHubSpotByExternalId = new Map(
    materializedHubSpotContacts
      .filter((contact) => contact.external_id)
      .map((contact) => [contact.external_id as string, contact]),
  );

  const localOnlyContacts =
    filters.source === "hubspot"
      ? []
      : localContacts.filter((contact) => contact.source !== "hubspot");

  const hubSpotUnifiedContacts = hubSpotContacts.map((hubSpotContact) =>
    mapHubSpotContactToUnifiedContact(
      hubSpotContact,
      filters.organizationId,
      materializedHubSpotByExternalId.get(hubSpotContact.id),
    ),
  );

  const mergedContacts = [...localOnlyContacts, ...hubSpotUnifiedContacts].sort(
    (a, b) => getContactSortTime(b) - getContactSortTime(a),
  );

  const data = mergedContacts.slice(offset, offset + limit);

  return {
    data,
    total: mergedContacts.length,
    page,
    totalPages: Math.ceil(mergedContacts.length / limit),
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
): Promise<Contact> {
  const connection = await getHubSpotConnectionByOrganizationId(organizationId);

  if (!connection) {
    return createContact({
      organization_id: organizationId,
      full_name: input.full_name,
      email: input.email ?? null,
      phone_number: input.phone_number ?? null,
      country: input.country ?? null,
      description: input.description ?? null,
      additional_data: input.additional_data,
      external_id: null,
      source: null,
    });
  }

  const hubSpotContact = await createHubSpotContact(organizationId, {
    full_name: input.full_name,
    email: input.email ?? null,
    phone_number: input.phone_number ?? null,
  });
  const mapped = mapHubSpotContactToOurModel(hubSpotContact, organizationId);

  return upsertContactByExternalId({
    ...buildSyncedContactData(mapped),
    full_name: mapped.full_name ?? input.full_name,
    email: mapped.email ?? input.email ?? null,
    phone_number: mapped.phone_number ?? input.phone_number ?? null,
    country: input.country ?? null,
    description: input.description ?? mapped.description ?? null,
    additional_data: input.additional_data,
  });
}
