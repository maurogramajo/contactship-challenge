import { db } from "@/db";
import {
  organizationRefreshTokens,
  type OrganizationRefreshToken,
  type NewOrganizationRefreshToken,
} from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";

export async function createOrganizationRefreshToken(
  data: NewOrganizationRefreshToken,
): Promise<OrganizationRefreshToken> {
  const [token] = await db
    .insert(organizationRefreshTokens)
    .values(data)
    .returning();

  return token;
}

export async function getValidOrganizationRefreshTokenByHash(
  tokenHash: string,
): Promise<OrganizationRefreshToken | null> {
  const now = new Date();
  const [token] = await db
    .select()
    .from(organizationRefreshTokens)
    .where(
      and(
        eq(organizationRefreshTokens.token_hash, tokenHash),
        isNull(organizationRefreshTokens.revoked_at),
        gt(organizationRefreshTokens.expires_at, now),
      ),
    )
    .limit(1);

  return token ?? null;
}

export async function revokeOrganizationRefreshTokenById(
  id: string,
): Promise<void> {
  await db
    .update(organizationRefreshTokens)
    .set({ revoked_at: new Date() })
    .where(eq(organizationRefreshTokens.id, id));
}
