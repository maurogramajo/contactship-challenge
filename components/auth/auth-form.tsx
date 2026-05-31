"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api/client";

type Mode = "login" | "register";

interface AuthFormProps {
  mode: Mode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(
        `/api/auth/${mode}`,
        isRegister ? { name, email, password } : { email, password },
      );

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
      <div className="w-full rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold text-neutral-950">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h1>
          <p className="text-sm text-neutral-600">
            {isRegister
              ? "Cada cuenta representa una organización aislada dentro de ContactShip."
              : "Accedé a tu organización para gestionar contactos y HubSpot."}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister ? (
            <label className="block space-y-2">
              <span className="text-sm font-medium text-neutral-800">
                Nombre de la organización
              </span>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
                placeholder="Acme Salud"
              />
            </label>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-800">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
              placeholder="ops@acme.com"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-800">
              Contraseña
            </span>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-900"
              placeholder="Min. 8 caracteres"
            />
          </label>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Procesando..."
              : isRegister
                ? "Crear cuenta"
                : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-sm text-neutral-600">
          {isRegister ? "¿Ya tenés cuenta?" : "¿Necesitás una cuenta?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-neutral-950 underline underline-offset-4"
          >
            {isRegister ? "Iniciar sesión" : "Registrarse"}
          </Link>
        </p>
      </div>
    </div>
  );
}
