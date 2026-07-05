"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const nav = [
  { href: "/owner", label: "Resumen", icon: "M3 12L12 3L21 12V20C21 20.6 20.6 21 20 21H15V16H9V21H4C3.4 21 3 20.6 3 20V12Z" },
  { href: "/owner/asesores", label: "Asesores", icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z" },
  { href: "/owner/pagos", label: "Pagos", icon: "M12 2V22M17 6H9.5C8 6 6.8 7.2 6.8 8.7S8 11.4 9.5 11.4H14.5C16 11.4 17.2 12.6 17.2 14.1S16 16.8 14.5 16.8H6.5" },
  { href: "/owner/documentos", label: "Documentos", icon: "M14 2H6C5 2 4 3 4 4V20C4 21 5 22 6 22H18C19 22 20 21 20 20V8L14 2ZM14 2V8H20M16 13H8M16 17H8" },
  { href: "/owner/configuracion", label: "Configuración", icon: "M12 15A3 3 0 1 0 12 9A3 3 0 0 0 12 15ZM19.4 15A1.65 1.65 0 0 0 19.7 16.8L19.8 16.9A2 2 0 1 1 17 19.7L16.9 19.6A1.65 1.65 0 0 0 15.1 19.3A1.65 1.65 0 0 0 14.1 20.8V21A2 2 0 0 1 10.1 21V20.9A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.2 19.7L7.1 19.8A2 2 0 1 1 4.3 17L4.4 16.9A1.65 1.65 0 0 0 4.7 15.1A1.65 1.65 0 0 0 3.2 14.1H3A2 2 0 0 1 3 10.1H3.1A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.3 7.2L4.2 7.1A2 2 0 1 1 7 4.3L7.1 4.4A1.65 1.65 0 0 0 8.9 4.7H9A1.65 1.65 0 0 0 10 3.2V3A2 2 0 0 1 14 3V3.1A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.8 4.3L16.9 4.2A2 2 0 1 1 19.7 7L19.6 7.1A1.65 1.65 0 0 0 19.3 8.9V9A1.65 1.65 0 0 0 20.8 10H21A2 2 0 0 1 21 14H20.9A1.65 1.65 0 0 0 19.4 15Z" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    fetch("/api/advisor/me")
      .then((r) => r.json())
      .then((d) => setOwnerName(typeof d?.name === "string" ? d.name : ""))
      .catch(() => {});
  }, []);

  const monthLabel = new Date()
    .toLocaleDateString("es-MX", { month: "short", year: "numeric" })
    .replace(".", "")
    .replace(" de ", " ");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className={`min-h-screen bg-brand-surface flex flex-col ${hankenGrotesk.className}`}>
      <header className="bg-white border-b border-brand-border-1 sticky top-0 z-20"
              style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/owner" aria-label="Ir al resumen">
              <Logo size="sm" />
            </Link>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-gray-3 px-2.5 py-1 rounded-full bg-brand-border-1">
              Dueño
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-brand-gray-3">{monthLabel}</span>
            <button onClick={logout} className="text-xs text-brand-gray-4 hover:text-brand-gray-1 transition py-2">
              Salir
            </button>
            <div className="w-10 h-10 rounded-full bg-brand-ink text-white flex items-center justify-center text-sm font-bold">
              {ownerName ? ownerName[0].toUpperCase() : "·"}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 w-full">
        <aside className="hidden md:flex w-56 flex-shrink-0 flex-col py-6 px-3 gap-1 border-r border-brand-border-1 bg-white">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-full text-sm transition",
                  active ? "bg-brand-ink text-white font-semibold" : "text-brand-gray-2 hover:bg-brand-surface"
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d={item.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item.label}
              </Link>
            );
          })}
        </aside>

        <main className="flex-1 min-w-0 px-6 py-6 overflow-auto max-w-[1440px]"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}>
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border-1"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center pt-3 pb-2 gap-1 active:bg-brand-surface transition",
                  active ? "text-brand-ink" : "text-brand-gray-4"
                )}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d={item.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
