import { env } from "@/lib/env";
import {
  createHubSpotConnection,
  getHubSpotConnectionByOrganizationId,
  updateHubSpotConnection,
} from "@/db/repository";
import type { HubSpotConnection } from "@/db/schema";

const HUBSPOT_OAUTH_SCOPES = [
  "oauth",
  "crm.objects.contacts.read",
  "crm.objects.contacts.write",
  "crm.objects.companies.read",
  "crm.objects.deals.read",
  "crm.objects.deals.write",
  "crm.objects.owners.read",
  "crm.objects.leads.read",
  "crm.objects.leads.write",
  "crm.objects.notes.write",
];

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

type AccessTokenMetadata = {
  hub_id: number;
  scopes: string[];
  user?: string;
  hub_domain?: string;
};

export function getHubSpotAuthorizationUrl(state: string): string {
  const url = new URL("https://app.hubspot.com/oauth/authorize");
  url.searchParams.set("client_id", env.HUBSPOT_CLIENT_ID);
  url.searchParams.set("redirect_uri", env.HUBSPOT_REDIRECT_URI);
  url.searchParams.set("scope", HUBSPOT_OAUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeToken(
  params: URLSearchParams,
): Promise<TokenResponse> {
  const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HubSpot token exchange failed: ${body}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.HUBSPOT_CLIENT_ID,
      client_secret: env.HUBSPOT_CLIENT_SECRET,
      redirect_uri: env.HUBSPOT_REDIRECT_URI,
      code,
    }),
  );
}

export async function refreshHubSpotTokens(
  refreshToken: string,
): Promise<TokenResponse> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.HUBSPOT_CLIENT_ID,
      client_secret: env.HUBSPOT_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  );
}

export async function getAccessTokenMetadata(
  accessToken: string,
): Promise<AccessTokenMetadata> {
  const response = await fetch(
    `https://api.hubapi.com/oauth/v1/access-tokens/${accessToken}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HubSpot access token metadata failed: ${body}`);
  }

  return (await response.json()) as AccessTokenMetadata;
}

export async function saveHubSpotConnectionForOrganization(
  organizationId: string,
  tokens: TokenResponse,
): Promise<HubSpotConnection> {
  const metadata = await getAccessTokenMetadata(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const portalId = String(metadata.hub_id);
  const existing = await getHubSpotConnectionByOrganizationId(organizationId);

  if (!existing) {
    return createHubSpotConnection({
      organization_id: organizationId,
      hubspot_portal_id: portalId,
      hubspot_user_email: metadata.user ?? null,
      hubspot_hub_domain: metadata.hub_domain ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scopes: metadata.scopes,
    });
  }

  if (existing.hubspot_portal_id !== portalId) {
    throw new Error(
      "This organization is already linked to a different HubSpot account. Disconnect first to replace it.",
    );
  }

  return updateHubSpotConnection(existing.id, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    scopes: metadata.scopes,
    hubspot_user_email: metadata.user ?? null,
    hubspot_hub_domain: metadata.hub_domain ?? null,
  });
}

export async function refreshHubSpotConnectionIfNeeded(
  connection: HubSpotConnection,
): Promise<HubSpotConnection> {
  const refreshThresholdMs = 60 * 1000;
  const expiresSoon =
    connection.expires_at.getTime() - Date.now() <= refreshThresholdMs;

  if (!expiresSoon) {
    return connection;
  }

  const tokens = await refreshHubSpotTokens(connection.refresh_token);
  const metadata = await getAccessTokenMetadata(tokens.access_token);

  return updateHubSpotConnection(connection.id, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000),
    scopes: metadata.scopes,
    hubspot_user_email: metadata.user ?? null,
    hubspot_hub_domain: metadata.hub_domain ?? null,
  });
}
