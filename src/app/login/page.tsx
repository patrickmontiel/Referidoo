"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const e = params.get("email");
    const p = params.get("p");
    if (e) setEmail(e);
    if (p) setPassword(p);
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Correo o contraseña incorrectos");
      return;
    }

    router.push("/admin?welcome=1");
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black mb-6">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M17 20H7C5.9 20 5 19.1 5 18V6C5 4.9 5.9 4 7 4H17C18.1 4 19 4.9 19 6V18C19 19.1 18.1 20 17 20Z" stroke="white" strokeWidth="1.5"/>
              <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Referidoo</h1>
          <p className="text-sm text-gray-500 mt-1">Panel del asesor</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
              placeholder="••••••••"
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
            className="w-full bg-black text-white text-sm font-medium py-3 rounded-xl hover:bg-gray-900 disabled:opacity-50 transition"
          >
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
