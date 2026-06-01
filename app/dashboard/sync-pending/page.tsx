import { listSyncTasksByOrganizationId } from "@/db/repository";
import { requireCurrentOrganization } from "@/lib/session";

function formatDate(date: Date | null): string {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const STATUS_CONFIG = {
  pending: {
    label: "⏳ Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  completed: {
    label: "✅ Completed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  failed: {
    label: "❌ Failed",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
} as const;

export default async function SyncPendingPage() {
  const organization = await requireCurrentOrganization();
  const tasks = await listSyncTasksByOrganizationId(organization.id);

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-3 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.18)]">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          Sync Pendientes
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Visualizar el estado de las sincronizaciones pendientes, completadas y fallidas con HubSpot.
        </p>
      </section>

      <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <th className="px-4 py-3">Fecha de creación</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Retry Count</th>
                <th className="px-4 py-3">Ejecutado el</th>
                <th className="px-4 py-3">Último error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    No hay sincronizaciones registradas todavía.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const status = STATUS_CONFIG[task.status];

                  return (
                    <tr key={task.id} className="align-top text-sm text-slate-700">
                      <td className="px-4 py-4">{formatDate(task.created_at)}</td>
                      <td className="px-4 py-4 font-medium text-slate-950">
                        {task.type}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">{task.retry_count}</td>
                      <td className="px-4 py-4">{formatDate(task.executed_at)}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {task.last_error ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
