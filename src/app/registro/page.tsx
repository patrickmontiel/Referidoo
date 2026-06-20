"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";

export default function RegistroPage() {
  const router = useRouter();
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
      body: JSON.stringify({ name, email, password, companyName }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Algo salió mal, intenta de nuevo");
      return;
    }

    sessionStorage.setItem("referidoo_welcome", "1");
    router.push("/admin");
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center flex flex-col items-center">
          <div className="mb-4">
            <Logo size="md" />
          </div>
          <p className="text-sm text-gray-400">Crea tu cuenta de asesor</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Nombre completo
            </label>
            <input
              id="reg-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              placeholder="Eduardo Neri"
            />
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
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
              className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              placeholder="••••••••"
            />
            <p className="text-xs text-gray-400 mt-1">Mínimo 8 caracteres</p>
          </div>

          <div>
            <label htmlFor="reg-company" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Despacho / empresa <span className="text-gray-300 font-normal normal-case tracking-normal">(opcional)</span>
            </label>
            <input
              id="reg-company"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              placeholder="Eduardo Neri — Asesor Financiero"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 bg-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-900 disabled:opacity-50 transition"
          >
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        <div className="text-center mt-5 text-sm text-gray-600">
          Ya tengo cuenta — <a href="/login" className="text-black font-medium">Iniciar sesión</a>
        </div>
      </div>
    </div>
  );
}
