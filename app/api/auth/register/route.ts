import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOrganization, getOrganizationByEmail } from "@/db/repository";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

const registerSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body", code: 400 },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid registration payload", code: 400 },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const existing = await getOrganizationByEmail(email);
  if (existing) {
    return NextResponse.json(
      { error: "An account already exists for this email", code: 409 },
      { status: 409 },
    );
  }

  const organization = await createOrganization({
    name: parsed.data.name.trim(),
    email,
    password_hash: hashPassword(parsed.data.password),
  });

  await createSession(organization);

  return NextResponse.json({
    organization: {
      id: organization.id,
      name: organization.name,
      email: organization.email,
    },
  });
}
