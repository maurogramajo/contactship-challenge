"use client";

import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";

interface ContactInfoData {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  country: string | null;
  source: string | null;
  description: string | null;
  external_id: string | null;
  external_lifecycle_stage: string | null;
  external_lead_status: string | null;
}

interface ContactInfoProps {
  contact: ContactInfoData;
}

function sourceVariant(source: string | null): BadgeVariant {
  if (source === "hubspot") return "hubspot";
  return "contactship";
}

function sourceLabel(source: string | null): string {
  if (source === "hubspot") return "HubSpot";
  return "Manual";
}

export function ContactInfo({ contact }: ContactInfoProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
            Perfil principal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            {contact.full_name ?? "Sin nombre"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            {contact.description?.trim() || "Sin contexto cargado todavía para este contacto."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={sourceVariant(contact.source)}>
            {contact.source === "hubspot"
              ? `HubSpot #${contact.external_id ?? "—"}`
              : sourceLabel(contact.source)}
          </Badge>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Email">
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="text-primary transition-colors hover:text-primary-hover"
            >
              {contact.email}
            </a>
          ) : (
            <MutedValue value="Sin email" />
          )}
        </Field>

        <Field label="Teléfono">
          {contact.phone_number ? (
            <a
              href={`tel:${contact.phone_number}`}
              className="text-primary transition-colors hover:text-primary-hover"
            >
              {contact.phone_number}
            </a>
          ) : (
            <MutedValue value="Sin teléfono" />
          )}
        </Field>

        <Field label="País">
          {contact.country ? (
            contact.country
          ) : (
            <MutedValue value="Sin país" />
          )}
        </Field>

        <Field label="Lifecycle Stage">
          {contact.external_lifecycle_stage ? (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 capitalize">
              {contact.external_lifecycle_stage}
            </span>
          ) : (
            <MutedValue value="Sin clasificar" />
          )}
        </Field>

        <Field label="Lead Status">
          {contact.external_lead_status ? (
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {contact.external_lead_status}
            </span>
          ) : (
            <MutedValue value="Sin clasificar" />
          )}
        </Field>
      </dl>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border-light bg-surface-secondary p-4">
      <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-2 text-sm text-text-primary">{children}</dd>
    </div>
  );
}

function MutedValue({ value }: { value: string }) {
  return <span className="text-text-tertiary">{value}</span>;
}
