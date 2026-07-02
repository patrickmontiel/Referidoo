"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";
import { formatCurrency, formatDate, getStatusLabel, getRewardStatusLabel } from "@/lib/utils";
import { Logo } from "@/components/Logo";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  pending:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
  contacted: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
  converted: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  rejected:  { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400" },
};

const rewardConfig: Record<string, string> = {
  pending:  "text-gray-500",
  approved: "text-amber-600",
  paid:     "text-green-600",
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
  const [poppingBubbles, setPoppingBubbles] = useState(false);
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
    setPoppingBubbles(true);
    const res = await fetch(`/api/portal/${token}/claim-bubble`, { method: "POST" });
    if (res.ok) {
      setTimeout(() => { fetchData(false); setPoppingBubbles(false); }, 600);
    } else {
      setPoppingBubbles(false);
    }
    setClaimingBubble(false);
  }

  function finishOnboarding() {
    localStorage.setItem(`referidos_seen_${token}`, "1");
    setShowOnboarding(false);
  }

  if (loading) {
    return (
      <div className={`min-h-screen bg-white flex items-center justify-center ${hankenGrotesk.className}`}>
        <div className="w-6 h-6 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen bg-white flex items-center justify-center text-center px-6 ${hankenGrotesk.className}`}>
        <div>
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-bold mb-2 text-brand-ink">Acceso no encontrado</h1>
          <p className="text-brand-gray-4 text-sm">Este enlace no es válido o ya no está activo.</p>
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
  // El bono solo se entrega cuando el cliente ya invitó a 3 personas dentro de su semana de lanzamiento
  const bonusReady = launchBonusActive && referralsInWindow >= 3;

  // Contador del Bono de Inicio — se actualiza solo cada minuto vía `now`
  const msLeft = Math.max(0, launchWindowEnd.getTime() - now.getTime());
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutesLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
  const countdownLabel = daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft}m` : `${minutesLeft}m`;
  const countdownUrgent = msLeft < 1000 * 60 * 60 * 24;

  // Premios burbuja — cada burbuja completa vale bubbleClaimThreshold. El cliente puede
  // acumular varias burbujas llenas y decidir cuándo reclamarlas; la burbuja parcial
  // (resto) se conserva tras el reclamo.
  const bubbleThreshold = settings.bubbleClaimThreshold;
  const fullBubbles = Math.floor(client.bubblePoints / bubbleThreshold);
  const bubbleRemainder = client.bubblePoints % bubbleThreshold;
  const bubbleRemainderFraction = bubbleRemainder / bubbleThreshold;
  const hasClaimableBubbles = fullBubbles >= 1;
  const claimableBubbleAmount = fullBubbles * bubbleThreshold;

  // Onboarding modal
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
        style={{
          background: "rgba(13,13,15,.72)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
          padding: "20px",
        }}
      >
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <Logo size="md" />
          </div>

          {/* Progress */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === onboardingStep ? "w-8 bg-[#0B0B0C]" : i < onboardingStep ? "w-4 bg-[#DADCE0]" : "w-4 bg-[#ECEDEF]"
                }`}
              />
            ))}
          </div>

          {/* Step icon */}
          <div className="w-14 h-14 bg-[#0B0B0C] rounded-2xl flex items-center justify-center mb-6 shadow-[0_6px_16px_rgba(11,11,12,0.14)]">
            {step.icon}
          </div>

          {/* Content */}
          <h1 className="text-xl font-bold mb-2.5 leading-snug tracking-[-0.02em] text-[#0B0B0C]">
            {step.title}
          </h1>
          <p className="text-sm text-[#6B727D] leading-relaxed mb-6">{step.body}</p>

          {/* Tier list (step 2 only) */}
          {onboardingStep === 1 && tiers.length > 0 && (
            <div className="mb-6 space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-[#F4F5F7] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-[#0B0B0C] text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm text-[#3F4651]">{t.label || `Referido #${i + 1}`}</span>
                  </div>
                  <span className="font-bold text-sm text-[#0B0B0C]">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => { if (isLast) finishOnboarding(); else setOnboardingStep(onboardingStep + 1); }}
            className="w-full bg-[#2563EB] text-white text-sm font-semibold py-3.5 rounded-full hover:bg-blue-700 active:scale-[.98] transition mb-3"
          >
            {isLast ? "Ir a mi dashboard →" : "Siguiente"}
          </button>
          {!isLast && (
            <button
              onClick={finishOnboarding}
              className="w-full text-sm text-[#9098A2] hover:text-[#6B727D] transition py-1"
            >
              Saltar
            </button>
          )}
        </div>
      </div>
    );
  }

  const referralLink = `${baseUrl}/r/${client.referralCode}`;
  // El progreso de premios solo avanza cuando el asesor confirma el pago
  // Solo los referidos de Vida/PPR (tierPosition > 0) avanzan en la escalera de premios.
  const paidCount = referrals.filter(r => r.rewardStatus === "paid" && r.tierPosition > 0).length;

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

  return (
    <div className={`min-h-screen bg-brand-surface flex flex-col ${hankenGrotesk.className}`}>
      {/* Header — mismo estilo que admin */}
      <header className="bg-white border-b border-brand-border-1 sticky top-0 z-10"
              style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-md mx-auto px-5 h-14 flex items-center justify-between">
          <Logo size="sm" />
          <div className="w-8 h-8 rounded-full bg-brand-ink text-white flex items-center justify-center text-xs font-semibold">
            {client.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto w-full px-5 flex-1"
           style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}>
        {/* Tabs */}
        <div className="flex gap-1 bg-brand-border-1 rounded-xl p-1 mt-5 mb-5">
          {(["inicio", "historial"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
                tab === t ? "bg-white text-brand-ink shadow-sm" : "text-brand-gray-4"
              }`}
            >
              {t === "inicio" ? "Inicio" : "Mis Referidos"}
            </button>
          ))}
        </div>

        {tab === "inicio" && (
          <div className="space-y-3">
            {/* Launch bonus — activado */}
            {client.launchBonusUsed && (
              <div className="bg-brand-ink text-white rounded-2xl p-4">
                <p className="text-xs font-medium text-[#6EA1F5] mb-1">⚡ Bono de Inicio activado</p>
                <p className="text-2xl font-bold">{formatCurrency(bonusAmount)}</p>
                <p className="text-xs text-brand-gray-5 mt-0.5">Tu primer premio fue duplicado por referir en tu primera semana.</p>
              </div>
            )}

            {/* Launch bonus — activo en ventana */}
            {launchBonusActive && (
              <div className="bg-brand-ink text-white rounded-2xl p-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-blue/20 rounded-full blur-2xl" />
                <div className="flex items-center justify-between mb-2 relative">
                  <p className="text-xs font-medium text-[#6EA1F5]">⚡ Bono de Inicio</p>
                  <span
                    key={countdownLabel}
                    className={`countdown-tick text-xs font-medium px-2.5 py-1 rounded-full tabular-nums ${
                      countdownUrgent ? "countdown-urgent bg-amber-400/15 text-amber-300" : "bg-white/10 text-brand-gray-5"
                    }`}
                  >
                    {countdownLabel} restantes
                  </span>
                </div>

                {referralsInWindow >= 3 ? (
                  <>
                    <p className="text-sm text-brand-gray-5 mb-1 relative">El primero de tus referidos en contratar PPR o Seguro de Vida te da</p>
                    <div className="flex items-baseline gap-2 relative">
                      <span className="text-base text-brand-gray-5 line-through">{formatCurrency(firstTierAmount)}</span>
                      <span className="bonus-glow text-3xl font-bold text-[#6EA1F5]">{formatCurrency(bonusAmount)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-brand-gray-5 mb-1 relative">Tu primer premio puede subir de</p>
                    <div className="flex items-baseline gap-2 mb-3 relative">
                      <span className="text-base text-brand-gray-5 line-through">{formatCurrency(firstTierAmount)}</span>
                      <span className="text-3xl font-bold text-[#6EA1F5]">{formatCurrency(bonusAmount)}</span>
                    </div>
                    <p className="text-sm font-semibold mb-1 relative">
                      Invita a {3 - referralsInWindow} {3 - referralsInWindow === 1 ? "persona más" : "personas más"} esta semana
                    </p>
                    <p className="text-xs text-brand-gray-5 mb-3 relative">
                      Una vez un referido tuyo contrate Seguro de Vida o PPR te llevarás el bono.
                    </p>
                    <div className="flex gap-1.5 mb-2 relative">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                          i <= referralsInWindow ? "bg-[#6EA1F5]" : "bg-white/10"
                        }`} />
                      ))}
                    </div>
                    <p className="text-xs text-brand-gray-5 relative">{referralsInWindow}/3 contactos invitados</p>
                  </>
                )}
              </div>
            )}

            {/* Confirmación pendiente */}
            {referrals.filter(r => r.rewardStatus === "paid" && r.tierPosition > 0 && !r.confirmedByReferrer && !confirmed.has(r.id)).map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-brand-border-1 shadow-sm p-4">
                <p className="text-xs font-medium text-brand-gray-1 mb-0.5">Premio enviado — ¿Lo recibiste?</p>
                <p className="text-2xl font-bold text-brand-ink mb-0.5">{formatCurrency(r.rewardAmount)}</p>
                <p className="text-xs text-brand-gray-4 mb-3">Por referir a {r.leadName}</p>
                <button
                  onClick={() => confirmReceipt(r.id)}
                  disabled={confirming === r.id}
                  className="w-full bg-brand-ink text-white text-sm font-medium py-3 rounded-full disabled:opacity-50 transition hover:bg-[#26262a]"
                >
                  {confirming === r.id ? "Confirmando..." : "Sí, lo recibí ✓"}
                </button>
              </div>
            ))}

            {/* Confirmados */}
            {referrals.filter(r => r.tierPosition > 0 && (r.confirmedByReferrer || confirmed.has(r.id))).map(r => (
              <div key={`conf-${r.id}`} className="bg-white rounded-2xl border border-brand-border-1 shadow-sm p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12L10 17L19 8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-ink">Premio confirmado</p>
                  <p className="text-xs text-brand-gray-4">{formatCurrency(r.rewardAmount)} · {r.leadName}</p>
                </div>
              </div>
            ))}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-ink text-white rounded-2xl p-4">
                <p className="text-xs text-brand-gray-5 mb-1">Ganado</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalEarned)}</p>
                <p className="text-xs text-brand-gray-5 mt-0.5">pagado</p>
              </div>
              <div className="bg-white rounded-2xl border border-brand-border-1 shadow-sm p-4">
                <p className="text-xs text-brand-gray-4 mb-1">Por cobrar</p>
                <p className="text-2xl font-bold text-brand-ink">{formatCurrency(stats.pendingEarnings)}</p>
                <p className="text-xs text-brand-gray-4 mt-0.5">aprobado</p>
              </div>
            </div>

            {/* Niveles de premios */}
            {tiers.length > 0 && (
              <div className="bg-white rounded-2xl border border-brand-border-1 shadow-sm">
                <div className="px-5 py-4 border-b border-brand-border-2">
                  <h2 className="font-bold text-sm text-brand-ink">Premios Seguro de Vida y PPRs</h2>
                </div>
                <div className="divide-y divide-brand-border-2">
                  {tiers.map((tier) => {
                    // Si ya existe un referido convertido en esta posición, su rewardAmount
                    // refleja el monto real (incluyendo bonos ya aplicados) — más confiable
                    // que el monto estático del nivel.
                    const matchingReferral = referrals.find((r) => r.status === "converted" && r.tierPosition === tier.position);
                    const done = paidCount >= tier.position;
                    const current = paidCount + 1 === tier.position;
                    const bonusHere = !matchingReferral && bonusReady && current && tier.position === 1;
                    const displayAmount = matchingReferral ? matchingReferral.rewardAmount : tier.amount;
                    // El bono se sigue mostrando (monto base tachado + monto real) aunque ya
                    // esté pagado — no solo en la vista previa antes de asignarse.
                    const hasBonus = matchingReferral ? matchingReferral.rewardAmount > tier.amount : false;
                    const showBonusBadge = bonusHere || hasBonus;
                    const amountColor = current ? "text-white" : done ? "text-green-600" : "text-brand-gray-1";
                    const strikeColor = current ? "text-white/40" : "text-brand-gray-4";
                    return (
                      <div key={tier.position} className={`flex items-center gap-3 px-5 py-3 ${current ? "bg-brand-ink" : ""}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          done ? "bg-green-50" : current ? "bg-white/10" : "bg-brand-border-1"
                        }`}>
                          {done ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                              <path d="M5 12L10 17L19 8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          ) : (
                            <span className={`text-xs font-semibold ${current ? "text-white" : "text-brand-gray-4"}`}>
                              {tier.position}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${current ? "text-white" : done ? "text-brand-gray-4 line-through" : "text-brand-gray-1"}`}>
                            {tier.label || `Referido #${tier.position}`}
                          </p>
                          {showBonusBadge && (
                            <p className="text-[10px] text-amber-400 font-medium">⚡ Bono de Inicio</p>
                          )}
                        </div>
                        <span className={`text-sm font-semibold ${amountColor}`}>
                          {showBonusBadge && (
                            <span className={`${strikeColor} line-through mr-1.5`}>{formatCurrency(tier.amount)}</span>
                          )}
                          {formatCurrency(bonusHere ? bonusAmount : displayAmount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {settings.afterLastTier === "cycle" && (
                  <p className="text-xs text-brand-gray-4 text-center py-3 border-t border-brand-border-2">
                    Los premios se repiten después del nivel {tiers.length}
                  </p>
                )}
              </div>
            )}

            {/* Premios burbuja — Auto, Otro + GMM */}
            <div className="bg-white rounded-2xl border border-brand-border-1 shadow-sm p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-bold text-sm text-brand-ink">Premios burbuja</h2>
                <span className="text-xs text-brand-gray-4">Auto, Otro + GMM</span>
              </div>
              {pendingBubbleClaim ? (
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 8V12L15 15M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-brand-ink">Reclamo en proceso</p>
                    <p className="text-xs text-brand-gray-4">{formatCurrency(pendingBubbleClaim.amount)} · tu asesor lo enviará pronto</p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-brand-gray-4 mb-3">Se llena con cada venta de Auto, Otro o GMM. Cada burbuja completa vale {formatCurrency(bubbleThreshold)}.</p>
                  <div className="flex items-center justify-center gap-3 py-2 mb-3 flex-wrap">
                    {Array.from({ length: fullBubbles }, (_, i) => (
                      <div
                        key={`full-${i}`}
                        className={`relative w-14 h-14 rounded-full border-2 overflow-hidden bg-brand-blue-bg/60 border-brand-blue shadow-[0_3px_10px_rgba(37,99,235,0.3)] ${
                          poppingBubbles ? "bubble-pop" : "bubble-ready"
                        }`}
                        style={poppingBubbles ? { animationDelay: `${i * 70}ms` } : undefined}
                      >
                        <div className="absolute bottom-0 left-0 right-0" style={{ height: "100%", background: "linear-gradient(to top, #2563EB, #6EA1F5)" }} />
                        <div className="absolute inset-0 rounded-full bubble-shine" />
                      </div>
                    ))}
                    <div className="relative w-14 h-14 rounded-full border-2 overflow-hidden bg-brand-blue-bg/60 border-brand-border-1 shadow-[0_3px_10px_rgba(37,99,235,0.12)]">
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                        style={{ height: `${bubbleRemainderFraction * 100}%`, background: "linear-gradient(to top, #2563EB, #6EA1F5)" }}
                      />
                      <div className="absolute inset-0 rounded-full bubble-shine" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between mb-3">
                    <p className="text-lg font-bold text-brand-ink">{formatCurrency(client.bubblePoints)}</p>
                    {hasClaimableBubbles ? (
                      <p className="text-xs text-brand-blue font-medium">{fullBubbles} burbuja{fullBubbles > 1 ? "s" : ""} lista{fullBubbles > 1 ? "s" : ""} para reclamar</p>
                    ) : (
                      <p className="text-xs text-brand-gray-4">Meta {formatCurrency(bubbleThreshold)}</p>
                    )}
                  </div>
                  {hasClaimableBubbles ? (
                    <button
                      onClick={claimBubble}
                      disabled={claimingBubble}
                      className="w-full bg-brand-ink text-white text-sm font-medium py-3 rounded-full disabled:opacity-50 transition hover:bg-[#26262a]"
                    >
                      {claimingBubble ? "Reclamando..." : `Reclamar ${formatCurrency(claimableBubbleAmount)}`}
                    </button>
                  ) : (
                    <p className="text-xs text-brand-gray-4 text-center">Te faltan {formatCurrency(bubbleThreshold - bubbleRemainder)} para tu próxima burbuja de {formatCurrency(bubbleThreshold)}.</p>
                  )}
                </>
              )}
            </div>

            {/* Share */}
            <div className="bg-brand-ink rounded-2xl p-4 text-white">
              <h2 className="font-medium text-sm mb-0.5">Tu enlace personal</h2>
              <p className="text-xs text-brand-gray-5 mb-4">Quien entre y contrate, te genera un premio.</p>
              <div className="bg-white/10 rounded-xl px-4 py-3 mb-3 font-mono text-xs break-all">
                {referralLink}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm py-3 rounded-full transition font-medium"
                >
                  {copied ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>Copiado</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="1.5"/></svg>Copiar</>
                  )}
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm py-3 rounded-full transition font-medium"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border border-brand-border-1 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-brand-ink">{stats.totalReferrals}</p>
                <p className="text-xs text-brand-gray-4 mt-1">Referidos enviados</p>
              </div>
              <div className="bg-white rounded-2xl border border-brand-border-1 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-brand-ink">{stats.convertedCount}</p>
                <p className="text-xs text-brand-gray-4 mt-1">Convertidos</p>
              </div>
            </div>
          </div>
        )}

        {tab === "historial" && (
          <div>
            {referrals.length === 0 ? (
              <div className="text-center py-16 px-6">
                <p className="text-brand-gray-4 text-sm">Aún no has referido a nadie.</p>
                {launchBonusActive ? (
                  <p className="text-xs text-brand-gray-4 mt-1">
                    ⚡ Invita a 3 personas esta semana y tu primer premio sube de{" "}
                    {formatCurrency(firstTierAmount)} a{" "}
                    <strong className="text-brand-gray-1">{formatCurrency(bonusAmount)}</strong>.
                  </p>
                ) : (
                  <p className="text-xs text-brand-gray-4 mt-1">Tu primer referido vale {formatCurrency(tiers[0]?.amount ?? 1500)}.</p>
                )}
                <button
                  onClick={() => setTab("inicio")}
                  className="mt-5 px-5 py-2.5 bg-brand-ink text-white text-sm rounded-full font-medium"
                >
                  Compartir ahora
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-brand-border-1 shadow-sm divide-y divide-brand-border-2">
                {referrals.map((r) => {
                  const sc = statusConfig[r.status] ?? statusConfig.pending;
                  return (
                    <div key={r.id} className="flex items-start gap-4 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-ink truncate">{r.leadName}</p>
                        <p className="text-xs text-brand-gray-4 mt-0.5">{r.leadPhone}</p>
                        <p className="text-xs text-brand-gray-4 mt-1">{formatDate(r.createdAt)}</p>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium mt-2 ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {getStatusLabel(r.status)}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {r.status === "converted" && r.tierPosition === 0 ? (
                          r.productType === "Daños/Auto" || r.productType === "GMM" || r.productType === "Otro" ? (
                            <>
                              <p className="text-sm font-semibold text-brand-blue">
                                +{formatCurrency(r.productType === "GMM" ? settings.bubbleGmmPoints : settings.bubbleAutoPoints)}
                              </p>
                              <p className="text-xs text-brand-blue font-medium mt-0.5">Premios burbuja</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-brand-gray-4">—</p>
                              <p className="text-xs text-brand-gray-4 font-medium mt-0.5">Sin premio en efectivo</p>
                            </>
                          )
                        ) : (
                          <>
                            <p className={`text-sm font-semibold ${rewardConfig[r.rewardStatus] ?? "text-brand-gray-4"}`}>
                              {formatCurrency(r.rewardAmount)}
                            </p>
                            <p className="text-xs text-brand-gray-4 mt-0.5">{getRewardStatusLabel(r.rewardStatus)}</p>
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
  );
}
