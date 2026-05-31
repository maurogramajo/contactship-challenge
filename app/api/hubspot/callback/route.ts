import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/session";
import {
  exchangeCodeForTokens,
  saveHubSpotConnectionForOrganization,
} from "@/lib/hubspot";

const HUBSPOT_STATE_COOKIE = "hubspot_oauth_state";

export async function GET(request: NextRequest) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get(HUBSPOT_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?hubspot=invalid_state", request.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveHubSpotConnectionForOrganization(organization.id, tokens);

    const response = NextResponse.redirect(
      new URL("/dashboard/settings?hubspot=connected", request.url),
    );
    response.cookies.delete(HUBSPOT_STATE_COOKIE);
    return response;
  } catch (error) {
    console.error("[hubspot/callback] OAuth callback failed:", error);
    const response = NextResponse.redirect(
      new URL("/dashboard/settings?hubspot=error", request.url),
    );
    response.cookies.delete(HUBSPOT_STATE_COOKIE);
    return response;
  }
}
