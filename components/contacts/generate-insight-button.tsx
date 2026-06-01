"use client";

import { useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api/client";
import type { ActionableData } from "@/lib/actionables";

interface GenerateInsightButtonProps {
  contactId: string;
  onSuccess: (actionable: ActionableData) => void;
}

export function GenerateInsightButton({
  contactId,
  onSuccess,
}: GenerateInsightButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.post<{ actionable: ActionableData }>(
        "/api/ai/insights",
        { contactId },
      );

      onSuccess(data.actionable);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Error al generar insights. Intenta de nuevo.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [contactId, onSuccess]);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse shadow-sm transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner />
            Generando insights...
          </>
        ) : (
          <>
            <SparkleIcon />
            Generar Insights IA
          </>
        )}
      </button>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/15 bg-error-light px-3 py-2 text-sm text-error-foreground"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
  );
}

function SparkleIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
      />
    </svg>
  );
}
