import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUnifiedContact, getUnifiedContacts } from "@/lib/contacts";
import { getCurrentOrganization } from "@/lib/session";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  source: z.enum(["hubspot"]).optional(),
});

const createContactSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre es obligatorio"),
  email: z.email().nullish(),
  phone_number: z.string().trim().nullish(),
  country: z.string().trim().nullish(),
  description: z.string().trim().nullish(),
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

    const { page, limit, search, source } = parsed.data;

    const result = await getUnifiedContacts({
      organizationId: organization.id,
      page,
      limit,
      search,
      source,
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

    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid contact payload", code: 400, details: parsed.error.issues },
        { status: 400, headers: NO_STORE },
      );
    }

    const contact = await createUnifiedContact(organization.id, parsed.data);

    return NextResponse.json({ contact }, { status: 201, headers: NO_STORE });
  } catch (error) {
    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE },
    );
  }
}
