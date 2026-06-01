"use client";

import { useEffect, useId } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import {
  createContactInputSchema,
  type CreateContactInput,
} from "@/db/zod";
import { api, ApiError } from "@/lib/api/client";

type CreatedContact = {
  id: string;
  full_name: string | null;
  external_id: string | null;
  source: string | null;
};

type CreateContactResponse = {
  contact: CreatedContact;
  syncPending: boolean;
  message?: string;
};

type AdditionalDataRow = {
  type: string;
  field: string;
  value: string;
};

type CreateContactFormState = {
  full_name: string;
  phone_number: string;
  email: string;
  country: string;
  description: string;
  additional_data?: AdditionalDataRow[];
};

interface CreateContactModalProps {
  open: boolean;
  hubSpotConnected: boolean;
  onClose: () => void;
  onCreated: (result: CreateContactResponse) => void;
}

const DEFAULT_VALUES: CreateContactFormState = {
  full_name: "",
  phone_number: "",
  email: "",
  country: "",
  description: "",
  additional_data: [],
};

const ADDITIONAL_DATA_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Numero" },
  { value: "date", label: "Fecha" },
  { value: "location", label: "Ubicacion" },
];

export function CreateContactModal({
  open,
  hubSpotConnected,
  onClose,
  onCreated,
}: CreateContactModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<CreateContactFormState, unknown, CreateContactInput>({
    resolver: zodResolver(createContactInputSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "additional_data",
  });

  useEffect(() => {
    if (!open) {
      reset(DEFAULT_VALUES);
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSubmitting, onClose, open, reset]);

  async function onSubmit(values: CreateContactInput) {
    try {
      const response = await api.post<CreateContactResponse>(
        "/api/contacts",
        values,
      );

      reset(DEFAULT_VALUES);
      onCreated(response);
      onClose();
    } catch (error) {
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "No pudimos crear el contacto. Intenta de nuevo.",
      });
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-3xl rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_30px_80px_-36px_rgba(15,23,42,0.35)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="space-y-2">
            <h2 id={titleId} className="text-2xl font-semibold text-slate-950">
              Crear contacto
            </h2>
            <p id={descriptionId} className="max-w-2xl text-sm leading-6 text-slate-600">
              Se creara en ContactShip
              {hubSpotConnected ? " y tambien en HubSpot" : ""}. El telefono debe
              estar en formato internacional, por ejemplo{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                +5491123456789
              </code>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Cerrar formulario"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6l-12 12" />
            </svg>
          </button>
        </div>

        <form className="space-y-6 px-6 py-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nombre completo" error={errors.full_name?.message}>
              <input
                {...register("full_name")}
                autoFocus
                placeholder="Julia Mendez"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </FormField>

            <FormField label="Telefono" error={errors.phone_number?.message}>
              <input
                {...register("phone_number")}
                type="tel"
                placeholder="+5491123456789"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </FormField>

            <FormField label="Email" error={errors.email?.message}>
              <input
                {...register("email")}
                type="email"
                placeholder="recepcion@tenner.demo"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </FormField>

            <FormField label="Pais" error={errors.country?.message}>
              <input
                {...register("country")}
                placeholder="Argentina"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
              />
            </FormField>
          </div>

          <FormField label="Descripcion" error={errors.description?.message}>
            <textarea
              {...register("description")}
              rows={4}
              placeholder="Contexto util para el equipo comercial o de soporte."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
            />
          </FormField>

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  Datos adicionales
                </h3>
                <p className="text-sm text-slate-600">
                  Campos libres compatibles con el contrato de ContactShip.
                </p>
              </div>
              <button
                type="button"
                onClick={() => append({ type: "text", field: "", value: "" })}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
              >
                Agregar dato
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-500">
                No agregaste datos adicionales todavia.
              </div>
            ) : null}

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                  <FormField
                    label="Tipo"
                    error={errors.additional_data?.[index]?.type?.message}
                  >
                    <select
                      {...register(`additional_data.${index}.type`)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
                    >
                      {ADDITIONAL_DATA_TYPES.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField
                    label="Campo"
                    error={errors.additional_data?.[index]?.field?.message}
                  >
                    <input
                      {...register(`additional_data.${index}.field`)}
                      placeholder="cargo"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </FormField>

                  <FormField
                    label="Valor"
                    error={errors.additional_data?.[index]?.value?.message}
                  >
                    <input
                      {...register(`additional_data.${index}.value`)}
                      placeholder="Gerente general"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none transition focus:border-slate-950"
                    />
                  </FormField>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {errors.root?.message ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errors.root.message}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creando..." : "Crear contacto"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function FormField({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-rose-700">{error}</span> : null}
    </label>
  );
}
