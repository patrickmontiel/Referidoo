"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Hanken_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { computeTipPosition } from "@/lib/tour-position";
import { SHOW_BUBBLE_REWARDS } from "@/lib/product-visibility";
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
  event?: string;      // evento a disparar al entrar (p. ej. abrir un modal)
  closeModal?: boolean;
  title: string;
  body: string;
};

// Resuelve un selector al primer elemento VISIBLE (no de tamaño 0). Necesario
// porque hay botones duplicados móvil/desktop (uno oculto por CSS) — sin esto
// querySelector agarraría el oculto y el paso se saltaría.
function findVisibleEl(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return els[0] ?? null;
}

// ── Primeros Pasos: las tareas de activación y su recorrido guiado ──
export type TaskId = "email" | "client" | "tiers" | "share" | "agenda";

export type TaskState = {
  emailVerified: boolean;
  hasClient: boolean;
  hasTiers: boolean;
  hasReferral: boolean;
  hasScheduling: boolean;
};

type TaskDef = {
  id: TaskId;
  label: string;
  done: (s: TaskState) => boolean;
  flow: TourStepDef[];
};

// Pasos que caminan el ciclo COMPLETO de registrar un cliente — reusados por el
// onboarding y por la tarea "Agrega tu primer cliente".
const CLIENT_STEPS: TourStepDef[] = [
  { target: '[data-tour="nav-clientes"]', page: "/admin", tap: true, title: "Vamos a Clientes",
    body: "Toca Clientes: es donde vive tu cartera y desde donde cada persona empieza a referir." },
  { target: '[data-tour="add-client"]', page: "/admin/clientes", title: "Aquí agregas clientes",
    body: "Este botón abre el formulario de un nuevo cliente. Dale a Siguiente y te lo abro." },
  { target: '[data-tour="client-name"]', page: "/admin/clientes", event: "referidoo:openClientForm", title: "Sus datos",
    body: "Llena nombre, teléfono y correo — los tres son obligatorios. Con eso tu cliente queda bien registrado." },
  { target: '[data-tour="client-save"]', page: "/admin/clientes", title: "Guárdalo",
    body: "Toca “Crear cliente”. Al guardarlo, esa persona ya tiene su propio link de referidos." },
  { target: '[data-tour="client-whatsapp"]', page: "/admin/clientes", title: "Mándale su link",
    body: "Por último, tócale WhatsApp para enviarle su link. Cuando lo comparta con sus amigos, esos referidos te llegan solos. ¡Y listo!" },
];

// Pasos para configurar la escalera de premios (ver → ajustar → guardar).
const TIERS_STEPS: TourStepDef[] = [
  { target: '[data-tour="nav-premios"]', page: "/admin", tap: true, title: "Vamos a Premios",
    body: "Toca Premios: aquí decides cuánto gana tu cliente por cada referido que le cierres." },
  { target: '[data-tour="premios"]', page: "/admin/niveles", title: "Tu escalera de premios",
    body: "Cada nivel es lo que gana tu cliente por su 1er, 2º y 3er referido cerrado. Toca un monto para cambiarlo — por ejemplo, baja el 3er nivel de $3,500 a $2,500." },
  // Burbuja oculta en Fase 1 — el paso solo aparece si SHOW_BUBBLE_REWARDS.
  ...(SHOW_BUBBLE_REWARDS ? [{ target: '[data-tour="bubble"]', page: "/admin/niveles", title: "Premios burbuja (Pro)",
    body: "Estos son de los planes Pro (premios por Auto y Gastos Médicos). En tu plan no se editan — no necesitas tocar nada aquí." } as TourStepDef] : []),
  { target: '[data-tour="save-premios"]', page: "/admin/niveles", title: "Guarda tu escalera",
    body: "Baja y toca “Guardar cambios” para dejarla lista. Es lo que verán tus clientes en su portal." },
];

