import { describe, expect, it } from "bun:test";

process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/contactship";
process.env.AI_API_KEY ??= "test-key";
process.env.AI_PROVIDER ??= "openai";
process.env.AI_MODEL ??= "gpt-4.1-mini";
process.env.AUTH_SECRET ??= "test-auth-secret-that-is-long-enough";
process.env.HUBSPOT_CLIENT_ID ??= "test-client-id";
process.env.HUBSPOT_CLIENT_SECRET ??= "test-client-secret";
process.env.HUBSPOT_REDIRECT_URI ??= "http://localhost:3000/api/hubspot/callback";

const {
  getHubSpotExternalIdFromContact,
  resolveHubSpotExternalIdForContactIdentifier,
} = await import("@/lib/contacts");
const {
  findHubSpotDuplicateContact,
  normalizeContactEmail,
  normalizeContactPhone,
  pickHubSpotDuplicateContact,
} = await import("@/lib/contact-deduplication");
const {
  buildHubSpotPhoneSearchTokens,
  isPhoneLikeHubSpotSearch,
} = await import("@/lib/hubspot");

describe("getHubSpotExternalIdFromContact", () => {
  it("returns the external id for HubSpot contacts", () => {
    expect(
      getHubSpotExternalIdFromContact({
        source: "hubspot",
        external_id: "225385088005",
      }),
    ).toBe("225385088005");
  });

  it("ignores non-HubSpot contacts", () => {
    expect(
      getHubSpotExternalIdFromContact({
        source: null,
        external_id: "225385088005",
      }),
    ).toBeNull();
  });
});

describe("resolveHubSpotExternalIdForContactIdentifier", () => {
  it("accepts virtual HubSpot contact ids without a lookup", async () => {
    const externalId = await resolveHubSpotExternalIdForContactIdentifier(
      "hubspot:225385088005",
      "org-1",
      async () => {
        throw new Error("lookup should not run for virtual ids");
      },
    );

    expect(externalId).toBe("225385088005");
  });

  it("resolves a materialized HubSpot contact by local uuid", async () => {
    const externalId = await resolveHubSpotExternalIdForContactIdentifier(
      "bfa6c57b-20a0-45eb-a647-82f85c006e6e",
      "a31ea05b-950a-4c79-9008-7fcc390b9f38",
      async (contactId, organizationId) => {
        expect(contactId).toBe("bfa6c57b-20a0-45eb-a647-82f85c006e6e");
        expect(organizationId).toBe("a31ea05b-950a-4c79-9008-7fcc390b9f38");

        return {
          source: "hubspot",
          external_id: "225385088005",
        };
      },
    );

    expect(externalId).toBe("225385088005");
  });
});

describe("contact deduplication", () => {
  const hubSpotContact = {
    id: "225385088005",
    properties: {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "Ada@Example.COM ",
      phone: "+54 11 5555-1212",
    },
  };

  it("normalizes email and phone identifiers", () => {
    expect(normalizeContactEmail("  Ada@Example.COM ")).toBe("ada@example.com");
    expect(normalizeContactEmail("   ")).toBeNull();
    expect(normalizeContactPhone("+54 11 5555-1212")).toBe("541155551212");
    expect(normalizeContactPhone(" - ")).toBeNull();
  });

  it("prioritizes normalized email as the strong HubSpot match", () => {
    const result = pickHubSpotDuplicateContact([hubSpotContact], {
      full_name: "Someone Else",
      email: "ada@example.com",
      phone_number: "+1 999 000",
    });

    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.signal).toBe("email");
      expect(result.contact.id).toBe("225385088005");
    }
  });

  it("uses normalized phone as a fallback when there is no email", () => {
    const result = pickHubSpotDuplicateContact([hubSpotContact], {
      full_name: "Someone Else",
      email: null,
      phone_number: "54 (11) 5555 1212",
    });

    expect(result.status).toBe("match");
    if (result.status === "match") {
      expect(result.signal).toBe("phone");
    }
  });

  it("keeps name-only matches auxiliary instead of automatic duplicates", () => {
    const result = pickHubSpotDuplicateContact([hubSpotContact], {
      full_name: "Ada Lovelace",
      email: "other@example.com",
      phone_number: null,
    });

    expect(result.status).toBe("no_match");
    if (result.status === "no_match") {
      expect(result.auxiliaryNameMatches).toHaveLength(1);
    }
  });

  it("distinguishes an unavailable HubSpot search from no match", async () => {
    const result = await findHubSpotDuplicateContact(
      "org-1",
      { email: "ada@example.com" },
      async () => {
        throw new Error("HubSpot search failed");
      },
    );

    expect(result.status).toBe("unverified");
  });
});

describe("HubSpot list search helpers", () => {
  it("detects phone-like searches without treating emails or names as phones", () => {
    expect(isPhoneLikeHubSpotSearch("58590707")).toBe(true);
    expect(isPhoneLikeHubSpotSearch("+54 9 11 5859-0707")).toBe(true);
    expect(isPhoneLikeHubSpotSearch("ada@example.com")).toBe(false);
    expect(isPhoneLikeHubSpotSearch("Ada 5859")).toBe(false);
  });

  it("builds normalized phone suffix tokens for partial list search", () => {
    expect(buildHubSpotPhoneSearchTokens("+54 9 11 5859-0707")).toEqual([
      "5491158590707",
      "1158590707",
      "58590707",
    ]);
    expect(buildHubSpotPhoneSearchTokens("58590707")).toEqual(["58590707"]);
  });
});
