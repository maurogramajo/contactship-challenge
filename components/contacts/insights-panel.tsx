"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { api, ApiError } from "@/lib/api/client";

interface ActionableData {
  id: string;
  summary: string | null;
  actions: string[];
  created_at: string;
  recommended_channel?: string | null;
  recommended_action?: string | null;
  draft_message?: string | null;
  reasoning?: string | null;
}

interface InsightsPanelProps {
  actionables: ActionableData[];
  hubspotScopes?: string[];
  contactId?: string;
  contactExternalId?: string | null;
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
    className:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
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
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
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
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
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
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
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

function getChannelConfig(channel: string | null | undefined): {
  label: string;
  className: string;
  icon: React.ReactNode;
} | null {
  if (!channel) return null;
  const key = channel.toLowerCase() as ChannelKey;
  if (key in CHANNEL_CONFIG) return CHANNEL_CONFIG[key];
  return {
    label: channel,
    className:
      "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700",
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

type NoteState = "idle" | "loading" | "created" | "error";

export function InsightsPanel({
  actionables,
  hubspotScopes,
  contactId,
  contactExternalId,
}: InsightsPanelProps) {
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(
    new Set(),
  );
  const [noteStates, setNoteStates] = useState<Record<string, NoteState>>({});
  const [noteErrors, setNoteErrors] = useState<Record<string, string>>({});

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

  const handleCreateNote = useCallback(
    async (actionableId: string, draftMessage: string) => {
      if (!contactId) return;

      setNoteStates((prev) => ({ ...prev, [actionableId]: "loading" }));
      setNoteErrors((prev) => {
        const next = { ...prev };
        delete next[actionableId];
        return next;
      });

      try {
        await api.post("/api/hubspot/notes", {
          contactId,
          note: draftMessage,
        });
        setNoteStates((prev) => ({ ...prev, [actionableId]: "created" }));
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Error al crear la nota en HubSpot.";
        setNoteErrors((prev) => ({ ...prev, [actionableId]: message }));
        setNoteStates((prev) => ({ ...prev, [actionableId]: "error" }));
      }
    },
    [contactId],
  );

  const hasNoteWriteScope =
    hubspotScopes?.includes("crm.objects.notes.write") ?? false;
  const canCreateNotes = !!contactExternalId && !!contactId;

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-primary">Insights IA</h2>

      {actionables.length === 0 ? (
        <EmptyState title="No hay insights generados aún" />
      ) : (
        <ul className="mt-4 space-y-4">
          {actionables.map((item) => {
            const channelConfig = getChannelConfig(item.recommended_channel);
            const reasoningExpanded = expandedReasoning.has(item.id);

            return (
              <li
                key={item.id}
                className="rounded-lg border border-border-light bg-surface-secondary p-4"
              >
                <time className="text-xs text-text-tertiary">
                  {formatDate(item.created_at)}
                </time>

                {channelConfig && (
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${channelConfig.className}`}
                  >
                    {channelConfig.icon}
                    {channelConfig.label}
                  </span>
                )}

                {item.summary && (
                  <p className="mt-2 text-sm leading-relaxed text-text-primary">
                    {item.summary}
                  </p>
                )}

                {item.actions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {item.actions.map((action, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {action}
                      </li>
                    ))}
                  </ul>
                )}

                {item.draft_message && (
                  <div className="mt-3 rounded-md bg-surface-secondary border-l-2 border-primary/30 px-3 py-2">
                    <p className="text-xs text-text-tertiary mb-1">
                      Mensaje sugerido:
                    </p>
                    <p className="text-sm italic text-text-secondary">
                      &ldquo;{item.draft_message}&rdquo;
                    </p>
                  </div>
                )}

                {/* HubSpot note button — visible only for HubSpot-synced contacts with draft_message */}
                {canCreateNotes && item.draft_message && (
                  <div className="mt-3">
                    {hasNoteWriteScope ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleCreateNote(item.id, item.draft_message!)
                          }
                          disabled={
                            noteStates[item.id] === "loading" ||
                            noteStates[item.id] === "created"
                          }
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {noteStates[item.id] === "loading" ? (
                            <>
                              <svg
                                className="h-4 w-4 animate-spin"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              Creando...
                            </>
                          ) : noteStates[item.id] === "created" ? (
                            <>
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Nota creada
                            </>
                          ) : (
                            "Crear nota en HubSpot"
                          )}
                        </button>
                        {noteStates[item.id] === "error" &&
                          noteErrors[item.id] && (
                            <p
                              role="alert"
                              className="mt-2 text-xs text-error-foreground"
                            >
                              {noteErrors[item.id]}
                            </p>
                          )}
                      </>
                    ) : (
                      <div className="space-y-1">
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface-secondary px-3.5 py-2 text-sm font-medium text-text-tertiary cursor-not-allowed opacity-60"
                        >
                          Crear nota en HubSpot
                        </button>
                        <p className="text-xs text-text-tertiary">
                          Requiere permiso crm.objects.notes.write
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {item.reasoning && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => toggleReasoning(item.id)}
                      className="inline-flex items-center gap-1 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
                    >
                      {reasoningExpanded ? <ChevronUp /> : <ChevronDown />}
                      {reasoningExpanded
                        ? "Ocultar razonamiento"
                        : "Ver razonamiento"}
                    </button>
                    {reasoningExpanded && (
                      <div className="mt-2 rounded-md bg-surface-tertiary border border-border-light px-3 py-2">
                        <p className="text-xs leading-relaxed text-text-tertiary whitespace-pre-wrap">
                          {item.reasoning}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
