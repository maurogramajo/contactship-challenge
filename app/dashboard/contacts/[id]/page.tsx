"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api/client";
import { DetailPageSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactInfo } from "@/components/contacts/contact-info";
import { ActivitySummary } from "@/components/contacts/activity-summary";
import { InsightsPanel } from "@/components/contacts/insights-panel";
import { GenerateInsightButton } from "@/components/contacts/generate-insight-button";

interface ContactDetail {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  country: string | null;
  email: string | null;
  description: string | null;
  external_id: string | null;
  source: string | null;
  calls: CallData[];
  comments: CommentData[];
  tags: TagData[];
}

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

interface ActionableData {
  id: string;
  summary: string | null;
  actions: string[];
  created_at: string;
  recommended_channel?: string | null;
  recommended_action?: string | null;
  draft_message?: string | null;
  reasoning?: string | null;
}

interface HubspotStatusResponse {
  connected: boolean;
  hubspotPortalId: string | null;
  hubspotUserEmail: string | null;
  hubspotHubDomain: string | null;
  scopes: string[];
}

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "success"; contact: ContactDetail; actionables: ActionableData[]; hubspotScopes: string[] };

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setState({ status: "loading" });
    }
    try {
      const [contact, actionables, hubspotStatus] = await Promise.all([
        api.get<ContactDetail>(`/api/contacts/${id}`),
        api.get<ActionableData[]>(`/api/contacts/${id}/insights`),
        api
          .get<HubspotStatusResponse>("/api/hubspot/status")
          .catch(() => null),
      ]);

      setState({
        status: "success",
        contact,
        actionables,
        hubspotScopes: hubspotStatus?.scopes ?? [],
      });
    } catch (err) {
      if (err instanceof ApiError && err.code === 404) {
        setState({ status: "not_found" });
      } else {
        const message =
          err instanceof ApiError
            ? err.message
            : "Error al cargar el contacto.";
        setState({ status: "error", message });
      }
    }
  }, [id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const handleRetry = useCallback(() => {
    void loadData(true);
  }, [loadData]);

  const handleInsightGenerated = useCallback((newActionable: ActionableData) => {
    setState((prev) => {
      if (prev.status !== "success") return prev;
      return {
        ...prev,
        actionables: [newActionable, ...prev.actionables],
      };
    });
  }, []);

  if (state.status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <DetailPageSkeleton />
      </div>
    );
  }

  if (state.status === "not_found") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />
        <EmptyState title="Contacto no encontrado" description="El contacto solicitado no existe o fue eliminado." />
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BackLink />
        <div className="rounded-xl border border-error/20 bg-error-light p-6 text-center">
          <p className="text-sm font-medium text-error-foreground">
            {state.message}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-4 rounded-lg bg-surface px-4 py-2 text-sm font-medium text-primary border border-border hover:bg-surface-secondary transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const { contact, actionables, hubspotScopes } = state;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ContactInfo contact={contact} />
          <ActivitySummary
            calls={contact.calls}
            comments={contact.comments}
            tags={contact.tags}
          />
        </div>

        <div className="space-y-6">
          <InsightsPanel
            actionables={actionables}
            hubspotScopes={hubspotScopes}
            contactId={id}
            contactExternalId={contact.external_id}
          />
          <GenerateInsightButton
            contactId={id}
            onSuccess={handleInsightGenerated}
          />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/dashboard/contacts"
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
    >
      <svg
        className="h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
        />
      </svg>
      Volver a contactos
    </Link>
  );
}
