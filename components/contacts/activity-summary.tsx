"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface CallData {
  id: string;
  call_time: string | null;
  duration: number | null;
  direction: "inbound" | "outbound" | null;
  status: "answered" | "missed" | "rejected" | "busy" | "failed" | null;
}

interface CommentData {
  id: string;
  content: string;
  user_name: string | null;
  created_at: string | null;
}

interface TagData {
  id: string;
  name: string;
  color: string | null;
}

interface ActivitySummaryProps {
  calls: CallData[];
  comments: CommentData[];
  tags: TagData[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function directionLabel(dir: string | null): string {
  if (dir === "inbound") return "Entrante";
  if (dir === "outbound") return "Saliente";
  return "—";
}

function statusLabel(status: string | null): string {
  const map: Record<string, string> = {
    answered: "Respondida",
    missed: "Perdida",
    rejected: "Rechazada",
    busy: "Ocupado",
    failed: "Fallida",
  };
  return status ? map[status] ?? status : "—";
}

function statusBadgeVariant(status: string | null): "success" | "warning" | "error" | "info" {
  if (status === "answered") return "success";
  if (status === "missed") return "warning";
  if (status === "rejected" || status === "failed") return "error";
  return "info";
}

export function ActivitySummary({ calls, comments, tags }: ActivitySummaryProps) {
  const hasActivity = calls.length > 0 || comments.length > 0 || tags.length > 0;

  if (!hasActivity) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-primary">Actividad</h2>
        <EmptyState title="Sin actividad registrada" />
      </div>
    );
  }

  const inboundCount = calls.filter((c) => c.direction === "inbound").length;
  const outboundCount = calls.filter((c) => c.direction === "outbound").length;
  const answeredCount = calls.filter((c) => c.status === "answered").length;
  const answeredRate = calls.length > 0 ? Math.round((answeredCount / calls.length) * 100) : 0;
  const lastCallDate = calls[0]?.call_time ?? null;

  const recentCalls = calls.slice(0, 5);
  const recentComments = comments.slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card space-y-6">
      <h2 className="text-lg font-semibold text-text-primary">Actividad</h2>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total llamadas" value={calls.length} />
        <Stat label="Respondidas" value={`${answeredRate}%`} />
        <Stat label="Entrantes" value={inboundCount} />
        <Stat label="Salientes" value={outboundCount} />
      </div>

      {lastCallDate && (
        <p className="text-xs text-text-tertiary">
          Última llamada: {formatDate(lastCallDate)}
        </p>
      )}

      {tags.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Etiquetas
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag.id} variant="tag">
                {tag.color && (
                  <span
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                )}
                {tag.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {recentCalls.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Últimas llamadas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-tertiary">
                  <th className="pb-2 pr-4 font-medium">Fecha</th>
                  <th className="pb-2 pr-4 font-medium">Dirección</th>
                  <th className="pb-2 pr-4 font-medium">Estado</th>
                  <th className="pb-2 font-medium">Duración</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-border-light last:border-0">
                    <td className="py-2 pr-4 text-text-secondary">
                      {formatDate(call.call_time)}
                    </td>
                    <td className="py-2 pr-4 text-text-secondary">
                      {directionLabel(call.direction)}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={statusBadgeVariant(call.status)}>
                        {statusLabel(call.status)}
                      </Badge>
                    </td>
                    <td className="py-2 font-mono text-text-secondary">
                      {formatDuration(call.duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {recentComments.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Últimos comentarios
          </h3>
          <ul className="space-y-3">
            {recentComments.map((comment) => (
              <li key={comment.id} className="rounded-lg bg-surface-secondary p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text-primary">
                    {comment.user_name ?? "Usuario"}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-secondary">{comment.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-surface-secondary px-3 py-2.5 text-center">
      <div className="text-xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-tertiary">{label}</div>
    </div>
  );
}
