"use client";

import { useState, useCallback } from "react";
import { InsightsPanel } from "./insights-panel";
import { GenerateInsightButton } from "./generate-insight-button";
import type { Contact } from "@/db/schema/contacts";
import {
  type ActionableData,
  type StoredContactActionable,
} from "@/lib/actionables";

interface ContactDetailClientProps {
  contact: Contact;
  initialInsights: StoredContactActionable[];
}

export default function ContactDetailClient({
  contact,
  initialInsights,
}: ContactDetailClientProps) {
  const [insights, setInsights] = useState<ActionableData[]>(
    initialInsights.map((item) => ({
      id: item.id,
      summary: item.summary,
      actions: item.actions,
      created_at: String(item.created_at),
      recommended_channel: item.recommended_channel,
      draft_message: item.draft_message,
      reasoning: item.reasoning,
    })),
  );

  const handleInsightGenerated = useCallback(
    (newInsight: ActionableData) => {
      setInsights((prev) => [newInsight, ...prev]);
    },
    [],
  );

  const handleActionableUpdated = useCallback((updated: ActionableData) => {
    setInsights((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
  }, []);

  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {contact.full_name || "Sin nombre"}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
                {contact.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                    {contact.email}
                  </span>
                )}
                {contact.phone_number && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                    </svg>
                    {contact.phone_number}
                  </span>
                )}
                {contact.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    {contact.country}
                  </span>
                )}
                {contact.source && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-tertiary text-text-secondary text-xs font-medium">
                    {contact.source}
                  </span>
                )}
                {contact.external_lifecycle_stage && (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize">
                    {contact.external_lifecycle_stage}
                  </span>
                )}
                {contact.external_lead_status && (
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                    {contact.external_lead_status}
                  </span>
                )}
              </div>
            </div>

            <GenerateInsightButton
              contactId={contact.id}
              onSuccess={handleInsightGenerated}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <section>
          <InsightsPanel
            actionables={insights}
            onActionableUpdated={handleActionableUpdated}
          />
        </section>
      </main>
    </div>
  );
}
