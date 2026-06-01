"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { Contact } from "@/db/schema";
import { Table, type Column } from "@/components/ui/table";
import { SourceBadge } from "./source-badge";

interface PaginatedData {
  data: Contact[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage?: boolean;
  totalIsApproximate?: boolean;
}

interface ContactsTableProps {
  result: PaginatedData | null;
  loading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
}

function formatDate(dateStr: string | Date | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  return phone;
}

const columns: Column<Contact>[] = [
  {
    key: "full_name",
    header: "Nombre",
    render: (row: Contact): ReactNode => (
      <div className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950">
          {row.full_name || "Sin nombre"}
        </span>
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    render: (row: Contact): ReactNode => (
      <span className="font-medium text-slate-700">
        {row.email || "—"}
      </span>
    ),
  },
  {
    key: "phone_number",
    header: "Teléfono",
    render: (row: Contact): ReactNode => (
      <span className="font-medium text-slate-700">
        {formatPhone(row.phone_number)}
      </span>
    ),
  },
  {
    key: "source",
    header: "Origen",
    render: (row: Contact): ReactNode => <SourceBadge source={row.source} />,
  },
  {
    key: "external_lifecycle_stage",
    header: "Lifecycle",
    render: (row: Contact): ReactNode => (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 capitalize">
        {row.external_lifecycle_stage || "—"}
      </span>
    ),
  },
  {
    key: "external_lead_status",
    header: "Lead Status",
    render: (row: Contact): ReactNode => (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        {row.external_lead_status || "—"}
      </span>
    ),
  },
  {
    key: "updated_at",
    header: "Última Actividad",
    render: (row: Contact): ReactNode => (
      <span className="text-xs font-medium text-slate-500">
        {formatDate(row.updated_at)}
      </span>
    ),
  },
];

export function ContactsTable({
  result,
  loading,
  error,
  onPageChange,
}: ContactsTableProps) {
  const router = useRouter();

  function handleRowClick(contact: Contact) {
    router.push(`/dashboard/contacts/${contact.id}`);
  }

  return (
    <Table<Contact>
      columns={columns}
      data={result?.data ?? []}
      rowKey={(contact) => contact.id}
      onRowClick={handleRowClick}
      loading={loading}
      error={error || null}
      emptyTitle="No se encontraron contactos"
      emptyDescription="Intenta ajustar los filtros de búsqueda."
      pagination={
        result && result.totalPages > 0
          ? {
              page: result.page,
              totalPages: result.totalPages,
              hasNextPage: result.hasNextPage,
              totalIsApproximate: result.totalIsApproximate,
              onPageChange,
            }
          : undefined
      }
    />
  );
}
