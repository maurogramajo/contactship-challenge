"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ContactshipTimelineEvent } from "@/lib/contactship/timeline";

interface ContactshipTimelineProps {
  events: ContactshipTimelineEvent[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventConfig(type: ContactshipTimelineEvent["type"]) {
  switch (type) {
    case "call":
      return {
        label: "Llamada",
        badge: "info" as const,
        dot: "bg-blue-500",
      };
    case "message":
      return {
        label: "Mensaje",
        badge: "success" as const,
        dot: "bg-emerald-500",
      };
    case "email":
      return {
        label: "Email",
        badge: "warning" as const,
        dot: "bg-amber-500",
      };
    default:
      return {
        label: "Interacción",
        badge: "tag" as const,
        dot: "bg-slate-400",
      };
  }
}

export function ContactshipTimeline({ events }: ContactshipTimelineProps) {
  return (
    <aside className="rounded-xl border border-border bg-surface p-6 shadow-card xl:sticky xl:top-8">
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
              Timeline
            </p>
            <h2 className="mt-1 text-lg font-semibold text-text-primary">
              Interacciones ContactShip
            </h2>
          </div>
          <Badge variant="tag">Simulado</Badge>
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          Llamadas, mensajes e interacciones generadas para mostrar el flujo operativo.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="Sin eventos en la timeline"
          description="Todavía no hay interacciones simuladas para este contacto."
        />
      ) : (
        <ol className="mt-6 space-y-5">
          {events.map((event, index) => {
            const config = eventConfig(event.type);

            return (
              <li key={event.id} className="relative pl-8">
                {index < events.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[11px] top-7 h-[calc(100%+0.75rem)] w-px bg-border"
                  />
                )}

                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-surface bg-surface-secondary`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                </span>

                <div className="rounded-xl border border-border-light bg-surface-secondary p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant={config.badge}>{config.label}</Badge>
                    <time className="text-xs text-text-tertiary">
                      {formatDate(event.occurredAt)}
                    </time>
                  </div>

                  <h3 className="mt-3 text-sm font-semibold text-text-primary">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {event.description}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                    {event.actor}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
