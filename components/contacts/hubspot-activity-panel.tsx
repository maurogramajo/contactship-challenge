"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  HubSpotMeetingSummary,
  HubSpotNoteSummary,
  HubSpotTaskSummary,
} from "@/lib/hubspot/contact-activity";

interface HubSpotActivityPanelProps {
  hasHubSpotContact: boolean;
  notes: HubSpotNoteSummary[];
  tasks: HubSpotTaskSummary[];
  meetings: HubSpotMeetingSummary[];
  error: string | null;
}

type ActivityTab = "notes" | "tasks" | "meetings";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Sin fecha";

  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTaskStatus(status: string | null): string {
  if (!status) return "Sin estado";

  const labels: Record<string, string> = {
    NOT_STARTED: "Pendiente",
    WAITING: "En espera",
    IN_PROGRESS: "En curso",
    COMPLETED: "Completada",
    DEFERRED: "Postergada",
  };

  return labels[status] ?? status;
}

function taskStatusVariant(status: string | null) {
  if (status === "COMPLETED") return "success" as const;
  if (status === "IN_PROGRESS") return "info" as const;
  if (status === "WAITING" || status === "DEFERRED") return "warning" as const;
  return "tag" as const;
}

function formatPriority(priority: string | null): string {
  if (!priority) return "Sin prioridad";

  const labels: Record<string, string> = {
    HIGH: "Alta",
    MEDIUM: "Media",
    LOW: "Baja",
  };

  return labels[priority] ?? priority;
}

export function HubSpotActivityPanel({
  hasHubSpotContact,
  notes,
  tasks,
  meetings,
  error,
}: HubSpotActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>("notes");

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Actividad
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            Actividad de HubSpot
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Notas, tareas y meetings consultados sobre el contacto vinculado.
          </p>
        </div>

        <div className="inline-flex rounded-full border border-border bg-surface-secondary p-1">
          <TabButton
            active={activeTab === "notes"}
            label={`Notas (${notes.length})`}
            onClick={() => setActiveTab("notes")}
          />
          <TabButton
            active={activeTab === "tasks"}
            label={`Tareas (${tasks.length})`}
            onClick={() => setActiveTab("tasks")}
          />
          <TabButton
            active={activeTab === "meetings"}
            label={`Meetings (${meetings.length})`}
            onClick={() => setActiveTab("meetings")}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-warning/20 bg-warning-light px-4 py-3 text-sm text-warning-foreground">
          {error}
        </div>
      )}

      {!hasHubSpotContact ? (
        <div className="mt-2">
          <EmptyState
            title="Este contacto todavía no está vinculado a HubSpot"
            description="Cuando exista un ID externo se mostrarán aquí las notas y tareas reales."
          />
        </div>
      ) : activeTab === "notes" ? (
        <ActivityList>
          {notes.length === 0 ? (
            <EmptyState
              title="No hay notas asociadas"
              description="HubSpot no devolvió notas para este contacto."
            />
          ) : (
            notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl border border-border-light bg-surface-secondary p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="hubspot">Nota</Badge>
                  <time className="text-xs text-text-tertiary">
                    {formatDate(note.createdAt)}
                  </time>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {note.body}
                </p>
              </article>
            ))
          )}
        </ActivityList>
      ) : activeTab === "tasks" ? (
        <ActivityList>
          {tasks.length === 0 ? (
            <EmptyState
              title="No hay tareas asociadas"
              description="HubSpot no devolvió tareas para este contacto."
            />
          ) : (
            tasks.map((task) => (
              <article
                key={task.id}
                className="rounded-xl border border-border-light bg-surface-secondary p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="hubspot">Tarea</Badge>
                      <Badge variant={taskStatusVariant(task.status)}>
                        {formatTaskStatus(task.status)}
                      </Badge>
                      <Badge variant="tag">{formatPriority(task.priority)}</Badge>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-text-primary">
                      {task.title}
                    </h3>
                  </div>

                  <time className="text-xs text-text-tertiary">
                    {formatDate(task.dueAt)}
                  </time>
                </div>

                {task.body && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {task.body}
                  </p>
                )}
              </article>
            ))
          )}
        </ActivityList>
      ) : (
        <ActivityList>
          {meetings.length === 0 ? (
            <EmptyState
              title="No hay meetings asociados"
              description="HubSpot no devolvió meetings para este contacto."
            />
          ) : (
            meetings.map((meeting) => (
              <article
                key={meeting.id}
                className="rounded-xl border border-border-light bg-surface-secondary p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="hubspot">Meeting</Badge>
                      {meeting.outcome ? (
                        <Badge variant="info">{meeting.outcome}</Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-text-primary">
                      {meeting.title}
                    </h3>
                  </div>

                  <time className="text-xs text-text-tertiary">
                    {formatDate(meeting.startAt)}
                  </time>
                </div>

                {meeting.body || meeting.internalNotes ? (
                  <div className="mt-3 space-y-3 text-sm leading-6 text-text-secondary">
                    {meeting.body ? (
                      <p className="whitespace-pre-wrap">{meeting.body}</p>
                    ) : null}
                    {meeting.internalNotes ? (
                      <p className="whitespace-pre-wrap">{meeting.internalNotes}</p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </ActivityList>
      )}
    </section>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-text-inverse shadow-sm"
          : "text-text-secondary hover:bg-surface hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

function ActivityList({ children }: { children: ReactNode }) {
  return <div className="mt-6 space-y-4">{children}</div>;
}
