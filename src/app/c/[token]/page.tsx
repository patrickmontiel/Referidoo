"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCurrency, formatDate, getStatusLabel, getRewardStatusLabel } from "@/lib/utils";

type RewardTier = { position: number; amount: number; label: string | null };

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  tierPosition: number;
  createdAt: string;
  rewardPaidAt: string | null;
  confirmedByReferrer: boolean;
  referrerConfirmedAt: string | null;
};

type PortalData = {
  client: { id: string; name: string; referralCode: string; createdAt: string; launchBonusUsed: boolean };
  advisor: { name: string; phone: string | null; companyName: string | null; whatsappMessage: string | null };
  tiers: RewardTier[];
  settings: { afterLastTier: string; flatAmount: number };
  referrals: Referral[];
  stats: { totalReferrals: number; convertedCount: number; totalEarned: number; pendingEarnings: number };
};

function getNextReward(tiers: RewardTier[], completedCount: number, settings: { afterLastTier: string; flatAmount: number }): number {
  if (tiers.length === 0) return 1500;
  const next = completedCount + 1;
  const exact = tiers.find((t) => t.position === next);
  if (exact) return exact.amount;
  if (settings.afterLastTier === "cycle") {
    const pos = ((next - 1) % tiers.length) + 1;
    return tiers.find((t) => t.position === pos)?.amount ?? tiers[0].amount;
  }
  if (settings.afterLastTier === "flat") return settings.flatAmount;
  return tiers[tiers.length - 1].amount;
}

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

  useEffect(() => {
    fetch(`/api/portal/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setData(d);
          const key = `referidos_seen_${token}`;
          if (!localStorage.getItem(key)) {
            setShowOnboarding(true);
          }
        }
        setLoading(false);
      });
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

  function finishOnboarding() {
    localStorage.setItem(`referidos_seen_${token}`, "1");
    setShowOnboarding(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-center px-6">
        <div>
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-semibold mb-2">Acceso no encontrado</h1>
          <p className="text-gray-500 text-sm">Este enlace no es válido o ya no está activo.</p>
        </div>
      </div>
    );
  }

  const { client, advisor, tiers, settings, referrals, stats } = data;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Launch bonus calculations
  const launchWindowEnd = new Date(new Date(client.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const inLaunchWindow = now <= launchWindowEnd;
  const launchBonusActive = inLaunchWindow && !client.launchBonusUsed;
  const msLeft = launchWindowEnd.getTime() - now.getTime();
  const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
  const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const referralsInWindow = referrals.filter(r => new Date(r.createdAt) <= launchWindowEnd).length;
  const firstTierAmount = tiers[0]?.amount ?? 1500;
  const bonusAmount = firstTierAmount * 2;

  // Onboarding modal — shown only on first visit
  if (showOnboarding) {
    const steps = [
      {
        icon: (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" strokeWidth="1.5"/>
            <path d="M12 8V12L15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ),
        title: `${client.name.split(" ")[0]}, bienvenido a Referidoo`,
        body: `Eduardo Neri te invita a recomendar a las personas que más te importan para que también cuiden su patrimonio. Cada vez que alguien contrate un plan gracias a ti, recibes dinero en efectivo.`,
      },
      {
        icon: (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        title: "Así se acumula",
        body: tiers.length > 0
          ? `Por cada persona que contrate gracias a tu recomendación, ganas en efectivo. Los primeros tres referidos dan más.`
          : `Cada referido que contrate un plan te da ${formatCurrency(1500)} en efectivo, directo.`,
      },
      {
        icon: (
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path d="M22 16.92V19.92C22.0011 20.4813 21.7659 21.0171 21.3527 21.4046C20.9395 21.7921 20.3873 21.9971 19.82 21.97C16.7428 21.6429 13.787 20.5973 11.19 18.92C8.77382 17.3883 6.72534 15.3398 5.19 12.92C3.49997 10.3099 2.45418 7.33897 2.13 4.24999C2.10313 3.68453 2.30731 3.13436 2.69261 2.72161C3.07791 2.30886 3.61263 2.07326 4.17 2.04999H7.17C8.18 2.04999 9.04 2.77999 9.17 3.77999L9.67 7.27999C9.71 7.54999 9.64 7.82999 9.47 8.04999L7.72 9.81999C9.17379 12.3484 11.2516 14.4263 13.78 15.88L15.55 14.13C15.77 13.95 16.06 13.88 16.33 13.92L19.83 14.42C20.8199 14.5527 21.5499 15.4127 21.55 16.42L22 16.92Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ),
        title: "Sin papeleo, sin presión",
        body: "Comparte tu link con quien quieras. Si a tu contacto le interesa, Eduardo lo asesora personalmente. Si contrata, tú cobras. Nada más.",
      },
    ];

    const step = steps[onboardingStep];
    const isLast = onboardingStep === steps.length - 1;

    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6"
           style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="w-full max-w-sm">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-10">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === onboardingStep ? "w-8 bg-black" : i < onboardingStep ? "w-4 bg-gray-300" : "w-4 bg-gray-100"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-8">
            {step.icon}
          </div>

          {/* Content */}
          <h1 className="text-2xl font-semibold mb-3 leading-tight">{step.title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{step.body}</p>

          {/* Tiers visual on step 2 */}
          {onboardingStep === 1 && tiers.length > 0 && (
            <div className="mt-6 space-y-2">
              {tiers.map((t, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-700">{t.label || `Referido #${i + 1}`}</span>
                  </div>
                  <span className="font-semibold text-sm">{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => {
              if (isLast) finishOnboarding();
              else setOnboardingStep(onboardingStep + 1);
            }}
            className="w-full mt-10 bg-black text-white text-sm font-medium py-4 rounded-2xl hover:bg-gray-900 transition"
          >
            {isLast ? "Ir a mi dashboard →" : "Siguiente"}
          </button>

          {!isLast && (
            <button
              onClick={finishOnboarding}
              className="w-full mt-2 text-gray-400 text-xs py-2 hover:text-gray-600 transition"
            >
              Saltar
            </button>
          )}
        </div>
      </div>
    );
  }
  const referralLink = `${baseUrl}/r/${client.referralCode}`;

  const nextReward = getNextReward(tiers, referrals.filter(r => r.status !== "rejected").length, settings);
  const completedNonRejected = referrals.filter(r => r.status !== "rejected").length;

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const firstName = client.name.split(" ")[0];
    const msg = advisor.whatsappMessage
      ? advisor.whatsappMessage.replace("{link}", referralLink).replace("{nombre}", firstName)
      : `Hola 👋 Quiero compartirte algo que a mí me ha servido mucho.\n\nTengo un plan de vida y retiro con Eduardo Neri que me está ayudando a proteger mi patrimonio. Creo que a ti también te podría interesar.\n\nSin compromiso, solo entra y revisa: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    pending:   { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400" },
    contacted: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400" },
    converted: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
    rejected:  { bg: "bg-gray-100",  text: "text-gray-500",   dot: "bg-gray-400" },
  };

  const rewardConfig: Record<string, { text: string }> = {
    pending:  { text: "text-gray-400" },
    approved: { text: "text-amber-600" },
    paid:     { text: "text-green-600" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10"
           style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">Referidoo</p>
            <h1 className="font-semibold text-base leading-tight">{client.name}</h1>
          </div>
          <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold">
            {client.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}>
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-5 mb-6">
          {(["inicio", "historial"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {t === "inicio" ? "Inicio" : "Mis Referidos"}
            </button>
          ))}
        </div>

        {tab === "inicio" && (
          <>
            {/* Launch bonus widget */}
            {client.launchBonusUsed && (
              <div className="bg-black rounded-2xl p-5 mb-4 text-white">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🎯</span>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60">Bono de Inicio activado</p>
                </div>
                <p className="font-bold text-xl mb-0.5">Tu primer premio fue de {formatCurrency(bonusAmount)}</p>
                <p className="text-sm text-white/60">Invitaste 3 personas en tu primera semana. ¡Bien hecho!</p>
              </div>
            )}

            {launchBonusActive && (
              <div className="rounded-2xl p-5 mb-4 border-2 border-black bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <p className="text-xs font-bold uppercase tracking-widest text-black">Bono de Inicio</p>
                  </div>
                  <span className="text-xs font-semibold bg-black text-white px-2.5 py-1 rounded-full">
                    {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`} restantes
                  </span>
                </div>

                {referralsInWindow >= 3 ? (
                  <>
                    <p className="font-bold text-lg mb-1">¡Lista para activarlo!</p>
                    <p className="text-sm text-gray-500 mb-3">
                      Invitaste {referralsInWindow} personas. Si alguna contrata antes de que termine la semana, tu primer premio sube a <strong className="text-black">{formatCurrency(bonusAmount)}</strong> en vez de {formatCurrency(firstTierAmount)}.
                    </p>
                    <div className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Premio normal</span>
                        <span className="text-sm line-through text-gray-400">{formatCurrency(firstTierAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm font-bold">Con tu bono</span>
                        <span className="text-base font-bold text-black">{formatCurrency(bonusAmount)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg mb-1">
                      Invita a {3 - referralsInWindow} {3 - referralsInWindow === 1 ? "persona más" : "personas más"} esta semana
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      Si alguna contrata, tu primer premio sube de{" "}
                      <span className="line-through">{formatCurrency(firstTierAmount)}</span> a{" "}
                      <strong className="text-black">{formatCurrency(bonusAmount)}</strong>.
                    </p>
                    {/* Progress dots */}
                    <div className="flex gap-2 mb-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`flex-1 h-2 rounded-full transition-all ${
                            i <= referralsInWindow ? "bg-black" : "bg-gray-100"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">{referralsInWindow}/3 contactos invitados</p>
                  </>
                )}
              </div>
            )}

            {/* Confirmation banners for paid-but-unconfirmed referrals */}
            {referrals.filter(r => r.rewardStatus === "paid" && !r.confirmedByReferrer && !confirmed.has(r.id)).map(r => (
              <div key={r.id} className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Premio enviado</p>
                <p className="text-sm text-amber-900 font-medium mb-0.5">{formatCurrency(r.rewardAmount)} por referir a {r.leadName}</p>
                <p className="text-xs text-amber-600 mb-3">{advisor.name} confirmó el pago. ¿Ya lo recibiste?</p>
                <button
                  onClick={() => confirmReceipt(r.id)}
                  disabled={confirming === r.id}
                  className="w-full bg-black text-white text-sm py-2.5 rounded-xl font-medium disabled:opacity-50 transition"
                >
                  {confirming === r.id ? "Confirmando..." : "Sí, lo recibí ✓"}
                </button>
              </div>
            ))}
            {/* Confirmed badge */}
            {referrals.filter(r => r.confirmedByReferrer || confirmed.has(r.id)).map(r => (
              <div key={`conf-${r.id}`} className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 mb-3 flex items-center gap-3">
                <div className="w-7 h-7 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-900">Premio confirmado — {r.leadName}</p>
                  <p className="text-xs text-green-600">{formatCurrency(r.rewardAmount)} recibidos</p>
                </div>
              </div>
            ))}

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Ganado</p>
                <p className="text-2xl font-semibold">{formatCurrency(stats.totalEarned)}</p>
                <p className="text-xs text-gray-400 mt-0.5">pagado</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Por cobrar</p>
                <p className="text-2xl font-semibold">{formatCurrency(stats.pendingEarnings)}</p>
                <p className="text-xs text-gray-400 mt-0.5">aprobado</p>
              </div>
            </div>

            {/* Reward tiers progress */}
            {tiers.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
                <h2 className="font-semibold mb-4">Premio siguiente</h2>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-semibold">{formatCurrency(nextReward)}</span>
                  <span className="text-sm text-gray-400">por tu próximo referido</span>
                </div>
                <div className="space-y-2">
                  {tiers.map((tier) => {
                    const done = completedNonRejected >= tier.position;
                    const current = completedNonRejected + 1 === tier.position;
                    return (
                      <div
                        key={tier.position}
                        className={`flex items-center gap-3 p-3 rounded-xl transition ${
                          current ? "bg-black text-white" : done ? "bg-gray-50" : "bg-gray-50 opacity-60"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          done ? "bg-green-500" : current ? "bg-white/20" : "bg-gray-200"
                        }`}>
                          {done ? (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                            </svg>
                          ) : (
                            <span className={`text-xs font-semibold ${current ? "text-white" : "text-gray-500"}`}>
                              {tier.position}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${current ? "text-white" : done ? "text-gray-500 line-through" : "text-gray-700"}`}>
                            {tier.label || `Referido #${tier.position}`}
                          </p>
                        </div>
                        <span className={`text-sm font-semibold ${current ? "text-white" : done ? "text-green-600" : "text-gray-600"}`}>
                          {formatCurrency(tier.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {settings.afterLastTier === "cycle" && (
                  <p className="text-xs text-gray-400 mt-3 text-center">Los premios se repiten después del nivel {tiers.length}</p>
                )}
              </div>
            )}

            {/* Share card */}
            <div className="bg-black rounded-2xl p-5 mb-5 text-white">
              <h2 className="font-semibold mb-1">Tu enlace personal</h2>
              <p className="text-xs text-gray-400 mb-4">Mándalo por WhatsApp. Quien entre y contrate, te genera un premio.</p>
              <div className="bg-white/10 rounded-xl px-4 py-3 mb-4 font-mono text-xs break-all">
                {referralLink}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm py-3 rounded-xl transition font-medium"
                >
                  {copied ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                      Copiar
                    </>
                  )}
                </button>
                <button
                  onClick={shareWhatsApp}
                  className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm py-3 rounded-xl transition font-medium"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-3xl font-semibold">{stats.totalReferrals}</p>
                <p className="text-xs text-gray-400 mt-1">Referidos enviados</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-3xl font-semibold">{stats.convertedCount}</p>
                <p className="text-xs text-gray-400 mt-1">Convertidos</p>
              </div>
            </div>
          </>
        )}

        {tab === "historial" && (
          <div>
            {referrals.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">👥</p>
                <h3 className="font-semibold mb-2">Aún no has referido a nadie</h3>
                <p className="text-sm text-gray-500">Tu primer referido vale {formatCurrency(tiers[0]?.amount ?? 1500)}. Comparte y empieza.</p>
                <button
                  onClick={() => setTab("inicio")}
                  className="mt-6 px-6 py-2.5 bg-black text-white text-sm rounded-full font-medium"
                >
                  Compartir ahora
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((r) => {
                  const sc = statusConfig[r.status] ?? statusConfig.pending;
                  const rc = rewardConfig[r.rewardStatus] ?? rewardConfig.pending;
                  return (
                    <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{r.leadName}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{r.leadPhone}</p>
                          <p className="text-xs text-gray-300 mt-1">{formatDate(r.createdAt)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-base font-semibold ${rc.text}`}>
                            {formatCurrency(r.rewardAmount)}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{getRewardStatusLabel(r.rewardStatus)}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {getStatusLabel(r.status)}
                        </span>
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
