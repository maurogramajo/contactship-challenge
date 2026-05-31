import Link from "next/link";

export default function ContactNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8">
      <p className="text-lg text-neutral-600 dark:text-neutral-400">
        Contacto no encontrado
      </p>
      <Link
        href="/dashboard/contacts"
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors"
      >
        Volver a contactos
      </Link>
    </div>
  );
}
