"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CreateContactModal } from "@/components/contacts/create-contact-modal";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { SearchBar } from "@/components/ui/search-bar";
import { api, apiFetch } from "@/lib/api/client";
import type { Contact } from "@/db/schema";
import {
  HUBSPOT_LIFECYCLE_STAGE_VALUES,
  HUBSPOT_LEAD_STATUS_VALUES,
} from "@/lib/ai/hubspot-classification";

// ── Types ──────────────────────────────────────────────────────────────────

interface PaginatedResponse {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage?: boolean;
  nextAfter?: string;
  totalIsApproximate?: boolean;
}

interface HubSpotStatusResponse {
  connected: boolean;
}

interface CreateContactResponse {
  contact: {
    id: string;
    full_name: string | null;
    external_id: string | null;
    source: string | null;
  };
  syncPending: boolean;
  message?: string;
}

// ── Page size ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

// ── Page Component ─────────────────────────────────────────────────────────

export default function ContactsPage() {
  // Data
  const [result, setResult] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hubSpotConnected, setHubSpotConnected] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Search state
  const [search, setSearch] = useState("");
  const [lifecycleStage, setLifecycleStage] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [page, setPage] = useState(1);
  const [cursorByPage, setCursorByPage] = useState<Record<number, string>>({});

  // Track fetch for cleanup (abort stale normal-search requests)
  const abortRef = useRef<AbortController | null>(null);

  // ── Normal search fetch ─────────────────────────────────────────────────

  const fetchNormalContacts = useCallback(
    async (
      search: string,
      fetchPage: number,
      lifecycle?: string,
      leadStatusFilter?: string,
      after?: string,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(fetchPage));
        params.set("limit", String(PAGE_SIZE));
        if (after) {
          params.set("after", after);
        }
        if (search.trim()) {
          params.set("search", search.trim());
        }
        if (lifecycle?.trim()) {
          params.set("lifecycle_stage", lifecycle.trim());
        }
        if (leadStatusFilter?.trim()) {
          params.set("lead_status", leadStatusFilter.trim());
        }

        const data = await apiFetch<PaginatedResponse>(
          `/api/contacts?${params.toString()}`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        setResult(data);
        if (data.nextAfter) {
          setCursorByPage((current) => ({
            ...current,
            [fetchPage + 1]: data.nextAfter as string,
          }));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Error al cargar contactos";
        setError(message);
        setResult(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // ── Normal search input change ─────────────────────────────────────────

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    setCursorByPage({});
    fetchNormalContacts(value, 1, lifecycleStage, leadStatus);
  }

  function handleLifecycleStageChange(value: string) {
    setLifecycleStage(value);
    setPage(1);
    setCursorByPage({});
    fetchNormalContacts(search, 1, value, leadStatus);
  }

  function handleLeadStatusChange(value: string) {
    setLeadStatus(value);
    setPage(1);
    setCursorByPage({});
    fetchNormalContacts(search, 1, lifecycleStage, value);
  }

  // ── Pagination ─────────────────────────────────────────────────────────

  function handlePageChange(newPage: number) {
    const isCursorPaginated = Boolean(
      result?.totalIsApproximate || result?.nextAfter || result?.hasNextPage,
    );
    const after = newPage > 1 ? cursorByPage[newPage] : undefined;

    if (isCursorPaginated && newPage > page && !after) {
      return;
    }

    setPage(newPage);
    fetchNormalContacts(search, newPage, lifecycleStage, leadStatus, after);
  }

  // ── Initial load ───────────────────────────────────────────────────────

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchNormalContacts("", 1, lifecycleStage, leadStatus);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchNormalContacts, lifecycleStage, leadStatus]);

  useEffect(() => {
    api
      .get<HubSpotStatusResponse>("/api/hubspot/status")
      .then((data) => {
        setHubSpotConnected(data.connected);
      })
      .catch(() => {
        setHubSpotConnected(false);
      });
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [feedbackMessage]);

  function handleContactCreated(result: CreateContactResponse) {
    setFeedbackMessage(
      result.syncPending
        ? result.message ??
            `Contacto ${result.contact.full_name ?? "sin nombre"} guardado y pendiente de sincronización con HubSpot.`
        : `Contacto ${result.contact.full_name ?? "sin nombre"} creado correctamente.`,
    );
    setSearch("");
    setPage(1);
    setCursorByPage({});
    void fetchNormalContacts("", 1, lifecycleStage, leadStatus);
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="relative flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Contactos
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Buscá coincidencias por nombre, email o teléfono.
            </p>
          </div>
          <div className="h-fit rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm sm:min-w-32 sm:self-start">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Total
            </p>
            <p className="mt-0.5 text-2xl font-semibold leading-none text-slate-950">
              {result && !loading ? result.total : "—"}
              {result?.totalIsApproximate ? "+" : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1">
            <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center">
              <div className="min-w-0 flex-1 xl:max-w-3xl">
                <SearchBar
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="Buscar por nombre, email o teléfono"
                  debounceMs={250}
                />
              </div>
              <select
                value={lifecycleStage}
                onChange={(e) => handleLifecycleStageChange(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 xl:min-w-56"
              >
                <option value="">Todos los lifecycles</option>
                {HUBSPOT_LIFECYCLE_STAGE_VALUES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <select
                value={leadStatus}
                onChange={(e) => handleLeadStatusChange(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 xl:min-w-56"
              >
                <option value="">Todos los estados</option>
                {HUBSPOT_LEAD_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="lg:shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Crear contacto
            </button>
          </div>
        </div>
        {feedbackMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {feedbackMessage}
          </div>
        ) : null}
      </section>

      {/* Table */}
      <ContactsTable
        result={result}
        loading={loading}
        error={error}
        onPageChange={handlePageChange}
      />
      <CreateContactModal
        open={isCreateModalOpen}
        hubSpotConnected={hubSpotConnected}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleContactCreated}
      />
    </div>
  );
}
