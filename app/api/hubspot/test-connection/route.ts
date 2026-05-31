import { NextResponse } from "next/server";
import { testConnection } from "@/lib/hubspot";
import { getCurrentOrganization } from "@/lib/session";

export async function POST() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const result = await testConnection(organization.id);

    if (result.success) {
      return NextResponse.json(result);
    }

    return NextResponse.json(result, { status: 502 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown HubSpot connection error";

    const err = error as { code?: number };
    const status =
      err.code === 401 ? 401 : err.code === 429 ? 429 : 500;

    return NextResponse.json(
      { success: false, error: message },
      { status },
    );
  }
}
