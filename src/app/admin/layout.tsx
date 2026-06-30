"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Hanken_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

function VerifiedBannerWatcher({ onVerified }: { onVerified: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("verify") === "success") {
      onVerified();
      router.replace(pathname);
    }
  }, [searchParams, pathname, router, onVerified]);

  return null;
}

const nav = [
  { href: "/admin",           label: "Resumen",   tourId: "nav-resumen",   icon: "M3 12L12 3L21 12V20C21 20.6 20.6 21 20 21H15V16H9V21H4C3.4 21 3 20.6 3 20V12Z" },
  { href: "/admin/clientes",  label: "Clientes",  tourId: "nav-clientes",  icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z" },
  { href: "/admin/referidos", label: "Referidos", tourId: "nav-referidos", icon: "M3 4H21L14 12.5V19L10 21V12.5L3 4Z" },
  { href: "/admin/niveles",   label: "Premios",   tourId: "nav-premios",   icon: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" },
  { href: "/admin/perfil",    label: "Perfil",    tourId: "nav-perfil",    icon: "M12 8a4 4 0 100 8 4 4 0 000-8zM19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" },
];

type TourStepDef = {
  intro?: boolean;
  outro?: boolean;
  target?: string;
  page?: string;
  tap?: boolean;
  modal?: boolean;
  closeModal?: boolean;
  title: string;
  body: string;
};

const TOUR: TourStepDef[] = [
  {
    intro: true,
    title: "Te damos la bienvenida",
    body: "En 2 minutos te mostramos todo lo que puedes hacer desde tu panel. Puedes saltar en cualquier momento.",
  },
  {
    target: '[data-tour="nav"]',
    page: "/admin",
    title: "Tu menú principal",
    body: "Desde aquí navegas entre todas las secciones de tu panel. Te explicamos cada una.",
  },
  {
    target: '[data-tour="stats"]',
    page: "/admin",
    title: "Resumen de actividad",
    body: "De un vistazo: clientes activos, referidos totales, convertidos y pendientes — en tiempo real.",
  },
  {
    target: '[data-tour="link"]',
    page: "/admin",
    title: "Tu link de referidos",
    body: "Este es tu link personal para invitar a otros asesores a unirse a Referidoo. Compártelo y gana cuando se registren.",
  },
  {
    target: '[data-tour="nav-referidos"]',
    page: "/admin",
    tap: true,
    title: "Vamos a Referidos",
    body: "En Referidos ves todo tu pipeline de leads. Toca el menú para ir ahí.",
  },
  {
    target: '[data-tour="filtros"]',
    page: "/admin/referidos",
    title: "Filtra tu pipeline",
    body: "Ve solo los nuevos, los que ya contactaste o los que ya cerraron. Ideal cuando tienes varios al mismo tiempo.",
  },
  {
    target: '[data-tour="lista-referidos"]',
    page: "/admin/referidos",
    tap: true,
    title: "Tus leads",
    body: "Cada tarjeta muestra nombre, quién lo refirió y su estado. Toca cualquiera para ver el detalle.",
  },
  {
    target: '[data-tour="modal"]',
    page: "/admin/referidos",
    modal: true,
    title: "Detalle del referido",
    body: "Aquí ves el contacto, puedes llamar, mandar WhatsApp, cambiar el estado o marcar la conversión.",
  },
  {
    target: '[data-tour="nav-clientes"]',
    page: "/admin/referidos",
    tap: true,
    closeModal: true,
    title: "Vamos a Clientes",
    body: "En Clientes gestionas quiénes participan en tu programa. Toca para ir ahí.",
  },
  {
    target: '[data-tour="sort"]',
    page: "/admin/clientes",
    title: "Tus clientes",
    body: "Ordénalos como quieras. Desde cada tarjeta puedes copiar su link o contactarlos por WhatsApp.",
  },
  {
    target: '[data-tour="nav-premios"]',
    page: "/admin/clientes",
    tap: true,
    title: "Vamos a Premios",
    body: "En Premios defines cuánto gana cada cliente por sus referidos. Toca para ir ahí.",
  },
  {
    target: '[data-tour="premios"]',
    page: "/admin/niveles",
    title: "Escalera de premios",
    body: "Define el monto de cada nivel. Por defecto $1,500 · $1,500 · $3,500. Cámbialo cuando quieras.",
  },
  {
    target: '[data-tour="nav-perfil"]',
    page: "/admin/niveles",
    tap: true,
    title: "Por último: Perfil",
    body: "Tu cuenta y suscripción están aquí. Toca para ver.",
  },
  {
    target: '[data-tour="perfil"]',
    page: "/admin/perfil",
    title: "Tu cuenta",
    body: "Aquí ves tu plan, correo, clientes activos y gestionas tu suscripción. ¡Eso es todo el recorrido!",
  },
  {
    outro: true,
    title: "¡Todo listo!",
    body: "Estás listo para que tus clientes refieran a todos sus amigos y familiares.",
  },
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [showWelcome, setShowWelcome] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [advisorPlan, setAdvisorPlan] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [resetState, setResetState] = useState<null | "confirm" | "busy">(null);
  const consumedWelcomeFlag = useRef(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourRect, setTourRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tourTip, setTourTip] = useState<{ top: number; left: number } | null>(null);
  const tourStepRef = useRef(0);
  const lockedElsRef = useRef<Array<[HTMLElement, string]>>([]);
  const confettiRef = useRef<React.CSSProperties[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  if (confettiRef.current.length === 0) {
    const CONFETTI_COLORS = ["#2B57F0", "#0B0B0C", "#1FAE54", "#F5B53F", "#5B86F7", "#E7395A"];
    confettiRef.current = Array.from({ length: 80 }, (_, k) => ({
      position: "absolute",
      top: 0,
      left: Math.random() * 100 + "vw",
      width: 6 + Math.random() * 7 + "px",
      height: 9 + Math.random() * 9 + "px",
      background: CONFETTI_COLORS[k % CONFETTI_COLORS.length],
      borderRadius: Math.random() > 0.6 ? "50%" : "2px",
      animation: `confettiFall ${(2.6 + Math.random() * 2.2).toFixed(2)}s linear ${(Math.random() * 2.2).toFixed(2)}s infinite`,
    }));
  }

  function unlockScroll() {
    lockedElsRef.current.forEach(([el, ov]) => { el.style.overflow = ov; });
    lockedElsRef.current = [];
  }

  function lockScroll() {
    unlockScroll();
    const els = new Set<HTMLElement>([document.documentElement, document.body as HTMLElement]);
    document.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const s = getComputedStyle(el);
      if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2) els.add(el);
    });
    els.forEach((el) => {
      lockedElsRef.current.push([el, el.style.overflow]);
      el.style.overflow = "hidden";
    });
  }

  function scrollIntoCenter(el: HTMLElement) {
    let p = el.parentElement;
    while (p) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 2) {
        const er = el.getBoundingClientRect();
        const pr = p.getBoundingClientRect();
        p.scrollTop += er.top - pr.top - (pr.height - er.height) / 2;
        return;
      }
      p = p.parentElement;
    }
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (window.innerHeight - r.height) / 2) });
  }

  const measure = useCallback((s: number) => {
    const step = TOUR[s];
    if (!step?.target) return;
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const P = 8;
    setTourRect({ top: r.top - P, left: r.left - P, width: r.width + P * 2, height: r.height + P * 2 });
    const TW = 320, TH = 190, G = 14, M = 12;
    let top = 0, left = 0;
    if (r.bottom + G + TH < window.innerHeight) {
      top = r.bottom + G;
      left = Math.max(M, Math.min(r.left + r.width / 2 - TW / 2, window.innerWidth - TW - M));
    } else if (r.top - G - TH > 0) {
      top = r.top - G - TH;
      left = Math.max(M, Math.min(r.left + r.width / 2 - TW / 2, window.innerWidth - TW - M));
    } else {
      left = r.right + G + TW < window.innerWidth ? r.right + G : r.left - TW - G;
      top = Math.max(M, Math.min(r.top + r.height / 2 - TH / 2, window.innerHeight - TH - M));
    }
    setTourTip({ top, left });
  }, []);

  function goStep(next: number) {
    if (next >= TOUR.length) { endTour(); return; }
    const step = TOUR[next];
    tourStepRef.current = next;
    setTourStep(next);
    setTourRect(null);
    setTourTip(null);

    if (step.closeModal) window.dispatchEvent(new Event("referidoo:closeModal"));
    if (step.page && step.page !== pathname) router.push(step.page);
    if (step.modal) {
      // Small delay so the page has settled before opening modal
      setTimeout(() => window.dispatchEvent(new Event("referidoo:openFirstReferido")), 300);
    }

    if (step.intro || step.outro) return;

    setTimeout(() => {
      unlockScroll();
      const el = step.target ? document.querySelector<HTMLElement>(step.target) : null;
      if (!el && step.target) {
        // Element not found — skip this step
        goStep(next + 1);
        return;
      }
      if (el) scrollIntoCenter(el);
      setTimeout(() => { measure(next); lockScroll(); }, el ? 470 : 80);
    }, step.modal ? 500 : 130);
  }

  function startTour() {
    setTourActive(true);
    setTourRect(null);
    setTourTip(null);
    tourStepRef.current = 0;
    setTourStep(0);
    if (pathname !== "/admin") router.push("/admin");
  }

  function endTour() {
    unlockScroll();
    setTourActive(false);
    setTourRect(null);
    setTourTip(null);
    fetch("/api/advisor/onboarded", { method: "POST" }).catch(() => {});
  }

  // Remeasure on resize during tour
  useEffect(() => {
    if (!tourActive || tourStep === 0) return;
    const handler = () => measure(tourStepRef.current);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [tourActive, tourStep, measure]);

  // Avatar click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Welcome + onboarding — See CLAUDE.md: Strict Mode + sessionStorage + timer pattern.
  // Do NOT add a cleanup return — Strict Mode would cancel the timers.
  useEffect(() => {
    if (consumedWelcomeFlag.current) return;
    consumedWelcomeFlag.current = true;

    const hasWelcome = sessionStorage.getItem("referidoo_welcome") === "1";
    if (hasWelcome) sessionStorage.removeItem("referidoo_welcome");
    if (hasWelcome) setShowWelcome(true);

    const advisorPromise = fetch("/api/advisor/me")
      .then((r) => r.json())
      .then((adv) => {
        if (typeof adv?.emailVerified === "boolean") setEmailVerified(adv.emailVerified);
        if (adv?.name) setWelcomeName(adv.name);
        if (adv?.plan) setAdvisorPlan(adv.plan === "paid" ? "Plan Pro" : "Plan Gratis");
        return !adv?.onboardedAt;
      })
      .catch(() => false);

    if (hasWelcome) {
      setTimeout(() => setFadingOut(true), 3200);
      setTimeout(() => {
        setShowWelcome(false);
        setFadingOut(false);
        advisorPromise.then((needsOnboarding) => { if (needsOnboarding) startTour(); });
      }, 4000);
    } else {
      advisorPromise.then((needsOnboarding) => { if (needsOnboarding) startTour(); });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function doReset() {
    setResetState("busy");
    await fetch("/api/demo/reset", { method: "POST" });
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function handleVerified() {
    setShowVerifiedBanner(true);
    setTimeout(() => setShowVerifiedBanner(false), 5000);
  }

  const curStep = TOUR[tourStep];
  const isLastStep = tourStep === TOUR.length - 2;

  return (
    <div className={`min-h-screen bg-brand-surface flex flex-col ${hankenGrotesk.className}`}>
      <Suspense fallback={null}>
        <VerifiedBannerWatcher onVerified={handleVerified} />
      </Suspense>

      {/* ── Top bar ── */}
      <header
        className="bg-white border-b border-brand-border-1 sticky top-0 z-20 flex-shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center h-14">
          {/* Logo — same width as sidebar */}
          <div className="hidden md:flex w-52 flex-shrink-0 items-center px-5 h-full border-r border-brand-border-1">
            <Logo size="sm" />
          </div>

          {/* Mobile logo */}
          <div className="flex md:hidden items-center px-4 h-full">
            <Logo size="sm" />
          </div>

          {/* Search bar — desktop */}
          <div className="hidden md:flex flex-1 items-center px-6">
            <div className="relative w-full max-w-sm">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                width="14" height="14" viewBox="0 0 24 24" fill="none"
              >
                <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z"
                  stroke="#9098A2" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar cliente o referido"
                className="w-full pl-9 pr-4 py-2 bg-[#F4F5F7] rounded-full text-sm text-[#0B0B0C] placeholder-[#9098A2] focus:outline-none"
              />
            </div>
          </div>

          {/* Right: "?" tour button + bell + avatar */}
          <div className="flex items-center gap-2.5 px-5 ml-auto">
            {/* Tour help button */}
            <button
              onClick={startTour}
              className="w-9 h-9 rounded-full border border-[#ECEDEF] flex items-center justify-center text-[#6B727D] hover:bg-[#F4F5F7] transition text-sm font-bold"
              title="Iniciar recorrido guiado"
            >
              ?
            </button>

            {/* Bell */}
            <button
              className="w-9 h-9 rounded-full border border-[#ECEDEF] flex items-center justify-center text-[#6B727D] hover:bg-[#F4F5F7] transition"
              title="Notificaciones"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Avatar + dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setShowAvatarMenu((v) => !v)}
                className="w-9 h-9 rounded-full bg-[#0B0B0C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                title={welcomeName || "Perfil"}
              >
                {welcomeName ? getInitials(welcomeName) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z"
                      stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>

              {showAvatarMenu && (
                <div className="absolute right-0 top-11 bg-white border border-[#ECEDEF] rounded-xl shadow-lg p-1 min-w-[160px] z-50">
                  {welcomeName && (
                    <div className="px-3 py-2.5 border-b border-[#ECEDEF] mb-1">
                      <p className="text-sm font-semibold text-[#0B0B0C] truncate">{welcomeName.split(" ").slice(0, 2).join(" ")}</p>
                      <p className="text-xs text-[#9098A2]">{advisorPlan || ""}</p>
                    </div>
                  )}
                  <button
                    onClick={logout}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-[#0B0B0C] hover:bg-[#F4F5F7] rounded-lg transition"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {showVerifiedBanner && (
        <div className="bg-green-50 border-b border-green-100 flex-shrink-0">
          <div className="max-w-5xl mx-auto px-5 py-2.5 text-sm text-green-800">
            ✓ Tu correo quedó verificado. Ya puedes agregar clientes.
          </div>
        </div>
      )}

      {!emailVerified && !showVerifiedBanner && (
        <div className="bg-brand-blue-bg border-b border-brand-border-1 flex-shrink-0">
          <div className="max-w-5xl mx-auto px-5 py-2.5 text-sm text-brand-blue">
            Verifica tu correo para empezar a agregar clientes — revisa tu bandeja de entrada.
          </div>
        </div>
      )}

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar — desktop */}
        <aside
          data-tour="nav"
          className="hidden md:flex w-52 flex-shrink-0 flex-col py-5 px-3 gap-1 border-r border-brand-border-1 bg-white"
        >
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition",
                  active
                    ? "bg-[#0B0B0C] text-white font-semibold"
                    : "text-[#5A626E] hover:bg-[#F4F5F7] hover:text-[#0B0B0C]"
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d={item.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {item.label}
              </Link>
            );
          })}

          {/* Profile card */}
          {welcomeName && (
            <div className="mt-auto mb-3">
              <div className="flex items-center gap-3 p-3 bg-[#F4F5F7] rounded-xl">
                <div className="w-9 h-9 rounded-full bg-[#0B0B0C] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {getInitials(welcomeName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#0B0B0C] truncate leading-tight">
                    {welcomeName.split(" ").slice(0, 2).join(" ")}
                  </p>
                  <p className="text-xs text-[#9098A2] leading-tight">{advisorPlan || "—"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reiniciar demo */}
          <div className={welcomeName ? "pt-3 border-t border-brand-border-1" : "mt-auto pt-4 border-t border-brand-border-1"}>
            {resetState === null && (
              <button
                onClick={() => setResetState("confirm")}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#9098A2] hover:text-[#6B727D] hover:bg-[#F4F5F7] transition"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <path d="M1 4V10H7M23 20V14H17M20.49 9C19.9828 7.56678 19.1209 6.2854 17.9845 5.27542C16.8482 4.26543 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1113 10.0083 20.7757C8.52547 20.4402 7.1518 19.7346 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reiniciar demo
              </button>
            )}
            {resetState === "confirm" && (
              <div className="px-1">
                <p className="text-[11px] text-[#9098A2] mb-2 leading-snug">¿Borrar todos los clientes y referidos?</p>
                <div className="flex gap-1.5">
                  <button onClick={doReset} className="flex-1 text-[11px] py-1.5 rounded-full bg-[#0B0B0C] text-white font-medium hover:bg-[#26262a] transition">
                    Sí, borrar
                  </button>
                  <button onClick={() => setResetState(null)} className="flex-1 text-[11px] py-1.5 rounded-full border border-brand-border-4 text-[#9098A2] hover:bg-[#F4F5F7] transition">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
            {resetState === "busy" && (
              <p className="text-[11px] text-[#9098A2] px-3 py-2">Reiniciando...</p>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main
          className="flex-1 bg-white overflow-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
        >
          <div
            className="w-full mx-auto box-border px-5 py-6 md:px-10 md:pt-9 md:pb-12"
            style={{ maxWidth: 1180 }}
          >
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border-1 z-20"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center pt-3 pb-2 gap-1 transition",
                  active ? "text-[#0B0B0C]" : "text-[#9098A2]"
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
                <p className="welcome-name text-[2.75rem] font-bold tracking-[-0.02em] text-[#0B0B0C] leading-none mb-2">
                  {welcomeName.split(" ")[0]}
                  <span className="opacity-25"> {welcomeName.split(" ").slice(1).join(" ")}</span>
                </p>
                <p className="welcome-sub text-sm text-[#0B0B0C]/30 font-normal tracking-wide">
                  Bienvenido de vuelta
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Tour ── */}
      {tourActive && (
        <>
          <style>{`
            @keyframes tourPulse {
              0%   { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 0   rgba(43,87,240,.5); }
              70%  { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 12px rgba(43,87,240,0); }
              100% { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 0   rgba(43,87,240,0); }
            }
            @keyframes tapRing {
              0%   { transform: scale(.55); opacity: 1; }
              90%  { transform: scale(1.9);  opacity: .08; }
              100% { transform: scale(1.9);  opacity: 0; }
            }
            @keyframes confettiFall {
              0%   { transform: translateY(-12vh) rotate(0deg); }
              100% { transform: translateY(108vh) rotate(720deg); }
            }
            @keyframes popIn {
              0%   { transform: scale(.5); opacity: 0; }
              60%  { transform: scale(1.08); }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>

          {/* Step 0: intro welcome card */}
          {tourStep === 0 && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center"
              style={{ background: "rgba(13,13,15,.82)", backdropFilter: "blur(4px)" }}
            >
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-5 text-center shadow-2xl">
                <div className="flex justify-center mb-6">
                  <Logo size="md" />
                </div>
                <h2 className="text-xl font-bold text-[#0B0B0C] mb-2.5">{TOUR[0].title}</h2>
                <p className="text-sm text-[#6B727D] leading-relaxed mb-8">{TOUR[0].body}</p>
                <button
                  onClick={() => goStep(1)}
                  className="w-full bg-[#2563EB] text-white text-sm font-semibold py-3.5 rounded-full hover:bg-blue-700 active:scale-[.98] transition mb-3"
                >
                  Comenzar recorrido
                </button>
                <button
                  onClick={endTour}
                  className="text-sm text-[#9098A2] hover:text-[#6B727D] transition"
                >
                  Saltar el recorrido
                </button>
              </div>
            </div>
          )}

          {/* Steps 1–13: spotlight */}
          {tourStep > 0 && tourRect && (
            <>
              {/* Spotlight (box-shadow as dim overlay) */}
              <div
                style={{
                  position: "fixed",
                  top: tourRect.top,
                  left: tourRect.left,
                  width: tourRect.width,
                  height: tourRect.height,
                  borderRadius: 14,
                  boxShadow: "0 0 0 9999px rgba(13,13,15,.6)",
                  border: "2.5px solid #2B57F0",
                  zIndex: 70,
                  pointerEvents: "none",
                  animation: curStep?.tap ? "tourPulse 2s ease-in-out infinite" : undefined,
                  transition: "top .3s cubic-bezier(.22,1,.36,1), left .3s cubic-bezier(.22,1,.36,1), width .3s cubic-bezier(.22,1,.36,1), height .3s cubic-bezier(.22,1,.36,1)",
                }}
              />

              {/* Tap ring indicator */}
              {curStep?.tap && (
                <div
                  style={{
                    position: "fixed",
                    top: tourRect.top + tourRect.height / 2 - 18,
                    left: tourRect.left + tourRect.width / 2 - 18,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2.5px solid #2B57F0",
                    zIndex: 71,
                    pointerEvents: "none",
                    animation: "tapRing 1.6s ease-out infinite",
                  }}
                />
              )}
            </>
          )}

          {/* Tooltip (steps 1–13) */}
          {tourStep > 0 && tourTip && (
            <div
              style={{
                position: "fixed",
                top: tourTip.top,
                left: tourTip.left,
                width: 320,
                zIndex: 72,
              }}
              className="bg-white rounded-2xl p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress dots (steps 1–13) */}
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {TOUR.slice(1).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i + 1 === tourStep ? 20 : 8,
                      background: i + 1 === tourStep ? "#0B0B0C" : i + 1 < tourStep ? "#DADCE0" : "#ECEDEF",
                    }}
                  />
                ))}
              </div>

              <h3 className="text-sm font-bold text-[#0B0B0C] mb-1.5 leading-snug">
                {curStep?.title}
              </h3>
              <p className="text-xs text-[#6B727D] leading-relaxed mb-4">
                {curStep?.body}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => goStep(tourStep + 1)}
                  className="flex-1 bg-[#0B0B0C] text-white text-xs font-semibold py-2.5 rounded-full hover:bg-[#26262a] active:scale-[.98] transition"
                >
                  {isLastStep ? "¡Listo! ✓" : "Siguiente →"}
                </button>
                {!isLastStep && (
                  <button
                    onClick={endTour}
                    className="px-4 text-xs py-2.5 rounded-full border border-[#ECEDEF] text-[#9098A2] hover:bg-[#F4F5F7] transition"
                  >
                    Saltar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Outro: pantalla de cierre con festejo */}
          {curStep?.outro && (
            <>
              <div
                className="fixed inset-0 z-[70]"
                style={{ background: "rgba(13,13,15,.82)", backdropFilter: "blur(4px)" }}
              />

              {!reducedMotion && (
                <div style={{ position: "fixed", inset: 0, zIndex: 71, pointerEvents: "none", overflow: "hidden" }}>
                  {confettiRef.current.map((s, i) => (
                    <div key={i} style={s} />
                  ))}
                </div>
              )}

              <div
                className="fixed text-center"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 440,
                  maxWidth: "calc(100vw - 40px)",
                  background: "#fff",
                  borderRadius: 26,
                  padding: "40px 36px 32px",
                  boxShadow: "0 40px 100px -24px rgba(0,0,0,.6)",
                  zIndex: 72,
                  boxSizing: "border-box",
                }}
              >
                <div
                  className="flex items-center justify-center mx-auto"
                  style={{
                    width: 74,
                    height: 74,
                    borderRadius: "50%",
                    background: "#2B57F0",
                    marginBottom: 22,
                    animation: reducedMotion ? undefined : "popIn .5s cubic-bezier(.34,1.3,.5,1) both",
                  }}
                >
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>

                <div className="font-extrabold text-[27px] tracking-[-0.02em] text-[#0B0B0C]" style={{ marginBottom: 12 }}>
                  {curStep.title}
                </div>
                <div className="font-medium text-base leading-relaxed text-[#52525b]" style={{ marginBottom: 28 }}>
                  {curStep.body}
                </div>

                <button
                  onClick={endTour}
                  className="w-full text-white font-bold text-[15px]"
                  style={{ border: "none", background: "#2B57F0", cursor: "pointer", padding: "15px 0", borderRadius: 14 }}
                >
                  Empezar a referir
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
