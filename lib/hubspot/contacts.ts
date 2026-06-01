import type { Client } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter";
import type { Filter } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter";
import type { PublicObjectSearchRequest } from "@hubspot/api-client/lib/codegen/crm/contacts/models/PublicObjectSearchRequest";
import { getHubSpotClientForOrganization, sleep } from "./client";
import type { NewContact } from "@/db/schema/contacts";
import { inferHubSpotLeadClassification } from "@/lib/ai/hubspot-classification";

// ── Types ──────────────────────────────────────────────────────────────────

/** Minimal HubSpot contact shape — only the fields we consume. */
export type HubSpotContact = {
  id: string;
  properties: Record<string, string | null>;
};

/** Shape returned by HubSpot's basicApi.getPage. */
type HubSpotGetPageResponse = {
  results: HubSpotContact[];
  total?: number;
  paging?: {
    next?: {
      after: string;
    };
  };
};

// ── Constants ──────────────────────────────────────────────────────────────

const CONTACT_PROPERTIES = [
  "firstname",
  "lastname",
  "email",
  "phone",
  "mobilephone",
  "company",
  "lifecyclestage",
  "hs_lead_status",
  "createdate",
  "lastmodifieddate",
];

type CreateHubSpotContactInput = {
  full_name: string;
  email?: string | null;
  phone_number?: string | null;
  description?: string | null;
  additional_data?: NewContact["additional_data"];
  lifecycleStage?: string | null;
  leadStatus?: string | null;
};

type HubSpotContactPageOptions = {
  limit?: number;
  after?: string | null;
  lifecycleStage?: string | null;
  leadStatus?: string | null;
};

export type HubSpotContactPage = {
  results: HubSpotContact[];
  total?: number;
  nextAfter?: string;
};

type HubSpotSearchRequest = PublicObjectSearchRequest & {
  limit: number;
  properties: string[];
  sorts: string[];
};

type HubSpotSearchFilter = Pick<Filter, "propertyName" | "operator" | "value">;

// ── Retry helper ───────────────────────────────────────────────────────────

/**
 * Wraps an API call with exponential-backoff retry on 429 rate limits.
 *
 * Attempts: 1 initial + 3 retries (4 total).
 * Delays:   1s, 2s, 4s.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt >= maxRetries) throw error;

      const err = error as { code?: number };
      if (err.code === 429) {
        const delay = Math.pow(2, attempt) * 1000; // 1s → 2s → 4s
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }
  // Unreachable — satisfies TS exhaustiveness check
  throw new Error("withRetry: unreachable");
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetch a single page of HubSpot contacts.
 *
 * @param limit  Page size (default 100, max 100).
 * @param after  Cursor for the next page (omit for first page).
 */
export async function getHubSpotContacts(
  client: Client,
  limit = 100,
  after?: string,
): Promise<HubSpotGetPageResponse> {
  return withRetry(async () => {
    const response = await client.crm.contacts.basicApi.getPage(
      limit,
      after,
      CONTACT_PROPERTIES,
    );

    return response as unknown as HubSpotGetPageResponse;
  });
}

export async function searchHubSpotContacts(
  client: Client,
  query: string,
  limit = 100,
  after?: string,
  filters: Pick<HubSpotContactPageOptions, "lifecycleStage" | "leadStatus"> = {},
): Promise<HubSpotGetPageResponse> {
  return withRetry(async () => {
    const response = await client.crm.contacts.searchApi.doSearch(
      buildContactSearchRequest(query, limit, after, filters),
    );

    return response as unknown as HubSpotGetPageResponse;
  });
}

function clampHubSpotPageLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return 30;
  return Math.min(Math.max(Math.trunc(limit ?? 30), 1), 100);
}

function toHubSpotContactPage(page: HubSpotGetPageResponse): HubSpotContactPage {
  return {
    results: page.results,
    total: page.total,
    nextAfter: page.paging?.next?.after,
  };
}

export function isPhoneLikeHubSpotSearch(query: string): boolean {
  const trimmed = query.trim();
  const digits = trimmed.replace(/\D/g, "");

  return digits.length >= 4 && !/[a-zA-Z@]/.test(trimmed);
}

export function buildHubSpotPhoneSearchTokens(query: string): string[] {
  const digits = query.replace(/\D/g, "");
  if (digits.length < 4) {
    return [];
  }

  const candidates = [
    digits,
    digits.length > 10 ? digits.slice(-10) : null,
    digits.length > 8 ? digits.slice(-8) : null,
  ];

  return Array.from(new Set(candidates.filter(Boolean) as string[]));
}

function buildPhoneSearchFilterGroups(
  query: string,
  baseFilters: HubSpotSearchFilter[],
): NonNullable<HubSpotSearchRequest["filterGroups"]> {
  const filters = buildHubSpotPhoneSearchTokens(query).flatMap((token) =>
    ["phone", "mobilephone"].map((propertyName) => ({
      filters: [
        {
          propertyName,
          operator: FilterOperatorEnum.ContainsToken,
          value: `*${token}*`,
        },
        ...baseFilters,
      ],
    })),
  );

  return filters.slice(0, 5);
}

function buildContactSearchRequest(
  query: string,
  limit: number,
  after?: string | null,
  filters: Pick<HubSpotContactPageOptions, "lifecycleStage" | "leadStatus"> = {},
): HubSpotSearchRequest {
  const trimmedQuery = query.trim();
  const baseFilters = buildHubSpotListBaseFilters(filters);
  const request: HubSpotSearchRequest = {
    limit: clampHubSpotPageLimit(limit),
    properties: CONTACT_PROPERTIES,
    sorts: ["-lastmodifieddate"],
  };

  if (after) {
    request.after = after;
  }

  if (trimmedQuery && isPhoneLikeHubSpotSearch(trimmedQuery)) {
    const filterGroups = buildPhoneSearchFilterGroups(trimmedQuery, baseFilters);
    if (filterGroups.length > 0) {
      request.filterGroups = filterGroups;
      return request;
    }
  }

  if (trimmedQuery) {
    request.query = trimmedQuery;
  }

  if (baseFilters.length > 0) {
    request.filterGroups = [{ filters: baseFilters }];
  }

  return request;
}

