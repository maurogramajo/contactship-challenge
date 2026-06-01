"use client";

import { useCallback, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { api, ApiError } from "@/lib/api/client";
import type {
  ActionStatus,
  ActionType,
  ActionableAction,
} from "@/db/zod/actionable";
import type { ActionableData } from "@/lib/actionables";

interface InsightsPanelProps {
  actionables: ActionableData[];
  onActionableUpdated?: (actionable: ActionableData) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ChannelKey = "whatsapp" | "call" | "email" | "instagram";

const CHANNEL_CONFIG: Record<
  ChannelKey,
  { label: string; className: string; icon: React.ReactNode }
> = {
  whatsapp: {
    label: "WhatsApp",
    className: "bg-green-50 text-green-700 border-green-200",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M8 1a7 7 0 0 0-5.98 10.52L1 15l3.62-.98A7 7 0 1 0 8 1Zm0 1.2a5.8 5.8 0 0 1 4.13 9.86l-.24.24.62 2.04-2.12-.58-.25.16A5.8 5.8 0 1 1 8 2.2Z" />
        <path d="M5.83 4.5c-.18 0-.47.07-.72.33-.24.27-.94.92-.94 2.25s.97 2.6 1.1 2.78c.13.18 1.85 2.97 4.58 4.04 2.18.86 2.75.72 3.22.64.55-.1 1.56-.65 1.78-1.28.22-.63.22-1.17.16-1.28-.07-.11-.24-.18-.5-.31-.26-.13-1.56-.77-1.8-.86-.24-.09-.42-.13-.6.13-.17.26-.68.86-.84 1.04-.15.17-.3.2-.56.06-.26-.13-1.1-.4-2.09-1.29-.77-.69-1.3-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.4-.46.13-.17.17-.3.26-.49.09-.2.04-.37-.02-.52-.06-.14-.57-1.42-.8-1.94-.22-.5-.44-.43-.6-.44Z" />
      </svg>
    ),
  },
  call: {
    label: "Llamada",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.45 2.07c.67-.66 1.76-.68 2.47-.05l1.4 1.25c.66.58.74 1.6.2 2.3l-.5.64c-.28.36-.29.82.04 1.2a12.1 12.1 0 0 0 4.53 4.53c.38.33.84.32 1.2.04l.64-.5c.7-.54 1.72-.46 2.3.2l1.25 1.4c.63.7.6 1.8-.05 2.47l-.8.8c-.58.6-1.46.83-2.27.57a14.27 14.27 0 0 1-8.35-8.35C2.24 5.27 2.47 4.38 3.06 3.8l.8-.8-.6-.61v-.02Z" />
      </svg>
    ),
  },
  email: {
    label: "Email",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
        <path d="m1.5 4 6.03 4.3a1 1 0 0 0 1.18 0L14.5 4" />
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="1.5" y="1.5" width="13" height="13" rx="3.5" />
        <circle cx="8" cy="8" r="3.25" />
        <circle cx="12.5" cy="3.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
};

const ACTION_CONFIG: Record<ActionType, { label: string; button: string }> = {
  create_note: {
    label: "Nota",
    button: "Crear nota en HubSpot",
  },
  create_task: {
    label: "Tarea",
    button: "Crear tarea en HubSpot",
  },
  create_meeting: {
    label: "Reunión",
    button: "Agendar reunión en HubSpot",
  },
};

const STATUS_CONFIG: Record<
  ActionStatus,
  { label: string; className: string }
> = {
  available: {
    label: "Disponible",
    className: "border-gray-200 bg-gray-50 text-gray-700",
  },
  pending: {
    label: "Pendiente",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  executed: {
    label: "Ejecutada",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
};

function getChannelConfig(channel: string | null | undefined): {
  label: string;
  className: string;
  icon: React.ReactNode;
} | null {
  if (!channel) return null;

  const key = channel.toLowerCase() as ChannelKey;
  if (key in CHANNEL_CONFIG) {
    return CHANNEL_CONFIG[key];
  }

  return {
    label: channel,
    className: "bg-gray-50 text-gray-600 border-gray-200",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 4.5v7M4.5 8h7" />
      </svg>
    ),
  };
}

function getActionButtonLabel(action: ActionableAction, isLoading: boolean) {
  if (isLoading) return "Ejecutando...";
  if (action.status === "executed") return "Sincronizada";
  if (action.status === "pending") return "Reintentar sincronización";
  return ACTION_CONFIG[action.type].button;
}

function ChevronLeft() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m10 3-5 5 5 5" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m4 10 4-4 4 4" />
    </svg>
  );
}

