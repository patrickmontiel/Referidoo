"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const nav = [
  { href: "/owner", label: "Resumen", icon: "M3 12L12 3L21 12V20C21 20.6 20.6 21 20 21H15V16H9V21H4C3.4 21 3 20.6 3 20V12Z" },
  { href: "/owner/asesores", label: "Asesores", icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z" },
];

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className={`min-h-screen bg-brand-surface flex flex-col ${hankenGrotesk.className}`}>
      <header className="bg-white border-b border-brand-border-1 sticky top-0 z-20"
              style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-brand-gray-3 px-2 py-0.5 rounded-full bg-brand-border-1">
              Dueño
            </span>
          </div>
          <button onClick={logout} className="text-xs text-brand-gray-4 hover:text-brand-gray-1 transition py-2 px-1">
            Salir
          </button>
        </div>
      </header>

      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        <aside className="hidden md:flex w-48 flex-col py-6 px-3 gap-1 border-r border-brand-border-1 bg-white">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                  active ? "bg-brand-ink text-white font-medium" : "text-brand-gray-2 hover:bg-brand-surface"
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

        <main className="flex-1 px-5 py-6 overflow-auto"
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
