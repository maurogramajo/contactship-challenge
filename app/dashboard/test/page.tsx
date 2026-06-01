"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";

type TestKey = "hubspot-basic" | "local-queue" | "advanced";

interface TestStatus {
  hubSpotConnected: boolean;
  syncQueue: {
    pending: number;
    failed: number;
    completed: number;
  };
}

interface CreatedContact {
  id: string;
  name: string;
  href: string;
  source: "hubspot" | "local";
}

interface TestResult {
  scenario: TestKey;
  created: CreatedContact[];
  message: string;
}

interface TestResponse {
  result: TestResult;
  status: TestStatus;
}

const TESTS: Array<{
  key: TestKey;
  title: string;
  condition: "connected" | "disconnected";
  description: string;
  outcome: string;
}> = [
  {
    key: "hubspot-basic",
    title: "Test 1",
    condition: "connected",
    description: "Crea 5 contactos en HubSpot con notas y tareas, sin materializarlos localmente.",
    outcome: "Permite listar contactos desde HubSpot y generar insights con actividad de HubSpot.",
  },
  {
    key: "local-queue",
    title: "Test 2",
    condition: "disconnected",
    description: "Crea 3 contactos desde el flujo normal de la plataforma con HubSpot desconectado.",
    outcome: "Permite ver contactos locales y cola de sync pendiente.",
  },
  {
    key: "advanced",
    title: "Test 3",
    condition: "connected",
    description:
      "Crea 2 contactos con notas, tareas, meetings, llamadas y comentarios en distintos estados.",
    outcome: "Permite comparar el razonamiento del insight según actividad y madurez del contacto.",
  },
];

export default function TestDataPage() {
  const [status, setStatus] = useState<TestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<TestKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await api.get<TestStatus>("/api/test-data"));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el estado de test.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function runTest(test: TestKey) {
    setRunning(test);
    setError(null);
    try {
      const response = await api.post<TestResponse>("/api/test-data", { test });
      setStatus(response.status);
      setResults((current) => [response.result, ...current]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo crear la data de test.",
      );
    } finally {
      setRunning(null);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadStatus]);

  const hubSpotConnected = status?.hubSpotConnected ?? false;

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Testing
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
              Data de prueba rápida
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Ejecuta escenarios para validar listado de contactos, cola de sync
              y generación de insights con contexto real.
            </p>
          </div>

          <div className="grid min-w-64 grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Metric label="Pendientes" value={status?.syncQueue.pending ?? 0} />
            <Metric label="Fallidas" value={status?.syncQueue.failed ?? 0} />
            <Metric label="Completadas" value={status?.syncQueue.completed ?? 0} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={hubSpotConnected ? "success" : "warning"}>
            {hubSpotConnected ? "HubSpot conectado" : "HubSpot desconectado"}
          </Badge>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar estado"}
          </button>
          <Link
            href="/dashboard/sync-pending"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ver cola de sync
          </Link>
        </div>

        {error ? (
          <div className="rounded-xl border border-error/20 bg-error-light px-4 py-3 text-sm font-medium text-error-foreground">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {TESTS.map((test) => {
          const enabled =
            status &&
            (test.condition === "connected" ? hubSpotConnected : !hubSpotConnected);
          const disabledReason =
            test.condition === "connected"
              ? "Disponible solo con HubSpot conectado."
              : "Disponible solo con HubSpot desconectado.";

          return (
            <article
              key={test.key}
              className="flex min-h-72 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {test.title}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {test.key === "hubspot-basic"
                      ? "HubSpot básico"
                      : test.key === "local-queue"
                        ? "Cola local"
                        : "Insight avanzado"}
                  </h2>
                </div>
                <Badge variant={test.condition === "connected" ? "hubspot" : "info"}>
                  {test.condition === "connected" ? "Con conexión" : "Sin conexión"}
                </Badge>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                {test.description}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                {test.outcome}
              </p>

              <div className="mt-auto pt-5">
                {!enabled ? (
                  <p className="mb-3 text-xs font-medium text-slate-500">
                    {disabledReason}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void runTest(test.key)}
                  disabled={!enabled || running !== null}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {running === test.key ? "Creando data..." : "Crear data"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {results.length > 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Últimas ejecuciones
          </h2>
          <div className="mt-4 space-y-4">
            {results.map((result, index) => (
              <article
                key={`${result.scenario}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="success">{result.scenario}</Badge>
                    <p className="mt-2 text-sm font-medium text-slate-800">
                      {result.message}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/contacts"
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    Ver contactos
                  </Link>
                </div>

                <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {result.created.map((contact) => (
                    <Link
                      key={contact.id}
                      href={contact.href}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      {contact.name}
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-center">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