export function InsightsPanel({
  actionables,
  onActionableUpdated,
}: InsightsPanelProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(
    new Set(),
  );
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>(
    {},
  );
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});

  const handleExecuteAction = useCallback(
    async (actionableId: string, actionId: string) => {
      const actionKey = `${actionableId}:${actionId}`;

      setLoadingActions((prev) => ({ ...prev, [actionKey]: true }));
      setActionErrors((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });

      try {
        const data = await api.post<{
          actionable: ActionableData;
          status: "executed" | "pending";
          message?: string;
        }>(`/api/actionables/${actionableId}/actions/${actionId}`);

        onActionableUpdated?.(data.actionable);
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : "Error al ejecutar la acción en HubSpot.";

        setActionErrors((prev) => ({ ...prev, [actionKey]: message }));
      } finally {
        setLoadingActions((prev) => {
          const next = { ...prev };
          delete next[actionKey];
          return next;
        });
      }
    },
    [onActionableUpdated],
  );

  function toggleReasoning(id: string) {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (actionables.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <div className="border-b border-border pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Insights IA
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            Recomendaciones de seguimiento
          </h2>
        </div>
        <div className="mt-2">
          <EmptyState title="No hay insights generados aún" />
        </div>
      </section>
    );
  }

  const currentIndex = activeIndex >= actionables.length ? 0 : activeIndex;
  const currentInsight = actionables[currentIndex] ?? actionables[0];
  const currentChannel = getChannelConfig(currentInsight.recommended_channel);
  const reasoningExpanded = expandedReasoning.has(currentInsight.id);

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Insights IA
          </p>
          <h2 className="mt-1 text-lg font-semibold text-text-primary">
            Recomendaciones de seguimiento
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Navega entre insights y sincroniza acciones concretas con HubSpot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setActiveIndex((prev) =>
                prev === 0 ? actionables.length - 1 : prev - 1,
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-secondary text-text-secondary transition-colors hover:border-primary-subtle hover:bg-primary-light hover:text-primary"
            aria-label="Insight anterior"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndex((prev) =>
                prev === actionables.length - 1 ? 0 : prev + 1,
              )
            }
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-secondary text-text-secondary transition-colors hover:border-primary-subtle hover:bg-primary-light hover:text-primary"
            aria-label="Siguiente insight"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <article className="mt-6 rounded-2xl border border-border-light bg-surface-secondary p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
              Insight {currentIndex + 1} de {actionables.length}
            </span>
            {currentChannel && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium ${currentChannel.className}`}
              >
                {currentChannel.icon}
                {currentChannel.label}
              </span>
            )}
          </div>

          <time className="text-xs text-text-tertiary">
            {formatDate(currentInsight.created_at)}
          </time>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.95fr)]">
          <div>
            <p className="text-sm leading-7 text-text-primary">
              {currentInsight.summary || "Insight sin resumen."}
            </p>

            {currentInsight.draft_message && (
              <div className="mt-5 rounded-xl border border-border-light bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Borrador sugerido
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {currentInsight.draft_message}
                </p>
              </div>
            )}

            {currentInsight.reasoning && (
              <div className="mt-5 rounded-xl border border-border-light bg-surface p-4">
                <button
                  type="button"
                  onClick={() => toggleReasoning(currentInsight.id)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  {reasoningExpanded ? <ChevronUp /> : <ChevronDown />}
                  Ver razonamiento
                </button>

                {reasoningExpanded && (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {currentInsight.reasoning}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border-light bg-surface p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Acciones recomendadas
            </p>

            {currentInsight.actions.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                Este insight no incluye acciones sincronizables.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {currentInsight.actions.map((action) => {
                  const actionKey = `${currentInsight.id}:${action.id}`;
                  const statusConfig = STATUS_CONFIG[action.status];
                  const actionConfig = ACTION_CONFIG[action.type];
                  const isLoading = loadingActions[actionKey] ?? false;

                  return (
                    <li
                      key={action.id}
                      className="rounded-xl border border-border-light bg-surface-secondary p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                          {actionConfig.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusConfig.className}`}
                        >
                          {statusConfig.label}
                        </span>
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-text-primary">
                        {action.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {action.description}
                      </p>
                      <p className="mt-2 text-xs text-text-tertiary">
                        Sugerido para {formatDate(action.suggestedExecutionAt)}
                      </p>

                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() =>
                          void handleExecuteAction(currentInsight.id, action.id)
                        }
                        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {getActionButtonLabel(action, isLoading)}
                      </button>

                      {actionErrors[actionKey] && (
                        <p className="mt-3 rounded-lg border border-error/15 bg-error-light px-3 py-2 text-sm text-error-foreground">
                          {actionErrors[actionKey]}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </article>

      <div className="mt-5 flex items-center justify-center gap-2">
        {actionables.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Ver insight ${index + 1}`}
            className={`h-2.5 rounded-full transition-all ${
              index === currentIndex
                ? "w-8 bg-primary"
                : "w-2.5 bg-primary/25 hover:bg-primary/45"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
