"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";
import { formatCurrency, formatDate, getStatusLabel, getRewardStatusLabel } from "@/lib/utils";
import { Logo } from "@/components/Logo";

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

  // Launch bonus calculations
  const launchWindowEnd = new Date(new Date(client.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const inLaunchWindow = now <= launchWindowEnd;
  const launchBonusActive = inLaunchWindow && !client.launchBonusUsed;
  const referralsInWindow = referrals.filter(r => new Date(r.createdAt) <= launchWindowEnd).length;
  const firstTierAmount = tiers[0]?.amount ?? 1500;
  const bonusAmount = firstTierAmount + 1000;
  const bonusReady = launchBonusActive && referralsInWindow >= 3;

  const msLeft = Math.max(0, launchWindowEnd.getTime() - now.getTime());
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  const countdownLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`;
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

  // ── Onboarding modal ──
  if (showOnboarding) {
    const firstName = client.name.split(" ")[0];
    const steps = [
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5"/>
            <path d="M12 8V12L15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
        title: `${firstName}, bienvenido a Referidoo`,
        body: `${advisor.name} te invita a recomendar personas para que también cuiden su patrimonio. Cada vez que alguien contrate un plan gracias a ti, recibes dinero en efectivo.`,
      },
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        title: "Así se acumula",
        body: tiers.length > 0
          ? "Por cada persona que contrate gracias a tu recomendación, ganas en efectivo."
          : `Cada referido que contrate un plan te da ${formatCurrency(1500)} en efectivo, directo.`,
      },
      {
        icon: (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M22 16.92V19.92C22.0011 20.4813 21.7659 21.0171 21.3527 21.4046C20.9395 21.7921 20.3873 21.9971 19.82 21.97C16.7428 21.6429 13.787 20.5973 11.19 18.92C8.77382 17.3883 6.72534 15.3398 5.19 12.92C3.49997 10.3099 2.45418 7.33897 2.13 4.24999C2.10313 3.68453 2.30731 3.13436 2.69261 2.72161C3.07791 2.30886 3.61263 2.07326 4.17 2.04999H7.17C8.18 2.04999 9.04 2.77999 9.17 3.77999L9.67 7.27999C9.71 7.54999 9.64 7.82999 9.47 8.04999L7.72 9.81999C9.17379 12.3484 11.2516 14.4263 13.78 15.88L15.55 14.13C15.77 13.95 16.06 13.88 16.33 13.92L19.83 14.42C20.8199 14.5527 21.5499 15.4127 21.55 16.42L22 16.92Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        title: "Sin papeleo, sin presión",
        body: "Comparte tu link con quien quieras. Si a tu contacto le interesa, el asesor lo atiende. Si contrata, tú cobras. Nada más.",
      },
    ];

    const step = steps[onboardingStep];
    const isLast = onboardingStep === steps.length - 1;

    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${hankenGrotesk.className}`}
        style={{ background: "rgba(13,13,15,.72)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", padding: "20px" }}
      >
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          <div className="flex justify-center mb-7"><Logo size="md" /></div>
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === onboardingStep ? "w-8 bg-[#0B0B0C]" : i < onboardingStep ? "w-4 bg-[#DADCE0]" : "w-4 bg-[#ECEDEF]"}`} />
            ))}
          </div>
          <div className="w-14 h-14 bg-[#0B0B0C] rounded-2xl flex items-center justify-center mb-6 shadow-[0_6px_16px_rgba(11,11,12,0.14)]">
            {step.icon}
          </div>
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
          <button
            onClick={() => { if (isLast) finishOnboarding(); else setOnboardingStep(onboardingStep + 1); }}
            className="w-full bg-[#2563EB] text-white text-sm font-semibold py-3.5 rounded-full hover:bg-blue-700 active:scale-[.98] transition mb-3"
          >
            {isLast ? "Ir a mi dashboard →" : "Siguiente"}
          </button>
          {!isLast && (
            <button onClick={finishOnboarding} className="w-full text-sm text-[#9098A2] hover:text-[#6B727D] transition py-1">
              Saltar
            </button>
          )}
        </div>
      </div>
    );
  }

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
      `}</style>

      <div className={`min-h-screen flex flex-col ${hankenGrotesk.className}`} style={{ background: "#f4f3f0" }}>

        {/* App bar */}
        <header className="sticky top-0 z-10" style={{ paddingTop: "env(safe-area-inset-top)", background: "#f4f3f0" }}>
          <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
            <div className="flex items-end gap-0.5">
              <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: "-.02em", color: "#0d0d0d", lineHeight: 1 }}>referidoo</span>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2B57F0", display: "inline-block", marginBottom: 2, flexShrink: 0 }} />
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0d0d0d", color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {client.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="max-w-md mx-auto w-full px-5 flex-1" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}>

          {/* Greeting */}
          <div style={{ marginBottom: 18, marginTop: 4 }}>
            <h1 style={{ fontSize: 21, fontWeight: 800, color: "#0d0d0d", letterSpacing: "-.02em", lineHeight: 1.2 }}>
              Hola, {client.name.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: 13, color: "#71717a", marginTop: 3 }}>Aquí va el progreso de tus referidos</p>
          </div>

          {/* Tabs */}
          <div style={{ background: "#e4e3df", borderRadius: 14, padding: 4, display: "flex", gap: 4, marginBottom: 18 }}>
            {(["inicio", "historial"] as const).map((t) => (
              <button
                key={t}
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

              {/* Bono de inicio — ventana activa */}
              {launchBonusActive && (
                <div style={{ background: "#0d0d0d", borderRadius: 26, padding: "24px 22px", color: "#fff", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", width: 160, height: 160, background: "radial-gradient(circle,rgba(91,134,247,.35) 0%,transparent 70%)", top: -30, right: -10, pointerEvents: "none" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.5)", letterSpacing: ".06em", textTransform: "uppercase" }}>Bono de inicio</span>
                    <span key={countdownLabel} className="cd-tick" style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 20, background: countdownUrgent ? "rgba(251,191,36,.15)" : "rgba(255,255,255,.1)", color: countdownUrgent ? "#fbbf24" : "rgba(255,255,255,.65)" }}>
                      {countdownLabel}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, position: "relative" }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: "#fff", letterSpacing: "-.02em" }}>{formatCurrency(bonusAmount)}</span>
                    <span style={{ fontSize: 16, color: "rgba(255,255,255,.3)", textDecoration: "line-through" }}>{formatCurrency(firstTierAmount)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 16, position: "relative", lineHeight: 1.5 }}>
                    Tu primer premio cuando alguien contrate Seguro de Vida o PPR gracias a ti.
                  </p>
                  <div style={{ display: "flex", gap: 6, marginBottom: 7, position: "relative" }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= referralsInWindow ? "#5B86F7" : "rgba(255,255,255,.12)", transition: "background .3s" }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,.38)", position: "relative" }}>
                    {referralsInWindow} de 3 contactos invitados
                  </p>
                </div>
              )}

              {/* Bono ya activado */}
              {client.launchBonusUsed && (
                <div style={{ background: "#0d0d0d", borderRadius: 26, padding: "24px 22px", color: "#fff", position: "relative", overflow: "hidden" }}>
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
                  <button
                    onClick={() => confirmReceipt(r.id)}
                    disabled={confirming === r.id}
                    style={{ width: "100%", background: "#0d0d0d", color: "#fff", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: confirming === r.id ? .5 : 1 }}
                  >
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
              <div style={{ display: "flex", gap: 12 }}>
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

              {/* Tu burbuja */}
              <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, padding: "20px 19px" }}>
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
                    {/* Liquid bubble visual */}
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

                    {/* Claim tier buttons */}
                    <div style={{ display: "flex", gap: 8, marginBottom: hasClaimableBubbles ? 0 : 8 }}>
                      {[1, 2, 3].map((multiplier) => {
                        const tierAmount = bubbleThreshold * multiplier;
                        const isActive = fullBubbles >= multiplier;
                        return (
                          <button
                            key={multiplier}
                            disabled={!isActive || claimingBubble}
                            onClick={isActive ? claimBubble : undefined}
                            style={{
                              flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                              fontSize: 13, fontWeight: 700,
                              cursor: isActive ? "pointer" : "not-allowed",
                              background: isActive ? "#2B57F0" : "#f0f0ef",
                              color: isActive ? "#fff" : "#a1a1aa",
                              transition: "all .2s",
                              opacity: claimingBubble && isActive ? .5 : 1,
                            }}
                          >
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
              <div style={{ background: "#0d0d0d", borderRadius: 24, padding: 22, color: "#fff" }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>Tu enlace personal</h2>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginBottom: 14 }}>Quien entre y contrate, te genera un premio.</p>
                <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: "11px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="rgba(255,255,255,.4)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {referralLink}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={copyLink} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "rgba(255,255,255,.12)", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    {copied
                      ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Copiado</>
                      : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="1.5"/></svg>Copiar</>
                    }
                  </button>
                  <button onClick={shareWhatsApp} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#1FAE54", border: "none", borderRadius: 50, padding: "12px 0", fontSize: 13, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
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

              {/* Tier ladder */}
              {tiers.length > 0 && (
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,.06)", borderRadius: 20, overflow: "hidden" }}>
                  <div style={{ padding: "16px 19px", borderBottom: "1px solid rgba(0,0,0,.05)" }}>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: "#0d0d0d" }}>Premios Seguro de Vida y PPR</h2>
                  </div>
                  {tiers.map((tier) => {
                    const matchingReferral = referrals.find((r) => r.status === "converted" && r.tierPosition === tier.position);
                    const done = paidCount >= tier.position;
                    const current = paidCount + 1 === tier.position;
                    const bonusHere = !matchingReferral && bonusReady && current && tier.position === 1;
                    const displayAmount = matchingReferral ? matchingReferral.rewardAmount : tier.amount;
                    const hasBonus = matchingReferral ? matchingReferral.rewardAmount > tier.amount : false;
                    const showBonusBadge = bonusHere || hasBonus;
                    return (
                      <div key={tier.position} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: current ? "#0d0d0d" : "transparent", borderBottom: "1px solid rgba(0,0,0,.04)" }}>
                        <div style={{ width: 27, height: 27, borderRadius: "50%", background: done ? "#f0fdf4" : current ? "rgba(255,255,255,.1)" : "#f4f4f5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {done
                            ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"/></svg>
                            : <span style={{ fontSize: 11, fontWeight: 700, color: current ? "#fff" : "#a1a1aa" }}>{tier.position}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: current ? "#fff" : done ? "#a1a1aa" : "#0d0d0d", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tier.label || `Referido #${tier.position}`}
                          </p>
                          {showBonusBadge && <p style={{ fontSize: 10, color: "#fbbf24", fontWeight: 600 }}>⚡ Bono de Inicio</p>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: current ? "#fff" : done ? "#16a34a" : "#0d0d0d", flexShrink: 0 }}>
                          {showBonusBadge && (
                            <span style={{ color: current ? "rgba(255,255,255,.3)" : "#a1a1aa", textDecoration: "line-through", marginRight: 5 }}>{formatCurrency(tier.amount)}</span>
                          )}
                          {formatCurrency(bonusHere ? bonusAmount : displayAmount)}
                        </span>
                      </div>
                    );
                  })}
                  {settings.afterLastTier === "cycle" && (
                    <p style={{ fontSize: 11, color: "#a1a1aa", textAlign: "center", padding: "10px 0", borderTop: "1px solid rgba(0,0,0,.05)" }}>
                      Los premios se repiten después del nivel {tiers.length}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── MIS REFERIDOS TAB ── */}
          {tab === "historial" && (
            <div>
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
                  <button
                    onClick={() => setTab("inicio")}
                    style={{ width: "100%", background: "#fff", color: "#0d0d0d", border: "none", borderRadius: 50, padding: "13px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
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
                          <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: badge.bg, color: badge.text }}>
                            {getStatusLabel(r.status)}
                          </span>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          {r.status === "converted" && r.tierPosition === 0 ? (
                            r.productType === "Daños/Auto" || r.productType === "GMM" || r.productType === "Otro" ? (
                              <>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#2B57F0" }}>+{formatCurrency(r.productType === "GMM" ? settings.bubbleGmmPoints : settings.bubbleAutoPoints)}</p>
                                <p style={{ fontSize: 11, color: "#2B57F0", marginTop: 3 }}>Burbuja</p>
                              </>
                            ) : (
                              <>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#a1a1aa" }}>—</p>
                                <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>Sin premio</p>
                              </>
                            )
                          ) : (
                            <>
                              <p style={{ fontSize: 13, fontWeight: 700, color: r.rewardStatus === "paid" ? "#16a34a" : r.rewardStatus === "approved" ? "#d97706" : "#a1a1aa" }}>
                                {r.rewardAmount > 0 ? formatCurrency(r.rewardAmount) : "—"}
                              </p>
                              <p style={{ fontSize: 11, color: "#a1a1aa", marginTop: 3 }}>{getRewardStatusLabel(r.rewardStatus)}</p>
                            </>
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
    </>
  );
}
