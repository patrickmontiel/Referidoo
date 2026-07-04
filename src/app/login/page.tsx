"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { Logo } from "@/components/Logo";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const e = search.get("email");
    const p = search.get("p");
    if (e) setEmail(e);
    if (p) setPassword(p);
  }, []);

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

    if (data.isOwner) {
      router.push("/owner");
      return;
    }

    sessionStorage.setItem("referidoo_welcome", "1");
    router.push("/admin");
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
          <p className="text-sm text-brand-gray-4">Panel del asesor</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
              Correo electrónico
            </label>
            <input
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
            <label className="block text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full min-h-11 px-4 py-3 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink focus:border-transparent transition"
              placeholder="••••••••"
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
            {loading ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
