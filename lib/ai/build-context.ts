import {
  getContactById,
  getCallsByContactId,
  getCommentsByContactId,
} from "@/db/repository";
import { getAiSettings } from "@/db/repository/organization-ai-settings";
import { getActionablesByContactId } from "@/db/repository/actionables";
import { getHubSpotContactActivity } from "@/lib/hubspot/contact-activity";
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
    getHubSpotContactActivity(contactId, organizationId),
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

  const [contact, calls, comments, hubspotActivity, orgSettings, previousActionables] =
    await Promise.all(fetchers) as [
      Awaited<ReturnType<typeof getContactById>>,
      Awaited<ReturnType<typeof getCallsByContactId>>,
      Awaited<ReturnType<typeof getCommentsByContactId>>,
      Awaited<ReturnType<typeof getHubSpotContactActivity>>,
      Awaited<ReturnType<typeof getAiSettings>>,
      Awaited<ReturnType<typeof getActionablesByContactId>>,
    ];

  if (!contact) return null;

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
      items: calls.slice(0, 6).map((call) => ({
        direction: call.direction,
        from: call.from,
        call_status: call.call_status,
        call_result: call.call_result,
        disconnection_reason: call.disconnection_reason,
        start_at: call.start_at?.toISOString() ?? null,
        finished_at: call.finished_at?.toISOString() ?? null,
        duration: call.duration,
        analysis_summary: call.call_analysis?.summary ?? null,
        analysis_sentiment: call.call_analysis?.sentiment ?? null,
        chat_history: call.chat_history?.slice(0, 12) ?? [],
      })),
    },
    comments: {
      items: comments.slice(0, 8).map((comment) => ({
        updated_at: comment.updated_at?.toISOString() ?? null,
        created_at: comment.created_at?.toISOString() ?? null,
        content: comment.content,
        user_name: comment.user_name,
      })),
    },
    hubspot: {
      notes: hubspotActivity.notes.slice(0, 8).map((note) => ({
        body: note.body,
        createdAt: note.createdAt,
      })),
      tasks: hubspotActivity.tasks.slice(0, 8).map((task) => ({
        title: task.title,
        body: task.body,
        dueAt: task.dueAt,
        status: task.status,
        priority: task.priority,
      })),
      meetings: hubspotActivity.meetings.slice(0, 8).map((meeting) => ({
        title: meeting.title,
        body: meeting.body,
        internalNotes: meeting.internalNotes,
        startAt: meeting.startAt,
        endAt: meeting.endAt,
        outcome: meeting.outcome,
      })),
      error: hubspotActivity.error,
    },
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
