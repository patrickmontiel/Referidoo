"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDate, formatCurrency } from "@/lib/utils";
import { UpgradeCardForm } from "@/components/UpgradeCardForm";

type PendingCommission = {
  id: string;
  leadName: string;
  productType: string | null;
  saleAmount: number | null;
  lessioCommission: number | null;
  createdAt: string;
};

type Advisor = {
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  createdAt: string;
  plan: string;
  emailVerified: boolean;
  paidUntil: string | null;
  monthlyPriceMxn: number;
  pendingCommissionTotal: number;
  pendingCommissions: PendingCommission[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function nameToSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type PerfilClientProps = {
  initialAdvisor: Advisor;
  initialClientCount: number;
  initialLeadCount: number;
  freemiumCommission: number;
  proCommission: number;
  commissionDiff: number;
  netWithPro: number;
  convertedCount: number;
  billingStatus: "paid" | "trial" | "trial_expired" | "freemium";
};

export default function PerfilClient({ initialAdvisor, initialClientCount, initialLeadCount, freemiumCommission, proCommission, commissionDiff, netWithPro, convertedCount, billingStatus }: PerfilClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [advisor, setAdvisor] = useState<Advisor | null>(initialAdvisor);
  const [clientCount, setClientCount] = useState<number | null>(initialClientCount);
  const [leadCount, setLeadCount] = useState<number | null>(initialLeadCount);
  const [loading, setLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [justSubscribed, setJustSubscribed] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Intención Pro desde la landing (/registro?plan=pro → aquí): abre el
  // modal de upgrade directo para que la compra no se pierda en el camino.
  useEffect(() => {
    if (searchParams.get("upgrade") === "pro" && initialAdvisor.plan !== "paid") {
      setShowUpgradeForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function resendVerification() {
    if (resending || resent) return;
    setResending(true);
    await fetch("/api/auth/resend-verification", { method: "POST" }).catch(() => {});
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 2000);
  }

  function copyLink() {
    if (!advisor) return;
    const slug = nameToSlug(advisor.name);
    navigator.clipboard.writeText(`https://referidoo.com/unete/${slug}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleUpgradeSuccess() {
    setShowUpgradeForm(false);
    setJustSubscribed(true);
    setAdvisor((prev) => (prev ? { ...prev, plan: "paid" } : prev));
  }

  async function handleCancel() {
    setBillingBusy(true);
    setBillingError("");
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await res.json();
    setBillingBusy(false);
    setConfirmingCancel(false);
    if (!res.ok) { setBillingError(data.error ?? "No se pudo cancelar"); return; }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!advisor) {
    return <p className="text-sm text-brand-gray-4">No se pudo cargar tu perfil.</p>;
  }

  const isPaid = advisor.plan === "paid";
  // Trial = "paid" sin suscripción de MP. Al pagar en el modal deja de serlo.
  const isTrial = billingStatus === "trial" && !justSubscribed;
  const trialDaysLeft = isTrial && advisor.paidUntil
    ? Math.max(0, Math.ceil((new Date(advisor.paidUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  const slug = nameToSlug(advisor.name);

  return (
    <div className="w-full pb-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-ink">Perfil</h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">Tu cuenta y suscripción</p>
      </div>

      {/* Identity */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-6 mb-4 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-[#0B0B0C] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {getInitials(advisor.name)}
        </div>
        <div>
          <p className="font-bold text-[20px] text-[#0B0B0C] leading-tight">{advisor.name}</p>
          <p className="text-sm text-brand-gray-4 mt-0.5">
            Asesor de seguros{advisor.companyName ? ` · ${advisor.companyName}` : ""}
          </p>
        </div>
      </div>

      {/* Data rows */}
      <div className="bg-white rounded-2xl border border-brand-border-1 mb-4 overflow-hidden">
        {[
          {
            label: "Correo",
            value: (
              <span className="flex items-center gap-2">
                {advisor.email}
                {advisor.emailVerified ? (
                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                    Verificado
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Sin verificar
                  </span>
                )}
              </span>
            ),
          },
          { label: "Teléfono", value: advisor.phone || "—" },
          {
            label: "Clientes",
            value: (
              <span className="font-bold text-[#0B0B0C]">
                {clientCount ?? "—"} <span className="font-normal text-brand-gray-4">· Ilimitados</span>
              </span>
            ),
          },
          {
            label: "Leads",
            value: (
              <span className="font-bold text-[#0B0B0C]">
                {leadCount ?? "—"}<span className="font-normal text-brand-gray-4">/12</span>
              </span>
            ),
          },
        ].map((row, i, arr) => (
          <div
            key={row.label}
            className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-brand-border-1" : ""}`}
          >
            <span className="text-sm text-brand-gray-4">{row.label}</span>
            <span className="text-sm">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Asesor referral link */}
      <div className="bg-[#2563EB] rounded-2xl p-5 mb-4">
        <p className="text-xs font-bold text-white/70 uppercase tracking-[0.08em] mb-1.5">Tu link de referidos</p>
        <p className="font-bold text-white text-[15px] mb-4 break-all">referidoo.com/unete/{slug}</p>
        <button
          onClick={copyLink}
          className="bg-white text-[#0B0B0C] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition"
        >
          {copied ? "¡Copiado ✓" : "Copiar link"}
        </button>
      </div>

      {/* Plan */}
      <div data-tour="perfil" className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-4">
        {!advisor.emailVerified && (
          <div className="bg-sky-50 border border-sky-100 text-sky-800 text-sm px-4 py-3 rounded-xl mb-4 flex items-center justify-between gap-3">
            <span>Verifica tu correo para empezar a agregar clientes — revisa tu bandeja de entrada.</span>
            {resent ? (
              <span className="text-green-700 font-medium whitespace-nowrap flex-shrink-0">reenviado con éxito</span>
            ) : (
              <button
                onClick={resendVerification}
                disabled={resending}
                className="underline whitespace-nowrap flex-shrink-0 disabled:opacity-50 cursor-pointer bg-transparent border-0 p-0 text-sky-800 text-sm"
              >
                {resending ? "enviando..." : "reenviar correo"}
              </button>
            )}
          </div>
        )}

        {isPaid ? (
          <div>
            <div className="flex items-start justify-between mb-3">
              {isTrial ? (
                <div>
                  <p className="font-bold text-[#0B0B0C] text-[17px]">Prueba Pro</p>
                  <p className="text-brand-gray-4 text-sm mt-0.5">
                    <span className="text-[#0B0B0C] font-semibold text-xl">Gratis</span>
                    <span className="text-brand-gray-4"> durante la prueba</span>
                  </p>
                  {advisor.paidUntil && (
                    <p className="text-xs text-brand-gray-4 mt-1">
                      Termina el {formatDate(advisor.paidUntil)} · después ${advisor.monthlyPriceMxn}/mes, o bajas al plan Gratis. Agrega tu método de pago para seguir en Pro sin cortes.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-[#0B0B0C] text-[17px]">Plan Pro</p>
                  <p className="text-brand-gray-4 text-sm mt-0.5">
                    <span className="text-[#0B0B0C] font-semibold text-xl">${advisor.monthlyPriceMxn}</span>
                    <span className="text-brand-gray-4"> /mes</span>
                  </p>
                  {advisor.paidUntil && (
                    <p className="text-xs text-brand-gray-4 mt-1">
                      Se cobra solo vía Mercado Pago · próximo cobro {formatDate(advisor.paidUntil)}
                    </p>
                  )}
                </div>
              )}
              {isTrial ? (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full flex-shrink-0 whitespace-nowrap">
                  {trialDaysLeft === 0 ? "Termina hoy" : `Prueba · ${trialDaysLeft} ${trialDaysLeft === 1 ? "día" : "días"}`}
                </span>
              ) : (
                <span className="text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-full flex-shrink-0">
                  Activo
                </span>
              )}
            </div>

            {!isTrial && advisor.pendingCommissions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-brand-border-1">
                <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-2">
                  Comisiones pendientes
                </p>
                <div className="space-y-1">
                  {advisor.pendingCommissions.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm">
                      <span className="text-brand-gray-4">
                        {c.leadName}{c.productType ? ` (${c.productType})` : ""}
                      </span>
                      <span>${c.lessioCommission} MXN</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-brand-border-1 mt-1">
                    <span>Total próximo cobro</span>
                    <span>${advisor.monthlyPriceMxn + advisor.pendingCommissionTotal} MXN</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              {isTrial ? (
                <>
                  <button
                    onClick={() => setShowUpgradeForm(true)}
                    className="flex-1 bg-brand-ink text-white text-sm font-medium py-3 rounded-full hover:bg-[#26262a] transition"
                  >
                    Agregar método de pago
                  </button>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-red-600 px-4 py-3 rounded-full border border-red-100 hover:bg-red-50 transition"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : confirmingCancel ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={billingBusy}
                    className="flex-1 text-sm font-medium py-3 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition"
                  >
                    {billingBusy ? "Cancelando..." : "Confirmar cancelación"}
                  </button>
                  <button
                    onClick={() => setConfirmingCancel(false)}
                    disabled={billingBusy}
                    className="text-sm font-medium px-4 py-3 rounded-full border border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface disabled:opacity-50 transition"
                  >
                    Mantener
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setConfirmingCancel(true)}
                    className="flex-1 bg-brand-ink text-white text-sm font-medium py-3 rounded-full hover:bg-[#26262a] transition"
                  >
                    Gestionar suscripción
                  </button>
                  <button
                    onClick={logout}
                    className="text-sm font-medium text-red-600 px-4 py-3 rounded-full border border-red-100 hover:bg-red-50 transition"
                  >
                    Cerrar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-bold text-[#0B0B0C] text-[17px]">Plan Gratis</p>
                <p className="text-sm text-brand-gray-4 mt-0.5">Clientes ilimitados · hasta 12 leads</p>
              </div>
            </div>
            <p className="text-sm text-brand-gray-4 mb-4">
              Actualiza a Plan Pro ($539/mes) para desbloquear leads ilimitados y comisiones reducidas.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowUpgradeForm(true)}
                className="flex-1 bg-brand-ink text-white text-sm font-medium py-3 rounded-full hover:bg-[#26262a] transition"
              >
                Subir a Plan Pro
              </button>
              <button
                onClick={logout}
                className="text-sm font-medium text-red-600 px-4 py-3 rounded-full border border-red-100 hover:bg-red-50 transition"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}

        {billingError && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl mt-4">
            {billingError}
          </div>
        )}
      </div>

      {/* Freemium commission card */}
      {!isPaid && convertedCount >= 1 && (
        <div style={{ background: "#0d0d0d", borderRadius: 26, padding: 26, color: "#fff", position: "relative", overflow: "hidden", marginBottom: 16 }}>
          <div style={{ position: "absolute", top: -70, right: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(43,87,240,.45), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 999, padding: "6px 13px", width: "fit-content", marginBottom: 20, position: "relative" }}>
            <span style={{ fontWeight: 700, fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>Plan gratuito · acumulado</span>
          </div>
          <div style={{ fontWeight: 500, fontSize: 14, color: "rgba(255,255,255,.66)", position: "relative" }}>Te habrías ahorrado en total hasta ahora</div>
          <div style={{ marginTop: 4, marginBottom: 20, position: "relative" }}>
            <span style={{ fontWeight: 800, fontSize: 52, letterSpacing: "-.03em", color: "#fff", lineHeight: .95, display: "inline-block" }}>{formatCurrency(commissionDiff)}</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 12, position: "relative" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,.06)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontWeight: 500, fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.3 }}>Comisiones en plan Gratuito</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCurrency(freemiumCommission)}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,.06)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontWeight: 500, fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.3 }}>Comisiones en plan Pro</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4, color: "#9db4fb" }}>{formatCurrency(proCommission)}</div>
            </div>
          </div>
          <div style={{ fontWeight: 500, fontSize: 12.5, color: "rgba(255,255,255,.5)", marginBottom: 20, lineHeight: 1.5, position: "relative" }}>
            {netWithPro >= 0
              ? <>{`Con tus ${convertedCount} conversión${convertedCount !== 1 ? "es" : ""} ya pagarías tu membresía y tendrías `}<b style={{ color: "#fff" }}>{formatCurrency(netWithPro)}</b> extra neto.</>
              : <>{`Con tus ${convertedCount} conversión${convertedCount !== 1 ? "es" : ""} te faltan `}<b style={{ color: "#fff" }}>{formatCurrency(Math.abs(netWithPro))}</b> para cubrir tu membresía.</>}
          </div>
          <button
            onClick={() => setShowUpgradeForm(true)}
            style={{ width: "100%", border: "none", cursor: "pointer", background: "#fff", color: "#0d0d0d", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, padding: "15px 0", borderRadius: 999, position: "relative" }}
            className="hover:bg-white/90 active:scale-95 transition"
          >
            Actualizar a Pro · $539/mes
          </button>
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgradeForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(11,11,12,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => setShowUpgradeForm(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col"
            style={{ maxHeight: "calc(100dvh - 48px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-brand-border-1 flex-shrink-0">
              <div>
                <p className="font-bold text-[#0B0B0C] text-[17px]">Subir a Plan Pro</p>
                <p className="text-sm text-brand-gray-4 mt-0.5">$539 / mes · cancela cuando quieras</p>
              </div>
              <button
                onClick={() => setShowUpgradeForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-brand-surface transition text-brand-gray-4 flex-shrink-0"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="px-5 py-5 overflow-y-auto">
              <UpgradeCardForm onSuccess={handleUpgradeSuccess} onCancel={() => setShowUpgradeForm(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

