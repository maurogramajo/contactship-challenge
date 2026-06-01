import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAdvancedTestData,
  createHubSpotBasicTestData,
  createLocalQueueTestData,
  getTestDataStatus,
} from "@/lib/test-data";
import { getCurrentOrganization } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  test: z.enum(["hubspot-basic", "local-queue", "advanced"]),
});

export async function GET() {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const status = await getTestDataStatus(organization.id);
    return NextResponse.json(status, { headers: NO_STORE });
  } catch (error) {
    console.error("GET /api/test-data error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: 400, details: parsed.error.issues },
        { status: 400, headers: NO_STORE },
      );
    }

    const result =
      parsed.data.test === "hubspot-basic"
        ? await createHubSpotBasicTestData(organization.id)
        : parsed.data.test === "local-queue"
          ? await createLocalQueueTestData(organization.id)
          : await createAdvancedTestData(organization.id);

    const status = await getTestDataStatus(organization.id);
    return NextResponse.json({ result, status }, { status: 201, headers: NO_STORE });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear data de test.";
    const code = message.includes("debe estar") ? 409 : 500;

    if (code === 500) {
      console.error("POST /api/test-data error:", error);
    }

    return NextResponse.json(
      { error: message, code },
      { status: code, headers: NO_STORE },
    );
  }
}
