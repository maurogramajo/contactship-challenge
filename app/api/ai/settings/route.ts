import { NextRequest, NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/session";
import { getAiSettings, upsertAiSettings } from "@/db/repository";
import { upsertAiSettingsSchema } from "@/db/zod/organization-ai-settings";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const settings = await getAiSettings(organization.id);
    return NextResponse.json(
      { settings: settings ?? null },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("GET /api/ai/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const body = await request.json();
    const parsed = upsertAiSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: 400,
          details: parsed.error.flatten(),
        },
        { status: 400, headers: NO_STORE },
      );
    }

    const settings = await upsertAiSettings(organization.id, parsed.data);
    return NextResponse.json({ settings }, { headers: NO_STORE });
  } catch (error) {
    console.error("PUT /api/ai/settings error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}
