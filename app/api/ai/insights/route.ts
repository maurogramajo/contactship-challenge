import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildContactContext } from "@/lib/ai/build-context";
import { generateContactInsight } from "@/lib/ai/insights";
import { createActionable } from "@/db/repository/actionables";
import { ensureLocalContactForActionables } from "@/lib/contacts";
import { getCurrentOrganization } from "@/lib/session";

const NO_STORE = { "Cache-Control": "no-store" };

const bodySchema = z.object({
  contactId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "Unauthorized", code: 401 },
        { status: 401, headers: NO_STORE },
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: 400,
          details: parsed.error.flatten(),
        },
        { status: 400, headers: NO_STORE }
      );
    }

    const { contactId } = parsed.data;

    const localContact = await ensureLocalContactForActionables(
      contactId,
      organization.id,
    );
    if (!localContact) {
      return NextResponse.json(
        { error: "Contact not found", code: 404 },
        { status: 404, headers: NO_STORE }
      );
    }

    const context = await buildContactContext(localContact.id, organization.id);
    if (!context) {
      return NextResponse.json(
        { error: "Contact not found", code: 404 },
        { status: 404, headers: NO_STORE }
      );
    }

    const insight = await generateContactInsight(context);
    if ("error" in insight) {
      return NextResponse.json(
        { error: "AI service unavailable", code: 503 },
        { status: 503, headers: NO_STORE }
      );
    }

    const prompt = `Analiza el contacto "${context.contact.full_name || "sin nombre"}" con base en su perfil (${context.contact.country || "sin país"}, origen ${context.contact.source || "desconocido"}), historial de llamadas (${context.calls.total} total, ${Math.round(context.calls.answeredRate * 100)}% respondidas), ${context.comments.count} comentarios, y etiquetas: ${context.tags.length > 0 ? context.tags.join(", ") : "ninguna"}. Genera un resumen ejecutivo y acciones recomendadas.`;

    const actionable = await createActionable({
      contact_id: localContact.id,
      prompt,
      summary: insight.summary,
      actions: insight.actions,
      snapshot: JSON.parse(JSON.stringify(context)) as Record<string, unknown>,
    });

    return NextResponse.json(
      { actionable },
      { status: 201, headers: NO_STORE }
    );
  } catch (error) {
    console.error("POST /api/ai/insights error:", error);
    return NextResponse.json(
      { error: "Internal server error", code: 500 },
      { status: 500, headers: NO_STORE }
    );
  }
}
