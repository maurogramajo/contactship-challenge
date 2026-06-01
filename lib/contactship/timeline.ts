interface ContactLike {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  updated_at?: string | Date | null;
}

interface CallLike {
  id: string;
  start_at: string | Date | null;
  finished_at?: string | Date | null;
  duration: number | null;
  direction: "inbound" | "outbound" | null;
  call_status: string | null;
  call_result: string | null;
  call_analysis?: {
    summary?: string | null;
    sentiment?: string | null;
  } | null;
}

interface CommentLike {
  id: string;
  content: string;
  user_name: string | null;
  created_at: string | Date | null;
}

export type ContactshipTimelineEventType =
  | "call"
  | "message"
  | "email"
  | "interaction";

export interface ContactshipTimelineEvent {
  id: string;
  type: ContactshipTimelineEventType;
  title: string;
  description: string;
  actor: string;
  occurredAt: string;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "sin duración";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")} min`;
}

function callDirectionLabel(direction: CallLike["direction"]): string {
  if (direction === "inbound") return "entrante";
  if (direction === "outbound") return "saliente";
  return "general";
}

function buildCallEvents(calls: CallLike[]): ContactshipTimelineEvent[] {
  return calls.slice(0, 8).flatMap((call) => {
    const occurredAt = toDate(call.start_at);
    if (!occurredAt) return [];

    const result = call.call_result ?? call.call_status ?? "sin resultado";
    const analysis = call.call_analysis?.summary
      ? ` ${call.call_analysis.summary}`
      : "";

    return [
      {
        id: `call-${call.id}`,
        type: "call" as const,
        title: `Llamada ${callDirectionLabel(call.direction)}`,
        description: `Resultado ${result} · ${formatDuration(call.duration)}.${analysis}`,
        actor: "Central ContactShip",
        occurredAt: occurredAt.toISOString(),
      },
    ];
  });
}

function buildCommentEvents(comments: CommentLike[]): ContactshipTimelineEvent[] {
  return comments.slice(0, 3).flatMap((comment) => {
    const occurredAt = toDate(comment.created_at);
    if (!occurredAt) return [];

    return [
      {
        id: `comment-${comment.id}`,
        type: "interaction" as const,
        title: "Seguimiento interno registrado",
        description: comment.content,
        actor: comment.user_name ?? "Equipo ContactShip",
        occurredAt: occurredAt.toISOString(),
      },
    ];
  });
}

export function buildContactshipTimeline(params: {
  contact: ContactLike;
  calls: CallLike[];
  comments: CommentLike[];
}): ContactshipTimelineEvent[] {
  const { calls, comments } = params;
  const baseEvents = [...buildCallEvents(calls), ...buildCommentEvents(comments)];

  return baseEvents
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 8);
}
