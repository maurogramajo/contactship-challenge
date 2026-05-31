"use client";

import { EmptyState } from "@/components/ui/empty-state";

interface ActionableData {
  id: string;
  summary: string | null;
  actions: string[];
  created_at: string;
}

interface InsightsPanelProps {
  actionables: ActionableData[];
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

export function InsightsPanel({ actionables }: InsightsPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <h2 className="text-lg font-semibold text-text-primary">Insights IA</h2>

      {actionables.length === 0 ? (
        <EmptyState title="No hay insights generados aún" />
      ) : (
        <ul className="mt-4 space-y-4">
          {actionables.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border-light bg-surface-secondary p-4"
            >
              <time className="text-xs text-text-tertiary">
                {formatDate(item.created_at)}
              </time>
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
