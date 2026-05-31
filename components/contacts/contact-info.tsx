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
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-primary">
          {contact.full_name ?? "Sin nombre"}
        </h1>
        <Badge variant={sourceVariant(contact.source)}>
          {sourceLabel(contact.source)}
        </Badge>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {contact.email && (
          <Field label="Email">
            <a
              href={`mailto:${contact.email}`}
              className="text-primary hover:text-primary-hover transition-colors"
            >
              {contact.email}
            </a>
          </Field>
        )}
        {contact.phone_number && (
          <Field label="Teléfono">
            <a
              href={`tel:${contact.phone_number}`}
              className="text-primary hover:text-primary-hover transition-colors"
            >
              {contact.phone_number}
            </a>
          </Field>
        )}
        {contact.country && (
          <Field label="País">{contact.country}</Field>
        )}
        {contact.external_id && contact.source === "hubspot" && (
          <Field label="HubSpot ID">
            <code className="rounded bg-surface-tertiary px-1.5 py-0.5 text-xs font-mono text-text-secondary">
              {contact.external_id}
            </code>
          </Field>
        )}
      </dl>

      {contact.description && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="text-sm leading-relaxed text-text-secondary">
            {contact.description}
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-text-primary">{children}</dd>
    </div>
  );
}
