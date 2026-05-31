import {
  getContactById,
  getCallsByContactId,
  getCommentsByContactId,
  getTagsByContactId,
} from "@/db/repository";
import { getAiSettings } from "@/db/repository/organization-ai-settings";
import { getActionablesByContactId } from "@/db/repository/actionables";
import type { InsightContext } from "./insights";

export async function buildContactContext(
  contactId: string,
  organizationId: string,
  options?: {
    includeOrgSettings?: boolean;
    includePreviousActionables?: boolean;
  },
): Promise<InsightContext | null> {
  const fetchers: Promise<unknown>[] = [
    getContactById(contactId, organizationId),
    getCallsByContactId(contactId),
    getCommentsByContactId(contactId),
    getTagsByContactId(contactId),
  ];

  const orgSettingsPromise =
    options?.includeOrgSettings
      ? getAiSettings(organizationId)
      : Promise.resolve(null);
  const previousActionablesPromise =
    options?.includePreviousActionables
      ? getActionablesByContactId(contactId)
      : Promise.resolve([] as Awaited<ReturnType<typeof getActionablesByContactId>>);

  fetchers.push(orgSettingsPromise, previousActionablesPromise);

  const [contact, calls, comments, tags, orgSettings, previousActionables] =
    await Promise.all(fetchers) as [
      Awaited<ReturnType<typeof getContactById>>,
      Awaited<ReturnType<typeof getCallsByContactId>>,
      Awaited<ReturnType<typeof getCommentsByContactId>>,
      Awaited<ReturnType<typeof getTagsByContactId>>,
      Awaited<ReturnType<typeof getAiSettings>>,
      Awaited<ReturnType<typeof getActionablesByContactId>>,
    ];

  if (!contact) return null;

  const inboundCalls = calls.filter((c) => c.direction === "inbound");
  const outboundCalls = calls.filter((c) => c.direction === "outbound");
  const answeredCalls = calls.filter((c) => c.status === "answered");

  const context: InsightContext = {
    contact: {
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone_number,
      country: contact.country,
      source: contact.source,
      description: contact.description,
    },
    calls: {
      total: calls.length,
      lastDate: calls[0]?.call_time?.toISOString() ?? null,
      inboundCount: inboundCalls.length,
      outboundCount: outboundCalls.length,
      answeredRate:
        calls.length > 0 ? answeredCalls.length / calls.length : 0,
    },
    comments: {
      count: comments.length,
      lastDate: comments[0]?.created_at?.toISOString() ?? null,
      lastContent: comments[0]?.content ?? null,
    },
    tags: tags.map((t) => t.name),
  };

  if (orgSettings) {
    context.organizationObjective = orgSettings.objective;
    context.organizationInstructions =
      orgSettings.additional_instructions ?? undefined;
  }

  if (previousActionables.length > 0) {
    context.previousActionables = previousActionables
      .slice(0, 5)
      .map((a) => a.summary)
      .filter((s): s is string => s != null);
  }

  return context;
}
