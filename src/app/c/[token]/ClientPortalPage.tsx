"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";
import { formatCurrency, formatDate, getStatusLabel, getRewardStatusLabel } from "@/lib/utils";
import { Logo } from "@/components/Logo";

function tierOrdinal(n: number) {
  const map: Record<number, string> = { 1: "1ro", 2: "2do", 3: "3ro", 4: "4to", 5: "5to", 6: "6to", 7: "7mo", 8: "8vo" };
  return map[n] ?? `${n}°`;
}

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

type RewardTier = { position: number; amount: number; label: string | null };

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  tierPosition: number;
  productType: string | null;
  createdAt: string;
  rewardPaidAt: string | null;
  confirmedByReferrer: boolean;
  referrerConfirmedAt: string | null;
};

type BubbleClaim = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

type PortalData = {
  client: { id: string; name: string; referralCode: string; createdAt: string; launchBonusUsed: boolean; bubblePoints: number };
  advisor: { name: string; phone: string | null; companyName: string | null; whatsappMessage: string | null };
  tiers: RewardTier[];
  settings: {
    afterLastTier: string;
    flatAmount: number;
    bubbleAutoPoints: number;
    bubbleGmmPoints: number;
    bubbleClaimThreshold: number;
  };
  referrals: Referral[];
  bubbleClaims: BubbleClaim[];
  stats: { totalReferrals: number; convertedCount: number; totalEarned: number; pendingEarnings: number };
};

type TourStep = {
  intro?: boolean;
  outro?: boolean;
  view?: "inicio" | "historial";
  target?: string;
  noScroll?: boolean;
  tap?: boolean;
  title: string;
  desc: string;
};