export const TASKS: TaskDef[] = [
  {
    id: "email",
    label: "Verifica tu correo",
    done: (s) => s.emailVerified,
    flow: [
      { target: '[data-tour="verify-banner"]', page: "/admin", title: "Verifica tu correo",
        body: "Abre el correo que te enviamos y toca “Verificar mi correo”. Puedes hacerlo desde tu celular — tu panel se actualiza solo. ¿No llegó? Usa “reenviar correo” aquí mismo." },
    ],
  },
  {
    id: "client",
    label: "Agrega tu primer cliente",
    done: (s) => s.hasClient,
    flow: CLIENT_STEPS,
  },
  {
    id: "tiers",
    label: "Configura tu escalera de premios",
    done: (s) => s.hasTiers,
    flow: TIERS_STEPS,
  },
  {
    id: "share",
    label: "Consigue tu primer referido",
    done: (s) => s.hasReferral,
    flow: [
      { target: '[data-tour="nav-clientes"]', page: "/admin", tap: true, title: "Vamos a Clientes",
        body: "Toca Clientes: cada uno tiene su propio link para referir." },
      { target: '[data-tour="client-share"]', page: "/admin/clientes", title: "Copia y comparte su link",
        body: "Copia el link de tu cliente y mándaselo por WhatsApp para que refiera a sus amigos y familiares. En cuanto llegue el primer referido, esta tarea se marca sola." },
    ],
  },
  {
    id: "agenda",
    label: "Pon tu link de agenda",
    done: (s) => s.hasScheduling,
    flow: [
      { target: '[data-tour="nav-premios"]', page: "/admin", tap: true, title: "Vamos a Premios",
        body: "Tu link de agenda vive en Premios. Toca para ir." },
      { target: '[data-tour="agenda-options"]', page: "/admin/niveles", title: "Elige dónde crear tu agenda",
        body: "Puedes usar Google Calendar, Calendly o Cal.com. Toca uno: se abre su página en otra pestaña, creas tu cuenta gratis y armas tu página de citas. Luego vuelve aquí." },
      { target: '[data-tour="agenda"]', page: "/admin/niveles", title: "Pega tu link",
        body: "Copia el link de tu página de citas y pégalo aquí. Aparecerá como botón “Agendar una cita” en el formulario de tus referidos." },
      { target: '[data-tour="save-premios"]', page: "/admin/niveles", title: "Guarda",
        body: "Toca “Guardar cambios” y listo — tus referidos ya pueden agendar contigo." },
    ],
  },
];

// Onboarding corto tras la bienvenida: mismo ciclo completo de primer cliente,
// con una intro. Al cerrar, aparece Primeros Pasos.
const ONBOARDING_FLOW: TourStepDef[] = [
  { intro: true, title: "Tu cuenta está lista",
    body: "En 30 segundos registras a tu primer cliente para que empiece a referir. Te llevo paso a paso." },
  ...CLIENT_STEPS,
];

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

type AdminLayoutShellProps = {
  children: React.ReactNode;
  initialAdvisorName: string;
  initialEmailVerified: boolean;
  initialPlan: string;
  initialOnboardedAt: string | null;
};

