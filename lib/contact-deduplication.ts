import {
  searchAllHubSpotContacts,
  type HubSpotContact,
} from "@/lib/hubspot";

export type HubSpotDuplicateMatchSignal = "email" | "phone";

export type HubSpotDuplicateSearchResult =
  | {
      status: "match";
      contact: HubSpotContact;
      signal: HubSpotDuplicateMatchSignal;
    }
  | {
      status: "no_match";
      auxiliaryNameMatches: HubSpotContact[];
    }
  | {
      status: "unverified";
      error: unknown;
    };

type HubSpotContactSearch = (
  organizationId: string,
  query: string,
) => Promise<HubSpotContact[]>;

export type ContactDeduplicationInput = {
  full_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

export function normalizeContactEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

export function normalizeContactPhone(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\D/g, "") ?? "";
  return normalized || null;
}

function normalizeContactName(value: string | null | undefined): string | null {
  const normalized =
    value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase() ?? "";

  return normalized || null;
}

function getHubSpotFullName(contact: HubSpotContact): string | null {
  const firstName = contact.properties.firstname ?? "";
  const lastName = contact.properties.lastname ?? "";
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export function isAuxiliaryNameMatch(
  contact: HubSpotContact,
  fullName: string | null | undefined,
): boolean {
  const inputName = normalizeContactName(fullName);
  const hubSpotName = normalizeContactName(getHubSpotFullName(contact));

  return Boolean(inputName && hubSpotName && inputName === hubSpotName);
}

export function pickHubSpotDuplicateContact(
  contacts: HubSpotContact[],
  input: ContactDeduplicationInput,
): HubSpotDuplicateSearchResult {
  const email = normalizeContactEmail(input.email);
  const phone = normalizeContactPhone(input.phone_number);
  const emailMatch = email
    ? contacts.find(
        (contact) => normalizeContactEmail(contact.properties.email) === email,
      )
    : null;

  if (emailMatch) {
    return { status: "match", contact: emailMatch, signal: "email" };
  }

  if (!email && phone) {
    const phoneMatch = contacts.find(
      (contact) =>
        normalizeContactPhone(contact.properties.phone) === phone ||
        normalizeContactPhone(contact.properties.mobilephone) === phone,
    );

    if (phoneMatch) {
      return { status: "match", contact: phoneMatch, signal: "phone" };
    }
  }

  return {
    status: "no_match",
    auxiliaryNameMatches: contacts.filter((contact) =>
      isAuxiliaryNameMatch(contact, input.full_name),
    ),
  };
}

export async function findHubSpotDuplicateContact(
  organizationId: string,
  input: ContactDeduplicationInput,
  searchContacts: HubSpotContactSearch = searchAllHubSpotContacts,
): Promise<HubSpotDuplicateSearchResult> {
  const email = normalizeContactEmail(input.email);
  const phone = normalizeContactPhone(input.phone_number);
  const query = email ?? phone;

  if (!query) {
    return { status: "no_match", auxiliaryNameMatches: [] };
  }

  try {
    const contacts = await searchContacts(organizationId, query);
    return pickHubSpotDuplicateContact(contacts, input);
  } catch (error) {
    return { status: "unverified", error };
  }
}
