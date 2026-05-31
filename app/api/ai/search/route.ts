import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  generateSearchFilters,
  AITimeoutError,
  AIInvalidResponseError,
} from "@/lib/ai/search";
import { translateFiltersToDrizzle } from "@/lib/ai/filter-to-query";
import { getContacts } from "@/db/repository/contacts";
import { getCurrentOrganization } from "@/lib/session";

const searchBodySchema = z.object({
  query: z.string().min(3, "La consulta debe tener al menos 3 caracteres"),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export async function POST(request: NextRequest) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.json(
      { error: "Unauthorized", code: 401 },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de solicitud JSON inválido" },
      { status: 400 }
    );
  }

  const parsed = searchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "La consulta debe tener al menos 3 caracteres" },
      { status: 400 }
    );
  }

  const { query, page, limit } = parsed.data;

  let filters;
  try {
    filters = await generateSearchFilters(query);
  } catch (err) {
    if (err instanceof AITimeoutError) {
      return NextResponse.json(
        { error: "El servicio de IA no está disponible en este momento" },
        { status: 503 }
      );
    }
    if (err instanceof AIInvalidResponseError) {
      return NextResponse.json(
        { error: "La IA no pudo interpretar la consulta" },
        { status: 422 }
      );
    }
    console.error("[api/ai/search] Unexpected AI error:", err);
    return NextResponse.json(
      { error: "Error interno al procesar la consulta" },
      { status: 500 }
    );
  }

  const { conditions, interpretation } = translateFiltersToDrizzle(filters);

  try {
    const result = await getContacts({
      organizationId: organization.id,
      extraConditions: conditions,
      page,
      limit,
    });

    return NextResponse.json({
      results: result.data,
      filters,
      interpretation,
      total: result.total,
    });
  } catch (err) {
    console.error("[api/ai/search] Database error:", err);
    return NextResponse.json(
      { error: "Error al consultar la base de datos" },
      { status: 500 }
    );
  }
}
