"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api/client";

interface HeaderProps {
  organizationName: string;
  organizationEmail: string;
  hubSpotConnected: boolean;
}

export function Header({
  organizationName,
  organizationEmail,
  hubSpotConnected,
}: HeaderProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <h1 className="text-lg font-semibold tracking-tight text-neutral-900">ContactShip</h1>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-neutral-900">
            {organizationName}
          </p>
          <p className="text-xs text-neutral-500">{organizationEmail}</p>
        </div>
        <Link
          href="/dashboard/settings"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
            hubSpotConnected
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100"
              : "border-primary/20 bg-primary-light text-primary hover:border-primary/30 hover:bg-primary-subtle"
          }`}
        >
          {hubSpotConnected ? (
            <>
              <span
                className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.16)]"
                aria-hidden="true"
              />
              HubSpot conectado
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Conectar con HubSpot
            </>
          )}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loading}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          {loading ? "Saliendo..." : "Salir"}
        </button>
      </div>
    </header>
  );
}
