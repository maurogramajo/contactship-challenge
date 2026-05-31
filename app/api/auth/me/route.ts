import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/session";

export async function GET() {
  const organization = await getCurrentOrganization();

  if (!organization) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
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