export default function AdminLayoutShell({
  children,
  initialAdvisorName,
  initialEmailVerified,
  initialPlan,
  initialOnboardedAt,
}: AdminLayoutShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [showWelcome, setShowWelcome] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [welcomeName, setWelcomeName] = useState(initialAdvisorName);
  const [advisorPlan, setAdvisorPlan] = useState(initialPlan === "paid" ? "Plan Pro" : "Plan Gratis");
  const [billingStatus, setBillingStatus] = useState<"paid" | "trial" | "trial_expired" | "freemium" | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(initialEmailVerified);
  const [showVerifiedBanner, setShowVerifiedBanner] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [resentVerif, setResentVerif] = useState(false);
  const consumedWelcomeFlag = useRef(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Tour / flow state
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourRect, setTourRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tourTip, setTourTip] = useState<{ top: number; left: number } | null>(null);
  const [flow, setFlow] = useState<TourStepDef[]>([]);
  const flowRef = useRef<TourStepDef[]>([]);
  const flowSealsRef = useRef(false);
  const tourStepRef = useRef(0);
  const lockedElsRef = useRef<Array<[HTMLElement, string]>>([]);
  const confettiRef = useRef<React.CSSProperties[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Primeros Pasos state
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevDoneRef = useRef<number | null>(null);
  const taskStateRef = useRef<TaskState | null>(null);
  const checklistRef = useRef<HTMLDivElement>(null);

  const refetchTasks = useCallback(() => {
    fetch("/api/advisor/onboarding-tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: TaskState | null) => {
        if (d) {
          setTaskState(d);
          // Mantiene en sync la tarjeta del Resumen (otro componente).
          window.dispatchEvent(new Event("referidoo:tasks-updated"));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
  }, []);

  // Auto-cura de sesión: el JWT puede quedarse viejo (correo verificado en
  // otro dispositivo, plan cambiado por webhook/cron). Al montar se re-firma
  // el token contra la base y se sincronizan banner y label del plan.
  useEffect(() => {
    fetch("/api/auth/refresh", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.emailVerified === true && !initialEmailVerified) {
          setEmailVerified(true);
          setShowVerifiedBanner(true);
          setTimeout(() => setShowVerifiedBanner(false), 4000);
        } else if (typeof d.emailVerified === "boolean") {
          setEmailVerified(d.emailVerified);
        }
        if (typeof d.plan === "string") {
          setAdvisorPlan(d.plan === "paid" ? "Plan Pro" : "Plan Gratis");
        }
        if (typeof d.billingStatus === "string") setBillingStatus(d.billingStatus);
        if (d.trialEndsAt !== undefined) setTrialEndsAt(d.trialEndsAt);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronización en vivo de la verificación de correo. Si la asesora
  // verifica su correo desde OTRA pestaña (el link del correo abre una nueva)
  // o desde su teléfono mientras aquí va a medias agregando un cliente, esta
  // pestaña se entera y baja el banner SIN recargar — no pierde lo que estaba
  // escribiendo. Cubre 3 vías: BroadcastChannel (misma-navegador), evento
  // storage (fallback), y re-check al volver el foco / poll suave (teléfono).
  useEffect(() => {
    if (emailVerified) return; // ya verificada — nada que vigilar

    let done = false;
    const flip = () => {
      if (done) return;
      done = true;
      setEmailVerified(true);
      setShowVerifiedBanner(true);
      setTimeout(() => setShowVerifiedBanner(false), 5000);
    };

    let bc: BroadcastChannel | undefined;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("referidoo-auth");
      bc.onmessage = (e) => { if (e.data?.type === "email-verified") flip(); };
    }
    const onStorage = (e: StorageEvent) => { if (e.key === "referidoo-email-verified") flip(); };
    window.addEventListener("storage", onStorage);

    const recheck = () => {
      if (done || document.visibilityState !== "visible") return;
      fetch("/api/auth/refresh", { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d?.emailVerified === true) flip(); })
        .catch(() => {});
    };
    window.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    // Poll mientras la pestaña esté visible: cubre el caso cross-device (verificas
    // en el celular sin tocar la compu → ningún evento focus/visibility dispara,
    // solo el poll refleja el cambio). 8s = se siente casi inmediato sin martillar.
    const poll = window.setInterval(recheck, 8000);

    return () => {
      bc?.close();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
      window.clearInterval(poll);
    };
  }, [emailVerified]);

  if (confettiRef.current.length === 0) {
    const CONFETTI_COLORS = ["#2563EB", "#0B0B0C", "#1FAE54", "#F5B53F", "#5B86F7", "#E7395A"];
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
    // Deslizamiento suave (no salto brusco) al centrar el elemento del paso.
    const behavior: ScrollBehavior = reducedMotion ? "auto" : "smooth";
    let p = el.parentElement;
    while (p) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 2) {
        const er = el.getBoundingClientRect();
        const pr = p.getBoundingClientRect();
        p.scrollTo({ top: p.scrollTop + er.top - pr.top - (pr.height - er.height) / 2, behavior });
        return;
      }
      p = p.parentElement;
    }
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (window.innerHeight - r.height) / 2), behavior });
  }

  const measure = useCallback((s: number) => {
    const step = flowRef.current[s];
    if (!step?.target) return;
    const el = findVisibleEl(step.target);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const P = 8;
    const rect = { top: r.top - P, left: r.left - P, width: r.width + P * 2, height: r.height + P * 2 };
    setTourRect(rect);

    // El tooltip nunca debe encimarse del elemento iluminado — ver
    // computeTipPosition (barrido de no-overlap en tour-position.test.ts).
    const navEl = document.querySelector<HTMLElement>('[data-tour="nav"]');
    const navRight = navEl && navEl.offsetWidth > 0 ? navEl.getBoundingClientRect().right : 0;
    const M = 12;
    const p = computeTipPosition({
      rect,
      vw: window.innerWidth,
      vh: window.innerHeight,
      tipW: 320,
      tipH: 200,
      gap: 16,
      margin: M,
      minLeft: Math.max(M, navRight + 16),
    });
    setTourTip({ top: p.top, left: p.left });
  }, []);

  function goStep(next: number) {
    if (next >= flowRef.current.length) { endFlow(); return; }
    const step = flowRef.current[next];
    const changingPage = !!step.page && step.page !== pathname;
    tourStepRef.current = next;
    setTourStep(next);
    // En la misma página conservamos spotlight y tooltip para que MORFEEN a la
    // nueva posición (transición CSS) en vez de parpadear. Solo los limpiamos
    // al cambiar de página, donde el ancla vieja apunta a un elemento que ya
    // no existe.
    if (changingPage || step.intro || step.outro) {
      setTourRect(null);
      setTourTip(null);
    }

    if (step.closeModal) window.dispatchEvent(new Event("referidoo:closeModal"));
    if (changingPage) router.push(step.page!);
    if (step.event) {
      // Pequeño delay para que la página se asiente antes de abrir el modal/panel.
      setTimeout(() => window.dispatchEvent(new Event(step.event!)), 300);
    }

    if (step.intro || step.outro) return;

    // Reintento: al cambiar de página o abrir un modal, el elemento tarda en
    // renderizar. Si medimos a los 130ms y aún no está, ANTES saltábamos el paso
    // — y como toda la página nueva no había cargado, se saltaban TODOS los pasos
    // en cascada hasta terminar el recorrido. Ahora se sondea el elemento hasta
    // ~2s antes de darlo por ausente.
    const runStep = (attempt: number) => {
      if (tourStepRef.current !== next) return; // el usuario ya avanzó
      unlockScroll();
      const el = step.target ? findVisibleEl(step.target) : null;
      const hidden = el ? (() => { const r0 = el.getBoundingClientRect(); return r0.width === 0 && r0.height === 0; })() : false;
      if (step.target && (!el || hidden)) {
        if (attempt < 14) { setTimeout(() => runStep(attempt + 1), 150); return; }
        goStep(next + 1); // de plano no aparece — sáltalo
        return;
      }
      if (el) {
        scrollIntoCenter(el);
      }
      // Con scroll suave hay que esperar a que asiente antes de medir el
      // spotlight (si no, cae a media animación).
      setTimeout(() => { measure(next); lockScroll(); }, el ? (reducedMotion ? 470 : 620) : 80);
    };
    // Primer intento tras un delay base (más largo si abre modal o cambia de página).
    setTimeout(() => runStep(0), step.event ? 500 : changingPage ? 300 : 130);
  }

  // Arranca cualquier recorrido (onboarding o una tarea). sealOnboarding sella
  // onboardedAt al terminar (solo el flujo de onboarding lo hace).
  function startFlow(steps: TourStepDef[], sealOnboarding = false) {
    if (!steps.length) return;
    flowRef.current = steps;
    setFlow(steps);
    flowSealsRef.current = sealOnboarding;
    setShowChecklist(false);
    setTourActive(true);
    setTourRect(null);
    setTourTip(null);
    goStep(0);
  }

  function endFlow() {
    unlockScroll();
    setTourActive(false);
    setTourRect(null);
    setTourTip(null);
    if (flowSealsRef.current) {
      flowSealsRef.current = false;
      fetch("/api/advisor/onboarded", { method: "POST" }).catch(() => {});
    }
    // Una tarea pudo haberse completado durante el recorrido — re-checa.
    setTimeout(() => refetchTasks(), 400);
  }

  // Lanza la tarea con la lógica correcta. "Consigue tu primer referido"
  // necesita un cliente con link — si no hay, guía primero a agregar uno en vez
  // de señalar un botón inexistente.
  function launchTask(id: TaskId) {
    const task = TASKS.find((t) => t.id === id);
    if (!task) return;
    // Paso 1 obligatorio: sin correo verificado, las demás tareas están bloqueadas.
    if (id !== "email" && taskStateRef.current && !taskStateRef.current.emailVerified) return;
    if (id === "share" && taskStateRef.current && !taskStateRef.current.hasClient) {
      startFlow([
        { intro: true, title: "Primero, un cliente",
          body: "Para conseguir referidos necesitas al menos un cliente con su link. Vamos a agregar uno." },
        ...CLIENT_STEPS,
      ]);
      return;
    }
    startFlow(task.flow);
  }

  // Remeasure on resize during tour
  useEffect(() => {
    if (!tourActive || tourStep === 0) return;
    const handler = () => measure(tourStepRef.current);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [tourActive, tourStep, measure]);

  // Pasos "tap": si el asesor obedece la instrucción y toca el elemento
  // señalado (navega a la página del siguiente paso), el tour avanza solo —
  // sin esto, la instrucción "toca el menú" no hace avanzar nada y confunde.
  useEffect(() => {
    if (!tourActive) return;
    const cur = flowRef.current[tourStepRef.current];
    const next = flowRef.current[tourStepRef.current + 1];
    if (cur?.tap && next?.page === pathname && cur.page !== pathname) {
      goStep(tourStepRef.current + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, tourActive]);

  // Escape cierra el tour (misma semántica que "Saltar")
  useEffect(() => {
    if (!tourActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") endFlow();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive]);

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

  // Primeros Pasos: carga inicial + refresco al volver el foco / al verificar.
  useEffect(() => { refetchTasks(); }, [refetchTasks]);
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") refetchTasks(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetchTasks]);
  useEffect(() => { if (emailVerified) refetchTasks(); }, [emailVerified, refetchTasks]);

  // Celebración al completar las 5 tareas — se dispara una sola vez, en la
  // transición a completo (compara contra el conteo previo).
  useEffect(() => {
    taskStateRef.current = taskState;
    if (!taskState) return;
    const done = TASKS.filter((t) => t.done(taskState)).length;
    const prev = prevDoneRef.current;
    prevDoneRef.current = done;
    if (prev !== null && prev < TASKS.length && done === TASKS.length) {
      setCelebrate(true);
    }
  }, [taskState]);

  // Lanzar el recorrido de una tarea desde la tarjeta del Resumen (evento).
  useEffect(() => {
    const onStartTask = (e: Event) => {
      const id = (e as CustomEvent).detail as TaskId;
      launchTask(id);
    };
    window.addEventListener("referidoo:startTask", onStartTask as EventListener);
    return () => window.removeEventListener("referidoo:startTask", onStartTask as EventListener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cerrar el checklist del chip al hacer click afuera.
  useEffect(() => {
    if (!showChecklist) return;
    function onClick(e: MouseEvent) {
      if (checklistRef.current && !checklistRef.current.contains(e.target as Node)) setShowChecklist(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showChecklist]);

  // Welcome + onboarding — See CLAUDE.md: Strict Mode + sessionStorage + timer pattern.
  // Do NOT add a cleanup return — Strict Mode would cancel the timers.
  useEffect(() => {
    if (consumedWelcomeFlag.current) return;
    consumedWelcomeFlag.current = true;

    const hasWelcome = sessionStorage.getItem("referidoo_welcome") === "1";
    if (hasWelcome) sessionStorage.removeItem("referidoo_welcome");
    if (hasWelcome) setShowWelcome(true);

    const needsOnboarding = !initialOnboardedAt;

    if (hasWelcome) {
      setTimeout(() => setFadingOut(true), 3200);
      setTimeout(() => {
        setShowWelcome(false);
        setFadingOut(false);
        if (needsOnboarding) startFlow(ONBOARDING_FLOW, true);
      }, 4000);
    } else {
      if (needsOnboarding) startFlow(ONBOARDING_FLOW, true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // D1: plan field in JWT can be stale after server-side downgrades (crons are
  // server-to-server and cannot clear browser cookies). Fetch fresh plan on
  // mount and update the sidebar label if it differs.
  useEffect(() => {
    fetch("/api/advisor/me")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((data: { plan?: string } | null) => {
        if (!data?.plan) return;
        setAdvisorPlan(data.plan === "paid" ? "Plan Pro" : "Plan Gratis");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function resendVerification() {
    if (resendingVerif || resentVerif) return;
    setResendingVerif(true);
    await fetch("/api/auth/resend-verification", { method: "POST" }).catch(() => {});
    setResendingVerif(false);
    setResentVerif(true);
    setTimeout(() => setResentVerif(false), 4000);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  function handleVerified() {
    setShowVerifiedBanner(true);
    setTimeout(() => setShowVerifiedBanner(false), 5000);
  }

  const curStep = flow[tourStep];
  const isLastStep = tourStep === flow.length - 1;
  const spotSteps = flow.filter((s) => !s.intro && !s.outro);
  const spotIndex = flow.slice(0, tourStep + 1).filter((s) => !s.intro && !s.outro).length - 1;
  const doneCount = taskState ? TASKS.filter((t) => t.done(taskState)).length : 0;
  const allTasksDone = !!taskState && doneCount === TASKS.length;
  const showTasksChip = !!taskState && !allTasksDone;

  // Días restantes del trial Pro — solo avisamos en la recta final (≤7) para
  // no molestar durante todo el mes.
  const trialDaysLeft =
    billingStatus === "trial" && trialEndsAt
      ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;
  const showTrialEnding = trialDaysLeft !== null && trialDaysLeft <= 7;

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

          {/* Right: Primeros Pasos chip + "?" + bell + avatar */}
          <div className="flex items-center gap-2.5 px-5 ml-auto">
            <style>{`@keyframes ppPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); } 50% { box-shadow: 0 0 0 4px rgba(37,99,235,.10); } }`}</style>

            {/* Chip de Primeros Pasos — persiste hasta 5/5, pulsa mientras haya pendientes */}
            {showTasksChip && (
              <div className="relative" ref={checklistRef}>
                <button
                  onClick={() => setShowChecklist((v) => !v)}
                  className="relative flex items-center gap-1.5 h-9 pl-1.5 pr-3 rounded-full border border-[#ECEDEF] hover:bg-[#F4F5F7] transition"
                  title="Primeros pasos"
                  style={{ animation: reducedMotion ? undefined : "ppPulse 2.6s ease-in-out infinite" }}
                >
                  <span className="relative w-6 h-6 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="12" cy="12" r="9" fill="none" stroke="#ECEDEF" strokeWidth="3" />
                      <circle
                        cx="12" cy="12" r="9" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 9}
                        strokeDashoffset={2 * Math.PI * 9 * (1 - doneCount / TASKS.length)}
                        style={{ transition: "stroke-dashoffset .5s ease" }}
                      />
                    </svg>
                  </span>
                  <span className="text-xs font-semibold text-[#0B0B0C]">{doneCount}/{TASKS.length}</span>
                </button>

                {showChecklist && (
                  <div className="absolute right-0 top-11 bg-white border border-[#ECEDEF] rounded-2xl shadow-xl p-2 w-72 z-50">
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-sm font-bold text-[#0B0B0C]">Primeros pasos</p>
                      <p className="text-xs text-[#9098A2]">Completa tu cuenta — {doneCount} de {TASKS.length}</p>
                    </div>
                    {!(taskState?.emailVerified ?? false) && (
                      <p className="text-xs text-[#2563EB] px-3 pb-1.5">Verifica tu correo para desbloquear el resto.</p>
                    )}
                    {TASKS.map((t) => {
                      const done = taskState ? t.done(taskState) : false;
                      const verified = taskState?.emailVerified ?? false;
                      const locked = t.id !== "email" && !verified && !done;
                      return (
                        <button
                          key={t.id}
                          disabled={done || locked}
                          aria-disabled={done || locked}
                          onClick={() => { if (locked) return; setShowChecklist(false); launchTask(t.id); }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition",
                            done || locked ? "text-[#9098A2] cursor-default" : "text-[#0B0B0C] hover:bg-[#F4F5F7]"
                          )}
                        >
                          <span className={cn("flex items-center gap-2.5 flex-1 min-w-0", locked && "blur-[1.5px] opacity-55")}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-[#1F9D5B]" : "border-2 border-[#DADCE0]"}`}>
                              {done && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                            </span>
                            <span className={done ? "line-through" : ""}>{t.label}</span>
                          </span>
                          {done ? null : locked ? (
                            <span className="text-[#9098A2] flex-shrink-0" aria-hidden="true">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </span>
                          ) : (
                            <span className="text-[#2563EB] font-semibold">→</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Reabrir el onboarding corto */}
            <button
              onClick={() => startFlow(ONBOARDING_FLOW)}
              className="w-9 h-9 rounded-full border border-[#ECEDEF] flex items-center justify-center text-[#6B727D] hover:bg-[#F4F5F7] transition text-sm font-bold"
              title="Ver de nuevo el recorrido"
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
            Tu correo quedó verificado. Ya puedes agregar clientes.
          </div>
        </div>
      )}

      {!emailVerified && !showVerifiedBanner && (
        <div data-tour="verify-banner" className="bg-brand-blue-bg border-b border-brand-border-1 flex-shrink-0">
          <div className="max-w-5xl mx-auto px-5 py-2.5 text-sm text-brand-blue flex items-center justify-between gap-3">
            <span>
              {resentVerif
                ? "Te enviamos un correo nuevo. Abre el MÁS reciente — los anteriores dejan de servir."
                : "Verifica tu correo para empezar a agregar clientes. Puedes abrirlo desde cualquier dispositivo."}
            </span>
            {resentVerif ? (
              <span className="text-green-700 font-medium whitespace-nowrap flex-shrink-0">reenviado</span>
            ) : (
              <button
                onClick={resendVerification}
                disabled={resendingVerif}
                className="underline whitespace-nowrap flex-shrink-0 disabled:opacity-50 bg-transparent border-0 p-0 text-brand-blue text-sm cursor-pointer"
              >
                {resendingVerif ? "enviando…" : "reenviar correo"}
              </button>
            )}
          </div>
        </div>
      )}

      {billingStatus === "trial_expired" && (
        <div className="bg-brand-blue-bg border-b border-brand-border-1 flex-shrink-0">
          <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-brand-blue">
              <span className="font-semibold">Tu mes de prueba terminó.</span>{" "}
              Reactiva Pro para conservar comisiones más bajas, clientes ilimitados y los envíos por WhatsApp.
            </p>
            <Link
              href="/admin/perfil?upgrade=pro"
              className="flex-shrink-0 bg-brand-blue text-white text-sm font-semibold px-4 py-2 rounded-full hover:opacity-90 active:scale-[.98] transition whitespace-nowrap"
            >
              Reactivar Pro
            </Link>
          </div>
        </div>
      )}

      {showTrialEnding && (
        <div className="bg-brand-blue-bg border-b border-brand-border-1 flex-shrink-0">
          <div className="max-w-5xl mx-auto px-5 py-2.5 text-sm text-brand-blue flex items-center justify-between gap-3">
            <span>
              {trialDaysLeft! <= 0
                ? "Tu prueba Pro termina hoy."
                : `Tu prueba Pro termina en ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"}.`}{" "}
              Agrega tu método de pago para no perder los beneficios.
            </span>
            <Link
              href="/admin/perfil?upgrade=pro"
              className="underline whitespace-nowrap flex-shrink-0 text-brand-blue font-medium"
            >
              Agregar pago
            </Link>
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

        </aside>

        {/* Main content */}
        <main
          className="flex-1 bg-white overflow-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4.5rem)" }}
        >
          <div
            className="w-full mx-auto box-border px-5 py-6 md:px-10 md:pt-9 md:pb-12"
            style={{ maxWidth: 960 }}
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
                  {welcomeName}
                </p>
                <p className="welcome-sub text-sm text-[#0B0B0C]/30 font-normal tracking-wide">
                  {initialOnboardedAt ? "Bienvenido de vuelta" : "Tu cuenta está lista"}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Recorrido / celebración ── */}
      {(tourActive || celebrate) && (
        <>
          <style>{`
            @keyframes tourPulse {
              0%   { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 0   rgba(37,99,235,.5); }
              70%  { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 12px rgba(37,99,235,0); }
              100% { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 0   rgba(37,99,235,0); }
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
            @keyframes tipContentIn {
              0%   { opacity: 0; transform: translateY(5px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes tipCardIn {
              0%   { opacity: 0; transform: scale(.96); }
              100% { opacity: 1; transform: scale(1); }
            }
          `}</style>

          {/* Paso intro: tarjeta de bienvenida (solo si el flujo la tiene) */}
          {curStep?.intro && (
            <div
              className="fixed inset-0 z-[70] flex items-center justify-center"
              style={{ background: "rgba(13,13,15,.82)", backdropFilter: "blur(4px)" }}
            >
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-5 text-center shadow-2xl">
                <div className="flex justify-center mb-6">
                  <Logo size="md" />
                </div>
                <h2 className="text-xl font-bold text-[#0B0B0C] mb-2.5">{curStep.title}</h2>
                <p className="text-sm text-[#6B727D] leading-relaxed mb-8">{curStep.body}</p>
                <button
                  onClick={() => goStep(tourStep + 1)}
                  className="w-full bg-[#2563EB] text-white text-sm font-semibold py-3.5 rounded-full hover:bg-blue-700 active:scale-[.98] transition mb-3"
                >
                  Empezar
                </button>
                <button
                  onClick={endFlow}
                  className="text-sm text-[#9098A2] hover:text-[#6B727D] transition"
                >
                  Ahora no
                </button>
              </div>
            </div>
          )}

          {/* Spotlight de un paso normal */}
          {curStep && !curStep.intro && !curStep.outro && tourRect && (
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
                  border: "2.5px solid #2563EB",
                  zIndex: 70,
                  pointerEvents: "none",
                  animation: curStep?.tap && !reducedMotion ? "tourPulse 2s ease-in-out infinite" : undefined,
                  transition: "top .45s cubic-bezier(.22,1,.36,1), left .45s cubic-bezier(.22,1,.36,1), width .45s cubic-bezier(.22,1,.36,1), height .45s cubic-bezier(.22,1,.36,1)",
                }}
              />

              {/* Tap ring indicator */}
              {curStep?.tap && !reducedMotion && (
                <div
                  style={{
                    position: "fixed",
                    top: tourRect.top + tourRect.height / 2 - 18,
                    left: tourRect.left + tourRect.width / 2 - 18,
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "2.5px solid #2563EB",
                    zIndex: 71,
                    pointerEvents: "none",
                    animation: "tapRing 1.6s ease-out infinite",
                  }}
                />
              )}
            </>
          )}

          {/* Tooltip del paso normal */}
          {curStep && !curStep.intro && !curStep.outro && tourTip && (
            <div
              role="dialog"
              aria-label={curStep?.title}
              style={{
                position: "fixed",
                top: tourTip.top,
                left: tourTip.left,
                width: 320,
                maxWidth: "calc(100vw - 24px)",
                zIndex: 72,
                transition: reducedMotion
                  ? undefined
                  : "top .45s cubic-bezier(.22,1,.36,1), left .45s cubic-bezier(.22,1,.36,1)",
                animation: reducedMotion ? undefined : "tipCardIn .28s cubic-bezier(.22,1,.36,1) both",
              }}
              className="bg-white rounded-2xl p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress dots — solo si el flujo tiene varios pasos */}
              {spotSteps.length > 1 && (
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {spotSteps.map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: i === spotIndex ? 20 : 8,
                        background: i === spotIndex ? "#0B0B0C" : i < spotIndex ? "#DADCE0" : "#ECEDEF",
                      }}
                    />
                  ))}
                </div>
              )}

              <div
                key={tourStep}
                style={{ animation: reducedMotion ? undefined : "tipContentIn .3s ease-out both" }}
              >
                <h3 className="text-sm font-bold text-[#0B0B0C] mb-1.5 leading-snug">
                  {curStep?.title}
                </h3>
                <p className="text-xs text-[#6B727D] leading-relaxed mb-4">
                  {curStep?.body}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => goStep(tourStep + 1)}
                  className="flex-1 bg-[#0B0B0C] text-white text-xs font-semibold py-2.5 rounded-full hover:bg-[#26262a] active:scale-[.98] transition"
                >
                  {isLastStep ? "¡Listo!" : "Siguiente →"}
                </button>
                {!isLastStep && (
                  <button
                    onClick={endFlow}
                    className="px-4 text-xs py-2.5 rounded-full border border-[#ECEDEF] text-[#9098A2] hover:bg-[#F4F5F7] transition"
                  >
                    Cerrar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Celebración: se completaron las 5 tareas de Primeros Pasos */}
          {celebrate && (
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
                    background: "#2563EB",
                    marginBottom: 22,
                    animation: reducedMotion ? undefined : "popIn .5s cubic-bezier(.34,1.3,.5,1) both",
                  }}
                >
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>

                <div className="font-extrabold text-[27px] tracking-[-0.02em] text-[#0B0B0C]" style={{ marginBottom: 12 }}>
                  ¡Todo listo!
                </div>
                <div className="font-medium text-base leading-relaxed text-[#52525b]" style={{ marginBottom: 28 }}>
                  Completaste tus primeros pasos. Tu programa de referidos ya está en marcha.
                </div>

                <button
                  onClick={() => setCelebrate(false)}
                  className="w-full text-white font-bold text-[15px] active:scale-[.98] transition-transform"
                  style={{ border: "none", background: "#2563EB", cursor: "pointer", padding: "15px 0", borderRadius: 999 }}
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