function buildHubSpotListBaseFilters(
  filters: Pick<HubSpotContactPageOptions, "lifecycleStage" | "leadStatus">,
): HubSpotSearchFilter[] {
  const baseFilters: HubSpotSearchFilter[] = [];

  if (filters.lifecycleStage) {
    baseFilters.push({
      propertyName: "lifecyclestage",
      operator: FilterOperatorEnum.Eq,
      value: filters.lifecycleStage,
    });
  }

  if (filters.leadStatus) {
    baseFilters.push({
      propertyName: "hs_lead_status",
      operator: FilterOperatorEnum.Eq,
      value: filters.leadStatus,
    });
  }

  return baseFilters;
}

export async function getHubSpotContactsPage(
  organizationId: string,
  options: HubSpotContactPageOptions = {},
): Promise<HubSpotContactPage> {
  const client = await getHubSpotClientForOrganization(organizationId);
  const page = await getHubSpotContacts(
    client,
    clampHubSpotPageLimit(options.limit),
    options.after ?? undefined,
  );

  return toHubSpotContactPage(page);
}

export async function searchHubSpotContactsPage(
  organizationId: string,
  query: string,
  options: HubSpotContactPageOptions = {},
): Promise<HubSpotContactPage> {
  const client = await getHubSpotClientForOrganization(organizationId);
  const page = await searchHubSpotContacts(
    client,
    query,
    clampHubSpotPageLimit(options.limit),
    options.after ?? undefined,
    {
      lifecycleStage: options.lifecycleStage,
      leadStatus: options.leadStatus,
    },
  );

  return toHubSpotContactPage(page);
}

/**
 * Fetch **every** HubSpot contact by iterating through all pages.
 *
 * 100ms delay between pages to stay within rate limits.
 * Each page request is already retried on 429.
 */
export async function getAllHubSpotContacts(
  organizationId: string,
): Promise<HubSpotContact[]> {
  const allContacts: HubSpotContact[] = [];
  let after: string | undefined;
  const client = await getHubSpotClientForOrganization(organizationId);

  do {
    const page = await getHubSpotContacts(client, 100, after);
    allContacts.push(...page.results);
    after = page.paging?.next?.after;

    if (after) {
      await sleep(100);
    }
  } while (after);

  return allContacts;
}

export async function searchAllHubSpotContacts(
  organizationId: string,
  query: string,
): Promise<HubSpotContact[]> {
  const allContacts: HubSpotContact[] = [];
  let after: string | undefined;
  const client = await getHubSpotClientForOrganization(organizationId);

  do {
    const page = await searchHubSpotContacts(client, query, 100, after);
    allContacts.push(...page.results);
    after = page.paging?.next?.after;

    if (after) {
      await sleep(100);
    }
  } while (after);

  return allContacts;
}

export async function getHubSpotContactById(
  organizationId: string,
  contactId: string,
): Promise<HubSpotContact> {
  const client = await getHubSpotClientForOrganization(organizationId);

  return withRetry(async () => {
    const response = await client.crm.contacts.basicApi.getById(
      contactId,
      CONTACT_PROPERTIES,
    );

    return response as unknown as HubSpotContact;
  });
}

function splitFullName(fullName: string): { firstname: string; lastname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstname: "", lastname: "" };
  }

  if (parts.length === 1) {
    return { firstname: parts[0], lastname: "" };
  }

  return {
    firstname: parts[0],
    lastname: parts.slice(1).join(" "),
  };
}

export async function createHubSpotContact(
  organizationId: string,
  input: CreateHubSpotContactInput,
): Promise<HubSpotContact> {
  const client = await getHubSpotClientForOrganization(organizationId);
  const { firstname, lastname } = splitFullName(input.full_name);
  const classification = await inferHubSpotLeadClassification({
    description: input.description ?? null,
    additional_data: input.additional_data,
  });
  const properties: Record<string, string> = {
    firstname,
    lastname,
    lifecyclestage: input.lifecycleStage ?? classification.lifecycleStage,
    hs_lead_status: input.leadStatus ?? classification.leadStatus,
  };

  if (input.email) {
    properties.email = input.email;
  }

  if (input.phone_number) {
    properties.phone = input.phone_number;
  }

  return withRetry(async () => {
    const response = await client.crm.contacts.basicApi.create({
      properties,
    });

    return response as unknown as HubSpotContact;
  });
}

/**
 * Transform a raw HubSpot contact into the ContactShip NewContact model.
 *
 * Missing properties are handled gracefully via `??` fallbacks.
 */
export function mapHubSpotContactToOurModel(
  hsContact: HubSpotContact,
  organizationId: string,
): NewContact {
  const p = hsContact.properties ?? {};

  const firstName = p.firstname ?? "";
  const lastName = p.lastname ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return {
    full_name: fullName || null,
    phone_number: p.phone ?? p.mobilephone ?? null,
    email: p.email ?? null,
    external_id: hsContact.id,
    source: "hubspot",
    organization_id: organizationId,
    country: null,
    description: p.lifecyclestage ?? p.hs_lead_status ?? null,
    external_lifecycle_stage: p.lifecyclestage ?? null,
    external_lead_status: p.hs_lead_status ?? null,
  };
}
