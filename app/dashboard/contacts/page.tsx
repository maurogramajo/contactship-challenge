"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { SearchBar } from "@/components/ui/search-bar";
import { apiFetch } from "@/lib/api/client";
import type { Contact } from "@/db/schema";

// ── Types ──────────────────────────────────────────────────────────────────

interface PaginatedResponse {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Page size ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ── Page Component ─────────────────────────────────────────────────────────

export default function ContactsPage() {
  // Data
  const [result, setResult] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [search, setSearch] = useState("");
  const [, setPage] = useState(1);

  // Track fetch for cleanup (abort stale normal-search requests)
  const abortRef = useRef<AbortController | null>(null);

  // ── Normal search fetch ─────────────────────────────────────────────────

  const fetchNormalContacts = useCallback(
    async (search: string, fetchPage: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(fetchPage));
        params.set("limit", String(PAGE_SIZE));
        if (search.trim()) {
          params.set("search", search.trim());
        }

        const data = await apiFetch<PaginatedResponse>(
          `/api/contacts?${params.toString()}`,
          { signal: controller.signal },
        );

        if (controller.signal.aborted) return;

        setResult(data);
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
    fetchNormalContacts(value, 1);
  }

  // ── Pagination ─────────────────────────────────────────────────────────

  function handlePageChange(newPage: number) {
    setPage(newPage);
    fetchNormalContacts(search, newPage);
  }

  // ── Initial load ───────────────────────────────────────────────────────

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchNormalContacts("", 1);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchNormalContacts]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <section className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-6 shadow-[0_20px_40px_-28px_rgba(15,23,42,0.18)]">
        <div className="relative flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            Contactos
          </h1>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl space-y-3">
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Busca coincidencias por nombre, email o teléfono.
            </p>
            <SearchBar
              value={search}
              onChange={handleSearchChange}
              placeholder="Buscar por nombre, email o teléfono"
              debounceMs={250}
            />
          </div>
          <div className="h-fit rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm lg:min-w-32">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Encontrados
            </p>
            <p className="mt-0.5 text-2xl font-semibold leading-none text-slate-950">
              {result && !loading ? result.total : "—"}
            </p>
          </div>
        </div>
      </section>

      {/* Table */}
      <ContactsTable
        result={result}
        loading={loading}
        error={error}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
