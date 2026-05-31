import { NextRequest, NextResponse } from "next/server";
import { createOpaqueToken } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/session";
import { getHubSpotAuthorizationUrl } from "@/lib/hubspot";

const HUBSPOT_STATE_COOKIE = "hubspot_oauth_state";

export async function GET(request: NextRequest) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = createOpaqueToken(24);
  const response = NextResponse.redirect(getHubSpotAuthorizationUrl(state));
  response.cookies.set(HUBSPOT_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
