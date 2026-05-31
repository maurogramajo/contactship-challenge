import { NextResponse } from "next/server";
import { clearSession, rotateRefreshToken } from "@/lib/session";

export async function POST() {
  const organization = await rotateRefreshToken();
  if (!organization) {
    await clearSession();
    return NextResponse.json(
      { error: "Refresh token is invalid or expired", code: 401 },
      { status: 401 },
    );
  }

  return NextResponse.json({
    organization: {
      id: organization.id,
      name: organization.name,
      email: organization.email,
    },
  });
}
