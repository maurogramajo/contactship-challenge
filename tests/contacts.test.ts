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
