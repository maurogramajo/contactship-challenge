"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { SearchBar } from "@/components/ui/search-bar";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { apiFetch } from "@/lib/api/client";
import type { Contact } from "@/db/schema";

// ── Types ──────────────────────────────────────────────────────────────────

type SearchMode = "normal" | "ai";

export interface AISearchResult {
  contacts: Contact[];
  total: number;
  interpretation: string;
  page: number;
}

export interface AISearchBarProps {
  /** Current value of the normal text search */
  normalSearchValue: string;
  /** Called when the normal search input changes (debounced) */
  onNormalSearchChange: (value: string) => void;
  /** Called when AI search returns results — parent replaces table data */
  onAISearch: (result: AISearchResult) => void;
  /** Called when user switches back to normal mode — parent restores normal data */
  onClearAISearch: () => void;
  /** Current page for AI search pagination */
  page?: number;
  /** Page size for AI search pagination */
  pageSize?: number;
  /** Whether the parent is loading (e.g. from pagination change) */
  parentLoading?: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export function AISearchBar({
  normalSearchValue,
  onNormalSearchChange,
  onAISearch,
  onClearAISearch,
  page = 1,
  pageSize = 20,
  parentLoading = false,
}: AISearchBarProps) {
  const [mode, setMode] = useState<SearchMode>("normal");
  const [aiQuery, setAiQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [resultCount, setResultCount] = useState<number | null>(null);

  // Track whether this is the initial search (page 1) or a pagination change
  const lastSubmittedQuery = useRef<string>("");

  // ── Core AI search function ─────────────────────────────────────────────

  const executeAISearch = useCallback(
    async (query: string, searchPage: number, isPagination = false) => {
      setIsLoading(true);
      if (!isPagination) {
        setError(null);
        setInterpretation(null);
        setResultCount(null);
      }

      try {
        const data = await apiFetch<{
          results: Contact[];
          filters: unknown;
          interpretation: string;
          total: number;
        }>("/api/ai/search", {
          method: "POST",
          body: JSON.stringify({ query: query.trim(), page: searchPage, limit: pageSize }),
        });

        setInterpretation(data.interpretation);
        setResultCount(data.total);
        setError(null);
        onAISearch({
          contacts: data.results,
          total: data.total,
          interpretation: data.interpretation,
          page: searchPage,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Error al procesar la consulta";
        setError(message);
        // Fallback: don't replace table data — stay on current view
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize, onAISearch],
  );

  // ── Mode toggle ────────────────────────────────────────────────────────

  const switchToNormal = useCallback(() => {
    setMode("normal");
    setError(null);
    setInterpretation(null);
    setResultCount(null);
    lastSubmittedQuery.current = "";
    onClearAISearch();
  }, [onClearAISearch]);

  const switchToAI = useCallback(() => {
    setMode("ai");
    setError(null);
    // Don't clear interpretation/resultCount — preserve previous AI results
  }, []);

  // ── AI search submit (initial search, page 1) ──────────────────────────

  const handleAISubmit = useCallback(
    async (e?: React.SyntheticEvent) => {
      e?.preventDefault();

      const trimmed = aiQuery.trim();
      if (trimmed.length < 3) {
        setError("La consulta debe tener al menos 3 caracteres");
        return;
      }

      lastSubmittedQuery.current = trimmed;
      await executeAISearch(trimmed, 1, false);
    },
    [aiQuery, executeAISearch],
  );

  // ── React to page changes for AI pagination ────────────────────────────

  const prevPageRef = useRef(page);

  useEffect(() => {
    // Only re-search if page changed AND we're in AI mode AND we have a valid query
    if (
      mode === "ai" &&
      page !== prevPageRef.current &&
      lastSubmittedQuery.current.trim().length >= 3
    ) {
      prevPageRef.current = page;
      executeAISearch(lastSubmittedQuery.current, page, true);
    } else {
      prevPageRef.current = page;
    }
  }, [page, mode, executeAISearch]);

  // ── Render ─────────────────────────────────────────────────────────────

  const showLoading = isLoading || parentLoading;

  return (
    <div className="space-y-4">
      {/* Mode toggle pills */}
      <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 w-fit">
        <button
          type="button"
          onClick={switchToNormal}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "normal"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Búsqueda normal
        </button>
        <button
          type="button"
          onClick={switchToAI}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === "ai"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Búsqueda IA
        </button>
      </div>

      {/* Normal search mode */}
      {mode === "normal" && (
        <SearchBar
          value={normalSearchValue}
          onChange={onNormalSearchChange}
          placeholder="Buscar contactos..."
          debounceMs={300}
        />
      )}

      {/* AI search mode */}
      {mode === "ai" && (
        <form onSubmit={handleAISubmit} className="space-y-3">
          <div className="relative">
            {/* Sparkle icon */}
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary-400 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>

            <input
              type="text"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ej: leads sin actividad en 30 días"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-11 pr-24 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              disabled={showLoading}
              aria-label="Consulta de búsqueda con IA"
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={showLoading || aiQuery.trim().length < 3}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showLoading ? (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="h-3 w-3 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  Buscando
                </span>
              ) : (
                "Buscar"
              )}
            </button>
          </div>

          {/* Loading state */}
          {showLoading && mode === "ai" && (
            <div className="space-y-2">
              <p className="text-sm text-neutral-500 animate-pulse">
                Analizando consulta...
              </p>
              <LoadingSkeleton rows={5} cols={4} />
            </div>
          )}

          {/* Error state */}
          {error && !showLoading && (
            <div className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Interpretation text */}
          {interpretation && !showLoading && !error && (
            <p className="text-sm text-neutral-600">
              Mostrando{" "}
              <span className="font-semibold text-neutral-900">
                {resultCount}
              </span>{" "}
              resultados:{" "}
              <span className="text-neutral-500">{interpretation}</span>
            </p>
          )}
        </form>
      )}
    </div>
  );
}
