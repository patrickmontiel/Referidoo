"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Resumen", icon: "M3 12L12 3L21 12V20C21 20.6 20.6 21 20 21H15V16H9V21H4C3.4 21 3 20.6 3 20V12Z" },
  { href: "/admin/clientes", label: "Clientes", icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z" },
  { href: "/admin/referidos", label: "Referidos", icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 3C14.2 3 16 4.8 16 7C16 9.2 14.2 11 12 11C9.8 11 8 9.2 8 7C8 4.8 9.8 3 12 3ZM22 21C22 17.7 19.3 15 16 15M2 21C2 17.7 4.7 15 8 15" },
  { href: "/admin/niveles", label: "Niveles", icon: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20"
              style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M17 20H7C5.9 20 5 19.1 5 18V6C5 4.9 5.9 4 7 4H17C18.1 4 19 4.9 19 6V18C19 19.1 18.1 20 17 20Z" stroke="white" strokeWidth="1.5"/>
                <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">Referidoo</span>
          </div>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-700 transition py-2 px-1"
          >
            Salir
          </button>
        </div>
      </header>

      {/* Side nav + content */}
      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        <aside className="hidden md:flex w-48 flex-col py-6 px-3 gap-1 border-r border-gray-100 bg-white">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                  active ? "bg-black text-white font-medium" : "text-gray-600 hover:bg-gray-100"
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

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center pt-3 pb-2 gap-1 active:bg-gray-50 transition",
                  active ? "text-black" : "text-gray-400"
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