const TOUR_STEPS: TourStep[] = [
  { intro: true,  title: "Te damos la bienvenida",   desc: "Este es tu espacio para ganar premios invitando. Te muestro cómo funciona en 20 segundos." },
  { view: "inicio",    target: '[data-tour="tabs"]',      noScroll: true, title: "Tus dos vistas",        desc: "Cambia entre Inicio (tus premios) y Mis Referidos (a quién invitaste)." },
  { view: "inicio",    target: '[data-tour="bono"]',                      title: "Bono de inicio",         desc: "Si invitas a 3 personas esta semana y una contrata Vida o PPR, tu primer premio sube a $2,500." },
  { view: "inicio",    target: '[data-tour="saldos"]',                    title: "Tu dinero",              desc: "Lo que ya cobraste y lo que está aprobado, listo por cobrar." },
  { view: "inicio",    target: '[data-tour="burbuja"]',                   title: "Tu burbuja",             desc: "Cada venta de Auto, GMM u otros la llena. Reviéntala y cobra en cúmulos de $500." },
  { view: "inicio",    target: '[data-tour="enlace"]',                    title: "Tu enlace personal",     desc: "Compártelo por WhatsApp. Quien entre y contrate, te genera premios." },
  { view: "inicio",    target: '[data-tour="go-ref"]',   noScroll: true, tap: true, title: "Sigue a tus invitados", desc: "Abre \"Mis Referidos\" para ver a cada persona que invitaste. (Pulsa Siguiente.)" },
  { view: "historial", target: '[data-tour="ref-empty"]',                 title: "Mis Referidos",          desc: "Aquí verás quién entró, quién está en proceso y quién ya contrató." },
  { outro: true,  title: "¡Listo!",                    desc: "Comparte tu enlace y empieza a ganar. Tus premios te esperan." },
];

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"inicio" | "historial">("inicio");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [claimingBubble, setClaimingBubble] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Tour state
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourFade, setTourFade] = useState(0);
  const [tourRect, setTourRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [tourTip, setTourTip]   = useState<{ top: number; left: number } | null>(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const t1 = useRef<ReturnType<typeof setTimeout>>(undefined);
  const t2 = useRef<ReturnType<typeof setTimeout>>(undefined);

  const confetti = useMemo(() => {
    const C = ["#2B57F0","#0d0d0d","#1FAE54","#F5B53F","#5B86F7","#E7395A"];
    return Array.from({ length: 70 }, (_, k) => ({
      position: "absolute" as const,
      top: 0,
      left: `${Math.random() * 100}%`,
      width:  `${5  + Math.random() * 6}px`,
      height: `${8  + Math.random() * 8}px`,
      background:   C[k % C.length],
      borderRadius: Math.random() > 0.6 ? "50%" : "2px",
      animation: `confettiFall ${(2.4 + Math.random() * 2).toFixed(2)}s linear ${(Math.random() * 2).toFixed(2)}s infinite`,
    }));
  }, []);

  const bonoConfetti = useMemo(() => {
    const C = ["#5B86F7","#2B57F0","#1FAE54","#F5B53F","#E7395A","#fff"];
    return Array.from({ length: 30 }, (_, k) => ({
      key: k,
      left: `${Math.random() * 100}%`,
      width:  Math.random() * 6 + 3,
      height: Math.random() * 9 + 4,
      background:   C[k % C.length],
      borderRadius: Math.random() > 0.55 ? "50%" : "2px",
      animation: `confettiFall ${(1.6 + Math.random() * 1.4).toFixed(2)}s linear ${(Math.random() * 1.5).toFixed(2)}s infinite`,
    }));
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

  function fetchData(isInitial = false) {
    fetch(`/api/portal/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setData(d);
          if (isInitial) {
            const key = `referidos_seen_${token}`;
            if (!localStorage.getItem(key)) setShowOnboarding(true);
          }
        }
        if (isInitial) setLoading(false);
      });
  }

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function confirmReceipt(referralId: string) {
    setConfirming(referralId);
    const res = await fetch(`/api/portal/${token}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId }),
    });
    if (res.ok) setConfirmed((prev) => new Set([...prev, referralId]));
    setConfirming(null);
  }

  async function claimBubble() {
    setClaimingBubble(true);
    const res = await fetch(`/api/portal/${token}/claim-bubble`, { method: "POST" });
    if (res.ok) setTimeout(() => fetchData(false), 600);
    setClaimingBubble(false);
  }

  function finishOnboarding() {
    localStorage.setItem(`referidos_seen_${token}`, "1");
    setShowOnboarding(false);
  }

  // ── Tour functions ──
  function scrollToTarget(el: Element) {
    const sc = document.getElementById("scroll");
    if (!sc) return;
    const sr = sc.getBoundingClientRect(), er = el.getBoundingClientRect();
    const dest = sc.scrollTop + (er.top - sr.top) - (sc.clientHeight - el.clientHeight) / 2;
    sc.scrollTo({ top: Math.max(0, dest), behavior: "smooth" });
  }

  function measureTour(s: TourStep) {
    const screen = document.getElementById("screen");
    if (!screen) return;
    const scr = screen.getBoundingClientRect();
    if (s.intro || s.outro) { setTourRect(null); setTourTip(null); return; }
    const el = s.target ? document.querySelector(s.target) : null;
    if (!el) { setTourRect(null); setTourTip(null); return; }
    const er = el.getBoundingClientRect(), pad = 6;
    const rect = { top: er.top - scr.top - pad, left: er.left - scr.left - pad, width: er.width + pad * 2, height: er.height + pad * 2 };
    const W = scr.width, H = scr.height, tw = 280, th = 175;
    let tipTop: number;
    if (rect.top + rect.height + 12 + th <= H - 12)  tipTop = rect.top + rect.height + 12;
    else if (rect.top - 12 - th >= 12)                tipTop = rect.top - 12 - th;
    else                                               tipTop = Math.min(Math.max(12, rect.top), H - th - 12);
    const tipLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - tw / 2), W - tw - 12);
    setTourRect(rect);
    setTourTip({ top: tipTop, left: tipLeft });
  }

  function goStep(i: number) {
    const s = TOUR_STEPS[i];
    if (s.view) setTab(s.view);
    setTourStep(i);
    clearTimeout(t1.current); clearTimeout(t2.current);
    t1.current = setTimeout(() => {
      let scrolled = false;
      try {
        setScrollLocked(false);
        if (!s.intro && !s.outro && !s.noScroll && s.target) {
          const el = document.querySelector(s.target);
          if (el) { scrollToTarget(el); scrolled = true; }
        }
      } catch (_) {}
      t2.current = setTimeout(() => {
        try { measureTour(s); setScrollLocked(true); } catch (_) {}
      }, scrolled ? 470 : 100);
    }, 140);
  }

  function startTour() {
    setTourRect(null); setTourTip(null); setTourFade(0);
    setTourActive(true); setTab("inicio");
    setTimeout(() => setTourFade(1), 30);
    goStep(0);
  }

  function tourNext() {
    if (tourStep >= TOUR_STEPS.length - 1) endTour();
    else goStep(tourStep + 1);
  }

  function tourPrev() {
    if (tourStep > 0) goStep(tourStep - 1);
  }

  function endTour() {
    setTourFade(0);
    setTimeout(() => { setScrollLocked(false); setTourActive(false); }, 260);
  }

  // ── Screens ──
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${hankenGrotesk.className}`} style={{ background: "#f4f3f0" }}>
        <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid #0d0d0d", borderTopColor: "transparent" }} className="animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen flex items-center justify-center text-center px-6 ${hankenGrotesk.className}`} style={{ background: "#f4f3f0" }}>
        <div>
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold mb-2" style={{ color: "#0d0d0d" }}>Acceso no encontrado</h1>
          <p className="text-sm" style={{ color: "#71717a" }}>Este enlace no es válido o ya no está activo.</p>
        </div>
      </div>
    );
  }

  const { client, advisor, tiers, settings, referrals, stats, bubbleClaims } = data;
  const pendingBubbleClaim = bubbleClaims.find((c) => c.status === "pending");
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const launchWindowEnd = new Date(new Date(client.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const inLaunchWindow = now <= launchWindowEnd;
  const launchBonusActive = inLaunchWindow && !client.launchBonusUsed;
  const referralsInWindow = referrals.filter(r => new Date(r.createdAt) <= launchWindowEnd).length;
  const firstTierAmount = tiers[0]?.amount ?? 1500;
  const bonusAmount = firstTierAmount + 1000;
  const bonusReady = launchBonusActive && referralsInWindow >= 3;
  const tier1Claimed = referrals.some((r) => r.tierPosition === 1 && r.status === "converted");

  const msLeft = Math.max(0, launchWindowEnd.getTime() - now.getTime());
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  const countdownLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h ${minutesLeft}m` : hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`;
  const countdownUrgent = msLeft < 1000 * 60 * 60 * 24;

  const bubbleThreshold = settings.bubbleClaimThreshold;
  const fullBubbles = Math.floor(client.bubblePoints / bubbleThreshold);
  const bubbleRemainder = client.bubblePoints % bubbleThreshold;
  const bubbleRemainderFraction = bubbleRemainder / bubbleThreshold;
  const hasClaimableBubbles = fullBubbles >= 1;
  const bubbleFillPercent = hasClaimableBubbles ? 100 : Math.max(6, bubbleRemainderFraction * 100);

  const paidCount = referrals.filter(r => r.rewardStatus === "paid" && r.tierPosition > 0).length;
  const referralLink = `${baseUrl}/r/${client.referralCode}`;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const firstName = client.name.split(" ")[0];
    const msg = advisor.whatsappMessage
      ? advisor.whatsappMessage.replace("{link}", referralLink).replace("{nombre}", firstName)
      : `Hola 👋 Quiero compartirte algo que a mí me ha servido mucho.\n\nTengo un plan con ${advisor.name} que me está ayudando a cuidar mi patrimonio. Creo que a ti también te podría interesar.\n\nSin compromiso, solo entra y revisa: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  // ── Onboarding modal (first-visit) ──
  if (showOnboarding) {
    const firstName = client.name.split(" ")[0];
    const steps = [
      {
        icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5"/><path d="M12 8V12L15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>),
        title: `${firstName}, bienvenido a Referidoo`,
        body:  `${advisor.name} te invita a recomendar personas para que también cuiden su patrimonio. Cada vez que alguien contrate un plan gracias a ti, recibes dinero en efectivo.`,
      },
      {
        icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
        title: "Así se acumula",
        body:  tiers.length > 0 ? "Por cada persona que contrate gracias a tu recomendación, ganas en efectivo." : `Cada referido que contrate un plan te da ${formatCurrency(1500)} en efectivo, directo.`,
      },
      {
        icon: (<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M22 16.92V19.92C22.0011 20.4813 21.7659 21.0171 21.3527 21.4046C20.9395 21.7921 20.3873 21.9971 19.82 21.97C16.7428 21.6429 13.787 20.5973 11.19 18.92C8.77382 17.3883 6.72534 15.3398 5.19 12.92C3.49997 10.3099 2.45418 7.33897 2.13 4.24999C2.10313 3.68453 2.30731 3.13436 2.69261 2.72161C3.07791 2.30886 3.61263 2.07326 4.17 2.04999H7.17C8.18 2.04999 9.04 2.77999 9.17 3.77999L9.67 7.27999C9.71 7.54999 9.64 7.82999 9.47 8.04999L7.72 9.81999C9.17379 12.3484 11.2516 14.4263 13.78 15.88L15.55 14.13C15.77 13.95 16.06 13.88 16.33 13.92L19.83 14.42C20.8199 14.5527 21.5499 15.4127 21.55 16.42L22 16.92Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
        title: "Sin papeleo, sin presión",
        body:  "Comparte tu link con quien quieras. Si a tu contacto le interesa, el asesor lo atiende. Si contrata, tú cobras. Nada más.",
      },
    ];
    const step = steps[onboardingStep];
    const isLast = onboardingStep === steps.length - 1;
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${hankenGrotesk.className}`} style={{ background: "rgba(13,13,15,.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", padding: "20px" }}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <div className="flex justify-center mb-7"><Logo size="md" /></div>
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === onboardingStep ? "w-8 bg-[#0B0B0C]" : i < onboardingStep ? "w-4 bg-[#DADCE0]" : "w-4 bg-[#ECEDEF]"}`} />))}
          </div>
          <div className="w-14 h-14 bg-[#0B0B0C] rounded-2xl flex items-center justify-center mb-6 shadow-[0_6px_16px_rgba(11,11,12,0.14)]">{step.icon}</div>
          <h1 className="text-xl font-bold mb-2.5 leading-snug tracking-[-0.02em] text-[#0B0B0C]">{step.title}</h1>
          <p className="text-sm text-[#6B727D] leading-relaxed mb-6">{step.body}</p>
          {onboardingStep === 1 && tiers.length > 0 && (
            <div className="mb-6 space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-[#F4F5F7] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#0B0B0C] text-white rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</div>
                    <span className="text-sm text-[#3F4651]">{t.label || `Referido #${i + 1}`}</span>
                  </div>
                  <span className="font-bold text-sm text-[#0B0B0C]">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => { if (isLast) finishOnboarding(); else setOnboardingStep(onboardingStep + 1); }} className="w-full bg-[#2563EB] text-white text-sm font-semibold py-3.5 rounded-full hover:bg-blue-700 active:scale-[.98] transition mb-3">
            {isLast ? "Ir a mi dashboard →" : "Siguiente"}
          </button>
          {!isLast && (<button onClick={finishOnboarding} className="w-full text-sm text-[#9098A2] hover:text-[#6B727D] transition py-1">Saltar</button>)}
        </div>
      </div>
    );
  }

  // ── Derived for tour ──
  const curStep = TOUR_STEPS[tourStep];
  const isIntro = !!curStep?.intro;
  const isOutro = !!curStep?.outro;
  const isCard  = isIntro || isOutro;
  const normalSteps = TOUR_STEPS.length - 2; // 7

  // ── Main dashboard ──
  return (
    <>
      <style>{`
        @keyframes wave-bubble {
          0%   { border-radius: 42% 38% 0 0; transform: translateX(-3%); }
          50%  { border-radius: 38% 42% 0 0; transform: translateX(3%); }
          100% { border-radius: 42% 38% 0 0; transform: translateX(-3%); }
        }
        .wave-a { animation: wave-bubble 2.4s ease-in-out infinite; }
        .wave-b { animation: wave-bubble 3.1s ease-in-out infinite reverse; }
        @keyframes cdtick {
          from { opacity: 0; transform: scale(.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .cd-tick { animation: cdtick .22s ease-out; }

        @keyframes tourPulse {
          0%   { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 0   rgba(43,87,240,.55); }
          70%  { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 14px rgba(43,87,240,0); }
          100% { box-shadow: 0 0 0 9999px rgba(13,13,15,.6), 0 0 0 0   rgba(43,87,240,0); }
        }
        @keyframes tapRing {
          0%   { transform: scale(.55); opacity: .9; }
          100% { transform: scale(2);   opacity: 0; }
        }
        @keyframes confettiFall {
          0%   { transform: translateY(-14%) rotate(0deg); }
          100% { transform: translateY(900px) rotate(720deg); }
        }
        @keyframes popIn {
          0%   { transform: scale(.5); opacity: 0; }
          60%  { transform: scale(1.1); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes bonoPulse {
          0%   { box-shadow: 0 0 0 1.5px rgba(91,134,247,.2); }
          50%  { box-shadow: 0 0 0 3.5px rgba(91,134,247,.6), 0 0 28px rgba(91,134,247,.15); }
          100% { box-shadow: 0 0 0 1.5px rgba(91,134,247,.2); }
        }
        @keyframes shareNudge {
          0%, 100% { transform: scale(1);    box-shadow: 0 4px 14px rgba(43,87,240,.32); }
          40%       { transform: scale(1.04); box-shadow: 0 6px 22px rgba(43,87,240,.5); }
          70%       { transform: scale(.98); }
        }
      `}</style>

      {/* ── #screen: full-height frame, overlay-safe ── */}
      <div
        id="screen"
        className={hankenGrotesk.className}
        style={{ position: "relative", overflow: "hidden", height: "100dvh", background: "#f4f3f0" }}
      >

        {/* ── Tour overlay ── */}
        {tourActive && (
          <div style={{ position: "absolute", inset: 0, zIndex: 60 }}>

            {/* Backdrop */}
            <div style={{
              position: "absolute", inset: 0,
              background: tourRect ? "transparent" : "rgba(13,13,15,.65)",
              backdropFilter: tourRect ? "none" : "blur(4px)",
              WebkitBackdropFilter: tourRect ? "none" : "blur(4px)",
              opacity: tourFade, transition: "opacity .35s",
              pointerEvents: "none",
            }} />

            {/* Spotlight — always mounted so CSS transition slides it between targets */}
            <div style={{
              position: "absolute",
              top: tourRect ? tourRect.top : 0,
              left: tourRect ? tourRect.left : 0,
              width: tourRect ? tourRect.width : 0,
              height: tourRect ? tourRect.height : 0,
              borderRadius: 14,
              border: "2.5px solid #2B57F0",
              boxShadow: "0 0 0 9999px rgba(13,13,15,.6)",
              animation: tourRect ? "tourPulse 2.2s ease-out infinite" : "none",
              zIndex: 61,
              pointerEvents: "none",
              opacity: tourRect ? 1 : 0,
              transition: "top .4s cubic-bezier(.4,0,.2,1), left .4s cubic-bezier(.4,0,.2,1), width .4s cubic-bezier(.4,0,.2,1), height .4s cubic-bezier(.4,0,.2,1), opacity .25s",
            }} />

            {/* Tap indicator */}
            {tourRect && curStep?.tap && (
              <div style={{
                position: "absolute",
                width: 38, height: 38, borderRadius: "50%",
                border: "2.5px solid #2B57F0",
                background: "rgba(43,87,240,.15)",
                top:  tourRect.top  + tourRect.height / 2 - 19,
                left: tourRect.left + tourRect.width  / 2 - 19,
                zIndex: 62, pointerEvents: "none",
                animation: "tapRing 1.15s ease-out infinite",
              }} />
            )}

            {/* Confetti (outro) */}
            {isOutro && (
              <div style={{ position: "absolute", inset: 0, zIndex: 62, pointerEvents: "none", overflow: "hidden" }}>
                {confetti.map((p, k) => <div key={k} style={p} />)}
              </div>
            )}

            {/* Tooltip — normal steps */}
            {tourTip && !isCard && (
              <div style={{
                position: "absolute",
                top: tourTip.top, left: tourTip.left,
                width: 280, zIndex: 63,
                background: "#fff", borderRadius: 18, padding: "18px 18px 14px",
                boxShadow: "0 8px 32px rgba(0,0,0,.22)",
                opacity: tourFade, transition: "top .32s, left .32s, opacity .25s",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#a1a1aa", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 5 }}>
                  Paso {tourStep} de {normalSteps}
                </p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#0d0d0d", marginBottom: 5, lineHeight: 1.3 }}>{curStep.title}</p>
                <p style={{ fontSize: 12, color: "#52525b", lineHeight: 1.5, marginBottom: 14 }}>{curStep.desc}</p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={endTour} style={{ fontSize: 12, color: "#a1a1aa", background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
                    Saltar
                  </button>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {tourStep > 1 && (
                      <button onClick={tourPrev} style={{ fontSize: 13, fontWeight: 600, color: "#52525b", background: "none", border: "none", cursor: "pointer" }}>
                        Atrás
                      </button>
                    )}
                    <button
                      onClick={tourNext}
                      style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "#2B57F0", border: "none", borderRadius: 50, padding: "8px 16px", cursor: "pointer" }}
                    >
                      {tourStep >= TOUR_STEPS.length - 2 ? "Finalizar" : "Siguiente →"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Intro card */}
            {isIntro && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: `translate(-50%,-50%) scale(${tourFade ? 1 : 0.94})`,
                opacity: tourFade, transition: "opacity .35s, transform .45s cubic-bezier(.34,1.3,.5,1)",
                width: 296, zIndex: 63,
                background: "#fff", borderRadius: 24, padding: 26,
                boxShadow: "0 16px 48px rgba(0,0,0,.28)",
                textAlign: "center",
              }}>
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 1, marginBottom: 20 }}>
                  <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-.02em", color: "#0d0d0d" }}>referidoo</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2B57F0", display: "inline-block", marginBottom: 3, flexShrink: 0 }} />
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, color: "#0d0d0d", marginBottom: 8, lineHeight: 1.3 }}>{curStep.title}</p>
                <p style={{ fontSize: 13, color: "#52525b", lineHeight: 1.55, marginBottom: 22 }}>{curStep.desc}</p>
                <button onClick={() => goStep(1)} style={{ width: "100%", background: "#2B57F0", color: "#fff", border: "none", borderRadius: 50, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 10 }}>
                  Comenzar
                </button>
                <button onClick={endTour} style={{ width: "100%", background: "none", border: "none", color: "#a1a1aa", fontSize: 13, cursor: "pointer", padding: "4px 0" }}>
                  Saltar
                </button>
              </div>
            )}

            {/* Outro card */}
            {isOutro && (
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: `translate(-50%,-50%) scale(${tourFade ? 1 : 0.94})`,
                opacity: tourFade, transition: "opacity .35s, transform .45s cubic-bezier(.34,1.3,.5,1)",
                width: 296, zIndex: 63,
                background: "#fff", borderRadius: 24, padding: 26,
                boxShadow: "0 16px 48px rgba(0,0,0,.28)",
                textAlign: "center",
              }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#2B57F0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", animation: "popIn .5s cubic-bezier(.34,1.3,.5,1) both" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, color: "#0d0d0d", marginBottom: 8, lineHeight: 1.3 }}>{curStep.title}</p>
                <p style={{ fontSize: 13, color: "#52525b", lineHeight: 1.55, marginBottom: 22 }}>{curStep.desc}</p>
                <button onClick={endTour} style={{ width: "100%", background: "#2B57F0", color: "#fff", border: "none", borderRadius: 50, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Empezar a compartir
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── #scroll: all content lives here ── */}
        <div id="scroll" style={{ height: "100%", overflowY: scrollLocked ? "hidden" : "auto" }}>
          <div className="max-w-md mx-auto">

            {/* App bar */}
            <header className="sticky top-0 z-10" style={{ background: "#f4f3f0", paddingTop: "env(safe-area-inset-top)" }}>
              <div className="px-5 h-14 flex items-center justify-between">
                <div className="flex items-end gap-0.5">
                  <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-.02em", color: "#0d0d0d", lineHeight: 1 }}>referidoo</span>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2B57F0", display: "inline-block", marginBottom: 2, flexShrink: 0 }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {/* Tour trigger */}
                  <button
                    onClick={startTour}
                    aria-label="Ver tour del dashboard"
                    style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,.07)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#52525b", fontSize: 15, fontWeight: 700, lineHeight: 1 }}
                  >
                    ?
                  </button>
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0d0d0d", color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </header>

            <div className="px-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>

              {/* Greeting */}
              <div style={{ marginBottom: 18, marginTop: 4 }}>
                <h1 style={{ fontSize: 21, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.02em", lineHeight: 1.2 }}>
                  Hola, {client.name.split(" ")[0]} 👋
                </h1>
                <p style={{ fontSize: 13, color: "#71717a", marginTop: 3 }}>Aquí va el progreso de tus referidos</p>
              </div>

              {/* Tabs */}
              <div
                data-tour="tabs"
                style={{ background: "#e4e3df", borderRadius: 14, padding: 4, display: "flex", gap: 4, marginBottom: 18 }}
              >
                {(["inicio", "historial"] as const).map((t) => (
                  <button
                    key={t}
                    data-tour={t === "historial" ? "go-ref" : undefined}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
                      borderRadius: 11, border: "none", cursor: "pointer", transition: "all .2s",
                      background: tab === t ? "#fff" : "transparent",
                      color: tab === t ? "#0d0d0d" : "#71717a",
                      boxShadow: tab === t ? "0 2px 6px -2px rgba(0,0,0,.16)" : "none",
                    }}
                  >
                    {t === "inicio" ? "Inicio" : "Mis Referidos"}
                  </button>
                ))}
              </div>

              {/* ── INICIO TAB ── */}
              {tab === "inicio" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* Bono de inicio — ventana activa (ocultar si ya se cerró tier 1) */}
                  {launchBonusActive && !tier1Claimed && (
                    <div data-tour="bono" style={{ background: "#0d0d0d", borderRadius: 26, padding: "24px 22px", color: "#fff", position: "relative", overflow: "hidden", animation: bonusReady ? "none" : "bonoPulse 2.8s ease-in-out infinite" }}>
                      {/* Ambient glow */}
                      <div style={{ position: "absolute", width: 160, height: 160, background: `radial-gradient(circle,rgba(91,134,247,${bonusReady ? ".55" : ".35"}) 0%,transparent 70%)`, top: -30, right: -10, pointerEvents: "none" }} />
                      {/* Confetti inside card when bonus ready */}
                      {bonusReady && bonoConfetti.map((p) => (
                        <div key={p.key} style={{ position: "absolute", top: -12, left: p.left, width: p.width, height: p.height, background: p.background, borderRadius: p.borderRadius, animation: p.animation, pointerEvents: "none", zIndex: 0 }} />
                      ))}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: bonusReady ? "rgba(91,134,247,.9)" : "rgba(255,255,255,.5)", letterSpacing: ".06em", textTransform: "uppercase" }}>{bonusReady ? "★ BONO DESBLOQUEADO" : "Bono de inicio"}</span>
                        {!bonusReady && (
                          <span key={countdownLabel} className="cd-tick" style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20, background: countdownUrgent ? "rgba(251,191,36,.15)" : "rgba(255,255,255,.1)", color: countdownUrgent ? "#fbbf24" : "rgba(255,255,255,.65)" }}>
                            {countdownLabel}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, position: "relative" }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>{formatCurrency(bonusAmount)}</span>
                        <span style={{ fontSize: 16, color: "rgba(255,255,255,.3)", textDecoration: "line-through" }}>{formatCurrency(firstTierAmount)}</span>
                      </div>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 16, position: "relative", lineHeight: 1.5 }}>
                        {bonusReady ? "¡Invitaste a 3 personas! Cuando una contrate, cobras el doble." : "Tu primer premio cuando alguien contrate Seguro de Vida o PPR gracias a ti."}
                      </p>
                      <div style={{ display: "flex", gap: 6, marginBottom: 7, position: "relative" }}>
                        {[1, 2, 3].map((i) => (
                          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= referralsInWindow ? (bonusReady ? "#1FAE54" : "#5B86F7") : "rgba(255,255,255,.12)", transition: "background .3s" }} />
                        ))}
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,.38)", position: "relative", marginBottom: 16 }}>
                        {referralsInWindow} de 3 contactos invitados
                      </p>
                      {/* Share CTA */}
                      <button
                        onClick={shareWhatsApp}
                        style={{
                          position: "relative", zIndex: 1, width: "100%", border: "none", borderRadius: 50, cursor: "pointer",
                          padding: bonusReady ? "14px 0" : "12px 0",
                          fontSize: bonusReady ? 14 : 13,
                          fontWeight: 700,
                          background: bonusReady ? "#2B57F0" : "rgba(91,134,247,.18)",
                          color: bonusReady ? "#fff" : "#5B86F7",
                          animation: bonusReady ? "shareNudge 2.2s ease-in-out infinite" : "none",
                          ...(bonusReady ? {} : { border: "1.5px solid rgba(91,134,247,.35)" }),
                        }}
                      >
                        {bonusReady ? "¡Comparte y cobra tu bono! →" : "Compartir para desbloquear →"}
                      </button>
                    </div>
                  )}

                  {/* Bono ya activado */}
                  {client.launchBonusUsed && (
                    <div data-tour="bono" style={{ background: "#0d0d0d", borderRadius: 26, padding: "24px 22px", color: "#fff", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", width: 160, height: 160, background: "radial-gradient(circle,rgba(91,134,247,.22) 0%,transparent 70%)", top: -30, right: -10, pointerEvents: "none" }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(91,134,247,.9)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 10, position: "relative" }}>⚡ Bono activado</p>
                      <p style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-.02em", position: "relative" }}>{formatCurrency(bonusAmount)}</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 6, position: "relative" }}>Tu primer premio fue duplicado por referir en tu primera semana.</p>
                    </div>
                  )}

                  {/* Premios pendientes de confirmar */}
                  {referrals.filter(r => r.rewardStatus === "paid" && r.tierPosition > 0 && !r.confirmedByReferrer && !confirmed.has(r.id)).map(r => (
                    <div key={r.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "18px 19px" }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: "#52525b", marginBottom: 3 }}>Premio enviado — ¿Lo recibiste?</p>
                      <p style={{ fontSize: 26, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.01em", marginBottom: 2 }}>{formatCurrency(r.rewardAmount)}</p>
                      <p style={{ fontSize: 12, color: "#71717a", marginBottom: 14 }}>Por referir a {r.leadName}</p>
                      <button onClick={() => confirmReceipt(r.id)} disabled={confirming === r.id} style={{ width: "100%", background: "#0d0d0d", color: "#fff", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: confirming === r.id ? .5 : 1 }}>
                        {confirming === r.id ? "Confirmando..." : "Sí, lo recibí ✓"}
                      </button>
                    </div>
                  ))}

                  {/* Premios confirmados */}
                  {referrals.filter(r => r.tierPosition > 0 && (r.confirmedByReferrer || confirmed.has(r.id))).map(r => (
                    <div key={`conf-${r.id}`} style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, background: "#f0fdf4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0d0d0d" }}>Premio confirmado</p>
                        <p style={{ fontSize: 12, color: "#71717a" }}>{formatCurrency(r.rewardAmount)} · {r.leadName}</p>
                      </div>
                    </div>
                  ))}

                  {/* Ganado / Por cobrar */}
                  <div data-tour="saldos" style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "18px 19px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                        <span style={{ fontSize: 12, color: "#52525b", fontWeight: 500 }}>Ganado</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.01em" }}>{formatCurrency(stats.totalEarned)}</p>
                      <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>pagado</p>
                    </div>
                    <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "18px 19px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 6V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#2B57F0" strokeWidth="1.8" strokeLinecap="round"/></svg>
                        </div>
                        <span style={{ fontSize: 12, color: "#52525b", fontWeight: 500 }}>Por cobrar</span>
                      </div>
                      <p style={{ fontSize: 22, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.01em" }}>{formatCurrency(stats.pendingEarnings)}</p>
                      <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>aprobado</p>
                    </div>
                  </div>

                  {/* Escalera de premios */}
                  {tiers.length > 0 && (
                    <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "18px 19px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0d0d0d" }}>Escalera de premios</h2>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#52525b", background: "#f0f0ef", borderRadius: 20, padding: "4px 10px" }}>
                          {paidCount >= tiers.length ? "Completada" : `Nivel ${Math.min(paidCount + 1, tiers.length)}`}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "#a1a1aa", marginBottom: 18 }}>Vida y PPR · sube con cada contratación</p>

                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", justifyContent: "center", marginBottom: 14 }}>
                        {tiers.map((tier) => {
                          const done    = paidCount >= tier.position;
                          const current = paidCount < tiers.length && paidCount + 1 === tier.position;
                          const locked  = !done && !current;
                          const matchingReferral = referrals.find((r) => r.status === "converted" && r.tierPosition === tier.position);
                          const displayAmount = matchingReferral ? matchingReferral.rewardAmount : tier.amount;
                          return (
                            <div key={tier.position} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                              {done ? (
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="#fff" strokeWidth="2.8" strokeLinecap="round"/></svg>
                                </div>
                              ) : current ? (
                                <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#2B57F0", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(43,87,240,.35)" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{tier.position}</span>
                                </div>
                              ) : (
                                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#f0f0ef", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#a1a1aa" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round"/></svg>
                                </div>
                              )}
                              <span style={{ fontSize: 11, fontWeight: current ? 700 : 500, color: done ? "#71717a" : current ? "#0d0d0d" : "#a1a1aa", whiteSpace: "nowrap" }}>
                                {formatCurrency(displayAmount)}
                              </span>
                              <div style={{
                                width: "100%", height: 72, borderRadius: 10,
                                background: done ? "#0d0d0d" : current ? "linear-gradient(180deg,#5B86F7 0%,#2B57F0 100%)" : "transparent",
                                border: locked ? "1.5px dashed #d4d0c8" : "none",
                              }} />
                              <span style={{ fontSize: 11, fontWeight: 600, color: current ? "#2B57F0" : "#a1a1aa" }}>
                                {tierOrdinal(tier.position)}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {paidCount < tiers.length && tiers[paidCount] && (
                        <div style={{ background: "#f4f3f0", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#52525b" }}>
                            Tu siguiente premio es de{" "}
                            <strong style={{ color: "#0d0d0d" }}>{formatCurrency(tiers[paidCount].amount)}</strong>
                          </p>
                        </div>
                      )}
                      {paidCount >= tiers.length && (
                        <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "10px 14px", textAlign: "center" }}>
                          <p style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
                            {settings.afterLastTier === "cycle" ? `Los premios se repiten — siguiente: ${formatCurrency(tiers[0]?.amount)}` : "¡Completaste todos los niveles!"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tu burbuja */}
                  <div data-tour="burbuja" style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "20px 19px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0d0d0d" }}>Tu burbuja</h2>
                      <span style={{ fontSize: 11, color: "#a1a1aa" }}>Auto, Otro + GMM</span>
                    </div>
                    {pendingBubbleClaim ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, background: "#fef3c7", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 8V12L15 15M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#0d0d0d" }}>Reclamo en proceso</p>
                          <p style={{ fontSize: 12, color: "#71717a" }}>{formatCurrency(pendingBubbleClaim.amount)} · tu asesor lo enviará pronto</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                          <div style={{ position: "relative", width: 158, height: 158 }}>
                            <div style={{ width: 158, height: 158, borderRadius: "50%", background: "#eef1f9", overflow: "hidden", position: "relative" }}>
                              <div className="wave-a" style={{ position: "absolute", bottom: 0, left: "-8%", width: "116%", height: `${bubbleFillPercent}%`, background: "linear-gradient(180deg,#5B86F7 0%,#2B57F0 100%)", borderRadius: "42% 38% 0 0", transition: "height 1s ease-out" }} />
                              <div className="wave-b" style={{ position: "absolute", bottom: 0, left: "-8%", width: "116%", height: `${bubbleFillPercent}%`, background: "linear-gradient(180deg,rgba(91,134,247,.5) 0%,rgba(43,87,240,.3) 100%)", borderRadius: "38% 42% 0 0", transition: "height 1s ease-out" }} />
                            </div>
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                              <p style={{ fontSize: 19, fontWeight: 800, color: bubbleFillPercent > 50 ? "#fff" : "#0d0d0d", letterSpacing: "-.02em", lineHeight: 1 }}>
                                {formatCurrency(client.bubblePoints)}
                              </p>
                              <p style={{ fontSize: 10, color: bubbleFillPercent > 50 ? "rgba(255,255,255,.7)" : "#71717a", marginTop: 3 }}>acumulado</p>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: hasClaimableBubbles ? 0 : 8 }}>
                          {[1, 2, 3].map((m) => {
                            const tierAmount = bubbleThreshold * m;
                            const isActive = fullBubbles >= m;
                            return (
                              <button key={m} disabled={!isActive || claimingBubble} onClick={isActive ? claimBubble : undefined} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, cursor: isActive ? "pointer" : "not-allowed", background: isActive ? "#2B57F0" : "#f0f0ef", color: isActive ? "#fff" : "#a1a1aa", transition: "all .2s", opacity: claimingBubble && isActive ? .5 : 1 }}>
                                {claimingBubble && isActive ? "..." : formatCurrency(tierAmount)}
                              </button>
                            );
                          })}
                        </div>
                        {!hasClaimableBubbles && (
                          <p style={{ fontSize: 11, color: "#a1a1aa", textAlign: "center" }}>
                            Te faltan {formatCurrency(bubbleThreshold - bubbleRemainder)} para tu primera burbuja de {formatCurrency(bubbleThreshold)}.
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Tu enlace personal */}
                  <div data-tour="enlace" style={{ background: "#0d0d0d", borderRadius: 24, padding: 22, color: "#fff" }}>
                    <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Tu enlace personal</h2>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginBottom: 14 }}>Quien entre y contrate, te genera un premio.</p>
                    <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "11px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{referralLink}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button onClick={copyLink} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,.12)", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                        {copied
                          ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Copiado</>
                          : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="1.5"/></svg>Copiar</>
                        }
                      </button>
                      <button onClick={shareWhatsApp} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#1FAE54", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                        WhatsApp
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "16px 0", textAlign: "center" }}>
                      <p style={{ fontSize: 28, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.02em" }}>{stats.totalReferrals}</p>
                      <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 4 }}>Referidos enviados</p>
                    </div>
                    <div style={{ flex: 1, background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "16px 0", textAlign: "center" }}>
                      <p style={{ fontSize: 28, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.02em" }}>{stats.convertedCount}</p>
                      <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 4 }}>Convertidos</p>
                    </div>
                  </div>

                </div>
              )}

              {/* ── MIS REFERIDOS TAB ── */}
              {tab === "historial" && (
                <div data-tour="ref-empty">
                  {referrals.length === 0 ? (
                    <div style={{ background: "#0d0d0d", borderRadius: 24, padding: 28, color: "#fff", textAlign: "center" }}>
                      <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
                          <circle cx="9" cy="7" r="4" stroke="rgba(255,255,255,.4)" strokeWidth="1.5"/>
                          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Aún no has referido a nadie</p>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.6, marginBottom: 22 }}>
                        {launchBonusActive
                          ? `Invita a 3 personas esta semana para desbloquear el bono de ${formatCurrency(bonusAmount)}.`
                          : `Tu primer referido vale ${formatCurrency(tiers[0]?.amount ?? 1500)}.`}
                      </p>
                      <button onClick={() => setTab("inicio")} style={{ width: "100%", background: "#fff", color: "#0d0d0d", border: "none", borderRadius: 50, padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        Compartir mi enlace →
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {referrals.map((r) => {
                        const badgeMap: Record<string, { bg: string; text: string }> = {
                          pending:   { bg: "#fef3c7", text: "#92400e" },
                          contacted: { bg: "#dbeafe", text: "#1e40af" },
                          converted: { bg: "#dcfce7", text: "#166534" },
                          rejected:  { bg: "#f4f4f5", text: "#71717a" },
                        };
                        const badge = badgeMap[r.status] ?? badgeMap.pending;
                        return (
                          <div key={r.id} style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 700, color: "#0d0d0d", marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.leadName}</p>
                              <p style={{ fontSize: 12, color: "#71717a", marginBottom: 9 }}>{r.leadPhone} · {formatDate(r.createdAt)}</p>
                              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: badge.bg, color: badge.text }}>{getStatusLabel(r.status)}</span>
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              {r.status === "converted" && r.tierPosition === 0 ? (
                                r.productType === "Daños/Auto" || r.productType === "GMM" || r.productType === "Otro" ? (
                                  <><p style={{ fontSize: 13, fontWeight: 700, color: "#2B57F0" }}>+{formatCurrency(r.productType === "GMM" ? settings.bubbleGmmPoints : settings.bubbleAutoPoints)}</p><p style={{ fontSize: 11, color: "#2B57F0", marginTop: 3 }}>Burbuja</p></>
                                ) : (
                                  <><p style={{ fontSize: 13, fontWeight: 700, color: "#a1a1aa" }}>—</p><p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>Sin premio</p></>
                                )
                              ) : (
                                <><p style={{ fontSize: 13, fontWeight: 700, color: r.rewardStatus === "paid" ? "#16a34a" : r.rewardStatus === "approved" ? "#d97706" : "#a1a1aa" }}>{r.rewardAmount > 0 ? formatCurrency(r.rewardAmount) : "—"}</p><p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>{getRewardStatusLabel(r.rewardStatus)}</p></>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
