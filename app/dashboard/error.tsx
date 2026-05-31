"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        Algo salió mal
      </p>
      <p className="text-sm text-neutral-500 dark:text-neutral-500">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
