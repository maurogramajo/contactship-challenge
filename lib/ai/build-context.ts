import {
  getContactById,
  getCallsByContactId,
  getCommentsByContactId,
  getTagsByContactId,
} from "@/db/repository";
import type { InsightContext } from "./insights";

export async function buildContactContext(
  contactId: string,
  organizationId: string,
): Promise<InsightContext | null> {
  const [contact, calls, comments, tags] = await Promise.all([
    getContactById(contactId, organizationId),
    getCallsByContactId(contactId),
    getCommentsByContactId(contactId),
    getTagsByContactId(contactId),
  ]);

  if (!contact) return null;

  const inboundCalls = calls.filter((c) => c.direction === "inbound");
  const outboundCalls = calls.filter((c) => c.direction === "outbound");
  const answeredCalls = calls.filter((c) => c.status === "answered");

  return {
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
}
