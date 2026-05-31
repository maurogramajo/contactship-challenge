import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOrganizationByEmail } from "@/db/repository";
import { verifyPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";

const loginSchema = z.object({
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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid login payload", code: 400 },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const organization = await getOrganizationByEmail(email);
  if (!organization) {
    return NextResponse.json(
      { error: "Invalid credentials", code: 401 },
      { status: 401 },
    );
  }

  const validPassword = verifyPassword(
    parsed.data.password,
    organization.password_hash,
  );
  if (!validPassword) {
    return NextResponse.json(
      { error: "Invalid credentials", code: 401 },
      { status: 401 },
    );
  }

  await createSession(organization);

  return NextResponse.json({
    organization: {
      id: organization.id,
      name: organization.name,
      email: organization.email,
    },
  });
}
