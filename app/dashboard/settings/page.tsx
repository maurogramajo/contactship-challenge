"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, api } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { VoiceTextarea } from "@/components/ui/voice-textarea";

type ConnectionStatus = "idle" | "testing" | "success" | "error";

interface StatusResponse {
  connected: boolean;
  hubspotPortalId: string | null;
  hubspotUserEmail: string | null;
  hubspotHubDomain: string | null;
  scopes: string[];
}

interface TestResult {
  success: boolean;
  error?: string;
}

interface AiSettingsData {
  organization_id: string;
  objective: string;
  additional_instructions: string | null;
  created_at: string;
  updated_at: string;
}

type AiSaveStatus = "idle" | "saving" | "saved" | "error";

export default function SettingsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // AI Settings state
  const [aiObjective, setAiObjective] = useState("");
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiSaveStatus, setAiSaveStatus] = useState<AiSaveStatus>("idle");
  const [aiError, setAiError] = useState("");
  const [aiLoaded, setAiLoaded] = useState(false);

  // Load initial token status on mount
  useEffect(() => {
    api
      .get<StatusResponse>("/api/hubspot/status")
      .then((data) => {
        setStatus(data);
      })
      .catch(() => {
        setStatus(null);
      });
  }, []);

  // Load AI settings on mount
  useEffect(() => {
    api
      .get<{ settings: AiSettingsData | null }>("/api/ai/settings")
      .then((data) => {
        if (data.settings) {
          setAiObjective(data.settings.objective);
          setAiInstructions(data.settings.additional_instructions ?? "");
        }
        setAiLoaded(true);
      })
      .catch(() => {
        setAiLoaded(true);
      });
  }, []);

  const handleTestConnection = useCallback(async () => {
    setConnectionStatus("testing");
    setErrorMessage("");

    try {
      await apiFetch<TestResult>("/api/hubspot/test-connection", {
        method: "POST",
      });
      setConnectionStatus("success");
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error desconocido",
      );
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setConnectionStatus("testing");
    setErrorMessage("");

    try {
      await apiFetch("/api/hubspot/disconnect", { method: "POST" });
      setStatus({
        connected: false,
        hubspotPortalId: null,
        hubspotUserEmail: null,
        hubspotHubDomain: null,
        scopes: [],
      });
      setConnectionStatus("idle");
      router.refresh();
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error desconocido",
      );
    }
  }, [router]);

  const handleSaveAiSettings = useCallback(async () => {
    setAiSaveStatus("saving");
    setAiError("");

    try {
      await api.put<{ settings: AiSettingsData }>("/api/ai/settings", {
        objective: aiObjective,
        additional_instructions: aiInstructions || null,
      });
      setAiSaveStatus("saved");
    } catch (error) {
      setAiSaveStatus("error");
      setAiError(
        error instanceof Error ? error.message : "Error desconocido",
      );
    }
  }, [aiObjective, aiInstructions]);

  const hubspotConnected = status?.connected ?? false;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="rounded-xl border border-border bg-surface p-6 shadow-card space-y-6">
        {/* Title */}
        <h1 className="text-lg font-semibold text-text-primary">
          Configuración de HubSpot
        </h1>

        {/* Connection Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">
            Estado:
          </span>
          <Badge variant={hubspotConnected ? "success" : "error"}>
            {hubspotConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>

        {status?.hubspotPortalId ? (
          <div className="space-y-2 rounded-lg bg-surface-secondary p-4 text-sm text-text-secondary">
            <p>
              <span className="font-medium text-text-primary">Portal:</span>{" "}
              {status.hubspotPortalId}
            </p>
            {status.hubspotUserEmail ? (
              <p>
                <span className="font-medium text-text-primary">Usuario HubSpot:</span>{" "}
                {status.hubspotUserEmail}
              </p>
            ) : null}
            {status.hubspotHubDomain ? (
              <p>
                <span className="font-medium text-text-primary">Hub domain:</span>{" "}
                {status.hubspotHubDomain}
              </p>
            ) : null}
            {status.scopes.length > 0 ? (
              <p>
                <span className="font-medium text-text-primary">Scopes:</span>{" "}
                {status.scopes.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {!hubspotConnected && (
          <p className="text-sm text-text-tertiary">
            Esta organización todavía no vinculó una cuenta de HubSpot.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          {!hubspotConnected ? (
            <a
              href="/api/hubspot/connect"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover"
            >
              Conectar con HubSpot
            </a>
          ) : (
            <>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={connectionStatus === "testing"}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connectionStatus === "testing" && (
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
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
                )}
                Probar conexión
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={connectionStatus === "testing"}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Desconectar
              </button>
            </>
          )}
        </div>

        {/* Success Result */}
        {connectionStatus === "success" && (
          <div className="flex items-center gap-2 rounded-lg border border-success/15 bg-success-light px-4 py-3 text-sm text-success-foreground">
            <svg
              className="h-5 w-5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            Conexión exitosa
          </div>
        )}

        {/* Error Result */}
        {connectionStatus === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-error/15 bg-error-light px-4 py-3 text-sm text-error-foreground">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* AI Settings Card */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-card space-y-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold text-text-primary">
            Configuración de IA
          </h1>

          <div className="group relative shrink-0">
            <button
              type="button"
              aria-label="Ayuda sobre configuración de IA"
              className="grid size-8 place-items-center rounded-full text-text-tertiary transition-colors hover:bg-primary-light hover:text-primary"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </button>

            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <p className="font-medium text-text-primary mb-2">¿Para qué sirven estos campos?</p>
              <p className="mb-2">
                <strong className="text-text-primary">Objetivo principal:</strong> define el
                contexto de negocio que la IA usa para personalizar los insights y las acciones
                recomendadas. Cuanto más específico, más relevantes serán las sugerencias.
              </p>
              <p>
                <strong className="text-text-primary">Instrucciones adicionales:</strong> reglas o
                preferencias que la IA debe considerar al generar recomendaciones, como el canal
                de contacto preferido, tono de comunicación, o restricciones del negocio.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="ai-objective"
            className="block text-sm font-medium text-text-secondary"
          >
            Objetivo principal
          </label>
          <VoiceTextarea
            id="ai-objective"
            rows={3}
            maxLength={1000}
            value={aiObjective}
            onChange={setAiObjective}
            placeholder="Ej: Automatizar la calificación de leads entrantes y agendar demos de agentes IA en Latinoamérica"
            disabled={!aiLoaded}
          />
          <p className="text-xs text-text-tertiary text-right">
            {aiObjective.length} / 1000
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="ai-instructions"
            className="block text-sm font-medium text-text-secondary"
          >
            Instrucciones adicionales
          </label>
          <VoiceTextarea
            id="ai-instructions"
            rows={4}
            maxLength={2000}
            value={aiInstructions}
            onChange={setAiInstructions}
            placeholder="Ej: Priorizar llamadas salientes para leads que ya interactuaron con el agente de voz"
            disabled={!aiLoaded}
          />
          <p className="text-xs text-text-tertiary text-right">
            {aiInstructions.length} / 2000
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveAiSettings}
            disabled={aiSaveStatus === "saving" || !aiLoaded}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiSaveStatus === "saving" && (
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
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
            )}
            {aiSaveStatus === "saving" ? "Guardando..." : "Guardar AI Settings"}
          </button>
        </div>

        {/* Success Feedback */}
        {aiSaveStatus === "saved" && (
          <div className="flex items-center gap-2 rounded-lg border border-success/15 bg-success-light px-4 py-3 text-sm text-success-foreground">
            <svg
              className="h-5 w-5 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            Configuración guardada
          </div>
        )}

        {/* Error Feedback */}
        {aiSaveStatus === "error" && (
          <div className="flex items-start gap-2 rounded-lg border border-error/15 bg-error-light px-4 py-3 text-sm text-error-foreground">
            <svg
              className="h-5 w-5 flex-shrink-0 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                clipRule="evenodd"
              />
            </svg>
            <span>{aiError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
