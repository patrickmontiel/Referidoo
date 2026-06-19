"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const nav = [
  { href: "/admin", label: "Resumen", icon: "M3 12L12 3L21 12V20C21 20.6 20.6 21 20 21H15V16H9V21H4C3.4 21 3 20.6 3 20V12Z" },
  { href: "/admin/clientes", label: "Clientes", icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z" },
  { href: "/admin/referidos", label: "Referidos", icon: "M3 4H21L14 12.5V19L10 21V12.5L3 4Z" },
  { href: "/admin/niveles", label: "Premios", icon: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" },
];

const ONBOARDING_KEY = "referidoo_admin_onboarded";

const steps = [
  {
    icon: "M17 20H7C5.9 20 5 19.1 5 18V6C5 4.9 5.9 4 7 4H17C18.1 4 19 4.9 19 6V18C19 19.1 18.1 20 17 20ZM9 12L11 14L15 10",
    section: null,
    title: "Bienvenido a Referidoo",
    body: "Este es tu panel de asesor. Desde aquí gestionas todo tu programa de referidos — qué clientes están activos, qué leads han llegado, y cuántos premios has enviado. Te explico cómo funciona cada sección.",
  },
  {
    icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z",
    section: "Clientes",
    title: "Empieza por tus clientes",
    body: "Agrega a cada cliente con plan activo. Puedes hacerlo uno a uno o importar un CSV. Cada cliente recibe un portal personal con su link de referidos — se lo mandas con un botón de WhatsApp directo desde aquí.",
    highlight: "/admin/clientes",
  },
  {
    icon: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z",
    section: "Premios",
    title: "Configura cuánto gana cada quien",
    body: "En Premios defines la escalera de premios para PPR y Vida (por defecto $1,500 · $1,500 · $3,500), y los premios burbuja para Auto y Gastos Médicos Mayores. También editas los mensajes que ven tus clientes.",
    highlight: "/admin/niveles",
  },
  {
    icon: "M3 4H21L14 12.5V19L10 21V12.5L3 4Z",
    section: "Referidos",
    title: "Tu pipeline de ventas por referido",
    body: "Cada vez que alguien llene el formulario de un cliente tuyo, aparece aquí. Tú marcas si lo contactaste, si convirtió, y cuánto valió el plan. Al enviar el premio, el cliente recibe un email y puede confirmarlo desde su portal.",
    highlight: "/admin/referidos",
  },
  {
    icon: "M5 12L10 17L19 8",
    section: null,
    title: "Todo listo",
    body: "Agrega a tu primer cliente y mándale su link por WhatsApp. En cuanto comparta su link y alguien llene el formulario, te llegará una notificación y el referido aparecerá aquí.",
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [step, setStep] = useState(0);
  const [resetState, setResetState] = useState<null | "confirm" | "busy">(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const consumedWelcomeFlag = useRef(false);

  useEffect(() => {
    // sessionStorage is a one-time external resource: React's dev Strict Mode
    // double-invokes this effect AND runs the first invocation's cleanup
    // synchronously. The ref guard stops the second invocation from re-reading
    // the already-consumed flag — but the timers must NOT be returned from a
    // cleanup function, or Strict Mode's synthetic cleanup cancels them before
    // they ever fire, leaving showWelcome stuck true forever. This effect is a
    // one-time initialization, not a synchronized resource, so no cleanup.
    if (consumedWelcomeFlag.current) return;
    consumedWelcomeFlag.current = true;

    const hasWelcome = sessionStorage.getItem("referidoo_welcome") === "1";

    if (hasWelcome) {
      sessionStorage.removeItem("referidoo_welcome");
      setShowWelcome(true);
      fetch("/api/advisor/me").then(r => r.json()).then(adv => {
        if (adv?.name) setWelcomeName(adv.name);
      }).catch(() => {});
      setTimeout(() => setFadingOut(true), 3200);
      setTimeout(() => {
        setShowWelcome(false);
        setFadingOut(false);
        if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
      }, 4000);
    } else {
      if (!localStorage.getItem(ONBOARDING_KEY)) setShowOnboarding(true);
    }
  }, []);

  function finish() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
    else finish();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function doReset() {
    setResetState("busy");
    await fetch("/api/demo/reset", { method: "POST" });
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem(ONBOARDING_KEY);
    router.push("/login");
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20"
              style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event("referidoo:tour"))}
              title="Guía de la sección actual"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition text-xs font-semibold"
            >
              ?
            </button>
            <button onClick={logout} className="text-xs text-gray-400 hover:text-gray-700 transition py-2 px-1">
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Side nav + content */}
      <div className="flex flex-1 max-w-5xl mx-auto w-full">
        <aside className="hidden md:flex w-48 flex-col py-6 px-3 gap-1 border-r border-gray-100 bg-white">
          {nav.map((item) => {
            const active = pathname === item.href;
            const highlighted = showOnboarding && current.highlight === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                  active ? "bg-black text-white font-medium" :
                  highlighted ? "bg-gray-100 text-gray-900 font-medium ring-2 ring-black ring-offset-1" :
                  "text-gray-600 hover:bg-gray-100"
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d={item.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item.label}
              </Link>
            );
          })}

          {/* Demo reset — bottom of sidebar */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            {resetState === null && (
              <button
                onClick={() => setResetState("confirm")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M1 4V10H7M23 20V14H17M20.49 9C19.9828 7.56678 19.1209 6.2854 17.9845 5.27542C16.8482 4.26543 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1113 10.0083 20.7757C8.52547 20.4402 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reiniciar demo
              </button>
            )}
            {resetState === "confirm" && (
              <div className="px-1">
                <p className="text-[11px] text-gray-500 mb-2 leading-snug">¿Borrar todos los clientes y referidos?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={doReset}
                    className="flex-1 text-[11px] py-1.5 rounded-lg bg-black text-white font-medium hover:bg-gray-900 transition"
                  >
                    Sí, borrar
                  </button>
                  <button
                    onClick={() => setResetState(null)}
                    className="flex-1 text-[11px] py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {resetState === "busy" && (
              <p className="text-[11px] text-gray-400 px-3 py-2">Reiniciando...</p>
            )}
          </div>
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

      {/* Full-screen welcome */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white select-none"
          style={{ opacity: fadingOut ? 0 : 1, transition: "opacity 1s cubic-bezier(0.22, 1, 0.36, 1)" }}
        >
          <div className="text-center px-8">
            <div className="welcome-logo mb-12 flex justify-center">
              <Logo size="lg" />
            </div>
            {welcomeName && (
              <>
                <p className="welcome-name text-[2.75rem] font-semibold tracking-tight text-black leading-none mb-2">
                  {welcomeName.split(" ")[0]}
                  <span className="text-black/25"> {welcomeName.split(" ").slice(1).join(" ")}</span>
                </p>
                <p className="welcome-sub text-sm text-black/30 font-normal tracking-wide">
                  Bienvenido de vuelta
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Onboarding modal */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">

            {/* Progress bar */}
            <div className="h-1 bg-gray-100">
              <div
                className="h-1 bg-black transition-all duration-500"
                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
              />
            </div>

            <div className="p-7">
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === step ? "w-6 bg-black" : i < step ? "w-3 bg-gray-300" : "w-3 bg-gray-100"
                    }`} />
                  ))}
                </div>
                {current.section && (
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    {current.section}
                  </span>
                )}
              </div>

              {/* Icon */}
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mb-5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  {current.icon.includes("M9 12") ? (
                    <>
                      <path d="M17 20H7C5.9 20 5 19.1 5 18V6C5 4.9 5.9 4 7 4H17C18.1 4 19 4.9 19 6V18C19 19.1 18.1 20 17 20Z" stroke="white" strokeWidth="1.5"/>
                      <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </>
                  ) : (
                    <path d={current.icon} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  )}
                </svg>
              </div>

              {/* Content */}
              <h2 className="text-xl font-semibold mb-3 leading-snug">{current.title}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-7">{current.body}</p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={next}
                  className="flex-1 bg-black text-white text-sm font-medium py-3.5 rounded-xl hover:bg-gray-900 transition"
                >
                  {isLast ? "Empezar →" : "Siguiente"}
                </button>
                {!isLast && (
                  <button
                    onClick={finish}
                    className="px-4 text-sm py-3.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                  >
                    Saltar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
