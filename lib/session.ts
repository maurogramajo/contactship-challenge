import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createOrganizationRefreshToken,
  getOrganizationById,
  getValidOrganizationRefreshTokenByHash,
  revokeOrganizationRefreshTokenById,
} from "@/db/repository";
import type { Organization } from "@/db/schema";
import {
  createAccessToken,
  createOpaqueToken,
  sha256,
  verifyAccessToken,
} from "@/lib/auth";

export const ACCESS_TOKEN_COOKIE = "contactship_access_token";
export const REFRESH_TOKEN_COOKIE = "contactship_refresh_token";
const REFRESH_TOKEN_TTL_DAYS = 30;

function getCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function createSession(organization: Organization): Promise<void> {
  const cookieStore = await cookies();
  const accessToken = createAccessToken(organization.id, organization.email);
  const refreshToken = createOpaqueToken();
  const refreshTokenExpiresAt = new Date();
  refreshTokenExpiresAt.setDate(
    refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS,
  );

  await createOrganizationRefreshToken({
    organization_id: organization.id,
    token_hash: sha256(refreshToken),
    expires_at: refreshTokenExpiresAt,
  });

  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    accessToken,
    getCookieOptions(60 * 60 * 12),
  );
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    refreshToken,
    getCookieOptions(60 * 60 * 24 * REFRESH_TOKEN_TTL_DAYS),
  );
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    const storedToken = await getValidOrganizationRefreshTokenByHash(
      sha256(refreshToken),
    );
    if (storedToken) {
      await revokeOrganizationRefreshTokenById(storedToken.id);
    }
  }

  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getCurrentOrganization(): Promise<Organization | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) return null;

  const payload = verifyAccessToken(accessToken);
  if (!payload) return null;

  const organization = await getOrganizationById(payload.sub);
  if (!organization) return null;

  return organization;
}

export async function requireCurrentOrganization(): Promise<Organization> {
  const organization = await getCurrentOrganization();
  if (!organization) {
    redirect("/login");
  }

  return organization;
}

export async function rotateRefreshToken(): Promise<Organization | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  const storedToken = await getValidOrganizationRefreshTokenByHash(
    sha256(refreshToken),
  );
  if (!storedToken) return null;

  const organization = await getOrganizationById(storedToken.organization_id);
  if (!organization) return null;

  await revokeOrganizationRefreshTokenById(storedToken.id);
  await createSession(organization);

  return organization;
}
