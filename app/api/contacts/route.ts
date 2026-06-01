import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createContactInputSchema } from "@/db/zod";
import {
  createUnifiedContact,
  DuplicateContactError,
  getUnifiedContacts,
} from "@/lib/contacts";
import { getCurrentOrganization } from "@/lib/session";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  source: z.enum(["hubspot"]).optional(),
  lifecycle_stage: z.string().optional(),
  lead_status: z.string().optional(),
});

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const { searchParams } = new URL(request.url);
    const raw = Object.fromEntries(searchParams.entries());

    const parsed = listQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", code: 400, details: parsed.error.issues },
        { status: 400, headers: NO_STORE }
      );
    }

    const { page, limit, search, source, lifecycle_stage, lead_status } = parsed.data;

    const result = await getUnifiedContacts({
      organizationId: organization.id,
      page,
      limit,
      search,
      source,
      lifecycleStage: lifecycle_stage,
      leadStatus: lead_status,
    });

    return NextResponse.json(result, { headers: NO_STORE });
  } catch (error) {
    console.error("GET /api/contacts error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE }
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: 400 },
        { status: 400, headers: NO_STORE },
      );
    }

    const parsed = createContactInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid contact payload", code: 400, details: parsed.error.issues },
        { status: 400, headers: NO_STORE },
      );
    }

    const result = await createUnifiedContact(organization.id, parsed.data);

    return NextResponse.json(
      result,
      { status: result.syncPending ? 202 : 201, headers: NO_STORE },
    );
  } catch (error) {
    if (error instanceof DuplicateContactError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code, headers: NO_STORE },
      );
    }

    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}
