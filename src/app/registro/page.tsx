"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { Logo } from "@/components/Logo";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RegistroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") ?? "";
  const wantsPro = searchParams.get("plan") === "pro";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, companyName, ref }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Algo salió mal, intenta de nuevo");
      return;
    }

    sessionStorage.setItem("referidoo_welcome", "1");
    // Intención Pro desde la landing: no se pierde — directo a activar el plan.
    router.push(wantsPro ? "/admin/perfil?upgrade=pro" : "/admin");
  }

  return (
    <div className={`min-h-screen bg-white flex items-center justify-center px-4 ${hankenGrotesk.className}`}>
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center flex flex-col items-center">
          <div className="mb-4">
            <Link href="/" aria-label="Ir al inicio">
              <Logo size="md" />
            </Link>
          </div>
          <p className="text-sm text-brand-gray-4">Crea tu cuenta de asesor</p>
          {wantsPro && (
            <p className="mt-3 text-xs font-semibold text-[#2563EB] bg-[#EEF3FE] rounded-full px-4 py-1.5">
              Vas por el plan Pro — al crear tu cuenta te llevamos directo a activarlo
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
              Nombre completo
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full min-h-11 px-4 py-3 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink focus:border-transparent transition"
              placeholder="Eduardo Neri"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
              Correo electrónico
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-h-11 px-4 py-3 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink focus:border-transparent transition"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full min-h-11 px-4 py-3 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink focus:border-transparent transition"
              placeholder="••••••••"
            />
            <p className="text-xs text-brand-gray-4 mt-1">Mínimo 8 caracteres</p>
          </div>

          <div>
            <label htmlFor="reg-company" className="block text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
              Despacho / empresa <span className="text-brand-gray-4 font-normal normal-case tracking-normal">(opcional)</span>
            </label>
            <input
              id="reg-company"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full min-h-11 px-4 py-3 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink focus:border-transparent transition"
              placeholder="Eduardo Neri — Asesor Financiero"
            />
          </div>

          {error && (
            <div className="bg-brand-danger-bg text-brand-danger-ink text-sm px-4 py-3 rounded-2xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 bg-brand-ink text-white text-sm font-medium py-3 rounded-full hover:bg-[#26262a] disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,transform,opacity] duration-150 active:scale-[0.98]"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="text-center mt-5 text-sm text-brand-gray-2">
          Ya tengo cuenta — <Link href="/login" className="text-brand-ink font-medium hover:underline">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
