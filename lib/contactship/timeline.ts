interface ContactLike {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  updated_at?: string | Date | null;
}

interface CallLike {
  id: string;
  call_time: string | Date | null;
  duration: number | null;
  direction: "inbound" | "outbound" | null;
  status: "answered" | "missed" | "rejected" | "busy" | "failed" | null;
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

function createSeed(value: string): number {
  let seed = 0;

  for (let index = 0; index < value.length; index += 1) {
    seed = (seed * 31 + value.charCodeAt(index)) >>> 0;
  }

  return seed || 1;
}

function createRandom(seedInput: string) {
  let seed = createSeed(seedInput);

  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
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

function callStatusLabel(status: CallLike["status"]): string {
  switch (status) {
    case "answered":
      return "respondida";
    case "missed":
      return "perdida";
    case "rejected":
      return "rechazada";
    case "busy":
      return "ocupado";
    case "failed":
      return "fallida";
    default:
      return "sin estado";
  }
}

function callDirectionLabel(direction: CallLike["direction"]): string {
  if (direction === "inbound") return "entrante";
  if (direction === "outbound") return "saliente";
  return "general";
}

function buildCallEvents(calls: CallLike[]): ContactshipTimelineEvent[] {
  return calls.slice(0, 4).flatMap((call, index) => {
    const occurredAt = toDate(call.call_time);
    if (!occurredAt) return [];

    return [
      {
        id: `call-${call.id}`,
        type: "call" as const,
        title: `Llamada ${callDirectionLabel(call.direction)}`,
        description: `Estado ${callStatusLabel(call.status)} · ${formatDuration(call.duration)}.`,
        actor: "Central ContactShip",
        occurredAt: new Date(occurredAt.getTime() - index * 20 * 60 * 1000).toISOString(),
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

function buildSyntheticEvents(
  contact: ContactLike,
  eventCount: number,
  referenceDate: Date,
): ContactshipTimelineEvent[] {
  const random = createRandom(`${contact.id}:${contact.email ?? ""}:${contact.phone_number ?? ""}`);
  const templates = [
    {
      type: "message" as const,
      title: "Mensaje de WhatsApp preparado",
      description: "Se generó un borrador breve para retomar la conversación desde ContactShip.",
      actor: "Asistente ContactShip",
    },
    {
      type: "email" as const,
      title: "Correo de seguimiento sugerido",
      description: "El sistema detectó una ventana favorable para enviar información comercial.",
      actor: "Motor de campañas",
    },
    {
      type: "interaction" as const,
      title: "Interacción social detectada",
      description: "Se registró una visita al perfil y una nueva señal de interés en el embudo.",
      actor: "Monitor ContactShip",
    },
    {
      type: "call" as const,
      title: "Intento de llamada recomendado",
      description: "El contacto mostró señales de respuesta y quedó marcado para un nuevo toque.",
      actor: "Orquestador comercial",
    },
  ];

  return Array.from({ length: Math.max(4, 8 - eventCount) }, (_, index) => {
    const template = templates[Math.floor(random() * templates.length)] ?? templates[0];
    const offsetHours = 8 + index * 11 + Math.floor(random() * 14);
    const occurredAt = new Date(referenceDate.getTime() - offsetHours * 60 * 60 * 1000);

    return {
      id: `synthetic-${contact.id}-${index}`,
      type: template.type,
      title: template.title,
      description: template.description,
      actor: template.actor,
      occurredAt: occurredAt.toISOString(),
    };
  });
}

export function buildContactshipTimeline(params: {
  contact: ContactLike;
  calls: CallLike[];
  comments: CommentLike[];
}): ContactshipTimelineEvent[] {
  const { contact, calls, comments } = params;
  const baseEvents = [...buildCallEvents(calls), ...buildCommentEvents(comments)];
  const referenceDate =
    baseEvents
      .map((item) => toDate(item.occurredAt))
      .filter((value): value is Date => value !== null)
      .sort((left, right) => right.getTime() - left.getTime())[0] ??
    toDate(contact.updated_at) ??
    new Date();

  return [...baseEvents, ...buildSyntheticEvents(contact, baseEvents.length, referenceDate)]
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
    )
    .slice(0, 8);
}
