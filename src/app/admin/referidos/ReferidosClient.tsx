"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatCurrency, formatDate, formatNumberWithCommas } from "@/lib/utils";

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string | null;
  leadNotes: string | null;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  tierPosition: number;
  saleAmount: number | null;
  productType: string | null;
  interestProductType: string | null;
  caratulaUrl: string | null;
  caratulaStatus: string | null;
  rewardPaidAt: string | null;
  confirmedByReferrer: boolean;
  referrerConfirmedAt: string | null;
  billedAt: string | null;
  createdAt: string;
  referrer: { id: string; name: string; createdAt: string; launchBonusUsed: boolean; bubblePoints: number; clabe?: string | null; clabeBank?: string | null; clabeHolder?: string | null };
};

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
}

const statusLabel: Record<string, string> = {
  pending:    "Nuevo",
  contacted:  "Contactado",
  in_process: "En proceso",
  converted:  "Convertido",
  rejected:   "Rechazado",
};

const statusStyle: Record<string, string> = {
  pending:    "bg-[#F4F5F7] text-[#6B727D]",
  contacted:  "bg-[#EBF2FF] text-[#2563EB]",
  in_process: "bg-amber-50 text-amber-700",
  converted:  "bg-green-50 text-green-700",
  rejected:   "bg-[#F4F5F7] text-[#6B727D]",
};

const productShort: Record<string, string> = {
  "Daños/Auto": "Auto",
  GMM: "GMM",
  Vida: "Vida",
  PPR: "PPR",
  Otro: "Otro",
};

const COMMISSION_RATES: Record<string, { freemium: number; paid: number }> = {
  PPR:          { freemium: 0.0025, paid: 0.0015 },
  Vida:         { freemium: 0.0025, paid: 0.0015 },
  "Daños/Auto": { freemium: 0.015,  paid: 0.008  },
  GMM:          { freemium: 0.015,  paid: 0.008  },
  Otro:         { freemium: 0.015,  paid: 0.008  },
};
const MEMBERSHIP_COST = 539;

function matchesFilter(r: Referral, filter: string) {
  if (!filter) return true;
  if (filter === "en_proceso") return r.status === "contacted" || r.status === "in_process";
  return r.status === filter;
}

function countFilter(referrals: Referral[], filter: string) {
  if (!filter) return referrals.length;
  return referrals.filter((r) => matchesFilter(r, filter)).length;
}

const FILTER_OPTIONS = [
  { value: "",           label: "Todos" },
  { value: "pending",    label: "Nuevos" },
  { value: "en_proceso", label: "En proceso" },
  { value: "converted",  label: "Convertidos" },
  { value: "rejected",   label: "Rechazados" },
];

type ReferidosClientProps = {
  initialReferrals: Referral[];
  initialPlan: "freemium" | "paid";
  initialBubbleAutoPoints: number;
  initialBubbleGmmPoints: number;
  initialFirstTierAmount: number;
  initialCaratulaRequired: boolean;
};

export default function ReferidosClient({
  initialReferrals,
  initialPlan,
  initialBubbleAutoPoints,
  initialBubbleGmmPoints,
  initialFirstTierAmount,
  initialCaratulaRequired,
}: ReferidosClientProps) {
  const [referrals, setReferrals] = useState<Referral[]>(initialReferrals);
  const referralsRef = useRef<Referral[]>(initialReferrals);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [updating, setUpdating] = useState(false);
  const [convertTarget, setConvertTarget] = useState<{ id: string; name: string } | null>(null);
  const [saleInput, setSaleInput] = useState("");
  const [productType, setProductType] = useState("");
  const [caratulaFile, setCaratulaFile] = useState<File | null>(null);
  const [convertError, setConvertError] = useState("");
  const [payTarget, setPayTarget] = useState<{ id: string; referrerName: string; amount: number; clabe?: string | null; clabeBank?: string | null; clabeHolder?: string | null } | null>(null);
  const [copiedField, setCopiedField] = useState("");
  const [payNote, setPayNote] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [editingSale, setEditingSale] = useState(false);
  const [editSaleInput, setEditSaleInput] = useState("");
  const [bubblePointsByProduct, setBubblePointsByProduct] = useState({ autoPoints: initialBubbleAutoPoints, gmmPoints: initialBubbleGmmPoints });
  const [advisorPlan, setAdvisorPlan] = useState<"freemium" | "paid">(initialPlan);
  const [conversionUpsell, setConversionUpsell] = useState<{ freemiumCost: number; proCost: number; saved: number } | null>(null);

  function load() {
    setLoading(true);
    return fetch("/api/referrals")
      .then((r) => r.json())
      .then((d) => {
        const list: Referral[] = Array.isArray(d) ? d : [];
        setReferrals(list);
        referralsRef.current = list;
        setLoading(false);
        return list;
      });
  }

  async function update(id: string, data: Record<string, unknown>) {
    setUpdating(true);
    await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const list = await load();
    if (selected?.id === id) {
      const fresh = list.find((r) => r.id === id);
      if (fresh) setSelected(fresh);
    }
    setUpdating(false);
  }

  function startConvert(id: string, name: string, initialProductType?: string | null) {
    setSaleInput("");
    setProductType(initialProductType ?? "");
    setCaratulaFile(null);
    setConvertError("");
    setConvertTarget({ id, name });
  }

  function startPay(id: string, referrerName: string, amount: number, referrer?: Referral["referrer"]) {
    setPayNote("");
    setCopiedField("");
    setPayTarget({ id, referrerName, amount, clabe: referrer?.clabe, clabeBank: referrer?.clabeBank, clabeHolder: referrer?.clabeHolder });
  }

  function copyField(label: string, value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedField(label);
    setTimeout(() => setCopiedField(""), 1600);
  }

  async function deleteReferral(id: string) {
    const res = await fetch(`/api/referrals/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteError(body.error || "No se pudo eliminar el referido");
      return;
    }
    setDeleteId(null);
    setDeleteError("");
    setSelected(null);
    load();
  }

  async function confirmPay() {
    if (!payTarget) return;
    await update(payTarget.id, { rewardStatus: "paid", paymentNote: payNote || null });
    setPayTarget(null);
  }

  async function confirmConvert() {
    if (!convertTarget) return;
    const saleAmount = Number(saleInput.replace(/,/g, ""));
    if (!saleAmount) return;
    setConvertError("");

    // Con Blob habilitado, la carátula es obligatoria: se sube primero y la
    // conversión viaja con su evidencia.
    let caratulaUrl: string | undefined;
    if (initialCaratulaRequired) {
      if (!caratulaFile) {
        setConvertError("Sube la carátula de la póliza — es la evidencia del monto.");
        return;
      }
      setUpdating(true);
      const fd = new FormData();
      fd.append("file", caratulaFile);
      const up = await fetch("/api/referrals/caratula", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        setUpdating(false);
        setConvertError(upData.error ?? "No se pudo subir la carátula, intenta de nuevo");
        return;
      }
      caratulaUrl = upData.url;
    }

    const usedProduct = productType;
    await update(convertTarget.id, {
      status: "converted",
      rewardStatus: "approved",
      saleAmount,
      productType: productType || null,
      ...(caratulaUrl ? { caratulaUrl } : {}),
    });
    setConvertTarget(null);
    setProductType("");
    setCaratulaFile(null);
    if (advisorPlan === "freemium" && saleAmount && usedProduct) {
      const rates: Record<string, { freemium: number; paid: number }> = {
        PPR: { freemium: 0.0025, paid: 0.0015 },
        Vida: { freemium: 0.0025, paid: 0.0015 },
        "Daños/Auto": { freemium: 0.015, paid: 0.008 },
        GMM: { freemium: 0.015, paid: 0.008 },
        Otro: { freemium: 0.015, paid: 0.008 },
      };
      const r = rates[usedProduct];
      if (r) {
        const freemiumCost = Math.round(saleAmount * r.freemium);
        const proCost = Math.round(saleAmount * r.paid);
        setConversionUpsell({ freemiumCost, proCost, saved: freemiumCost - proCost });
        setTimeout(() => setConversionUpsell(null), 9000);
      }
    }
  }

  async function saveEditedSale() {
    if (!selected) return;
    const saleAmount = Number(editSaleInput.replace(/,/g, ""));
    if (!saleAmount) return;
    setUpdating(true);
    await fetch(`/api/referrals/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleAmount }),
    });
    setEditingSale(false);
    load();
    setSelected(null);
    setUpdating(false);
  }

  function openCalendar(r: Referral) {
    const title = encodeURIComponent(`Llamada con ${r.leadName} — ${r.leadPhone}`);
    const firstName = r.leadName.split(" ")[0];
    const detailLines = [
      `Referido de ${r.referrer.name} vía Referidoo.`,
      `Contacto: ${r.leadName} · ${r.leadPhone}${r.leadEmail ? ` · ${r.leadEmail}` : ""}`,
      `Objetivo: presentar el plan y la oferta que mejor le convenga a ${firstName}.`,
    ];
    if (r.leadNotes) detailLines.push(`Notas: ${r.leadNotes}`);
    const details = encodeURIComponent(detailLines.join("\n\n"));
    const emailParam = r.leadEmail ? `&add=${encodeURIComponent(r.leadEmail)}` : "";
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}${emailParam}`, "_blank");
  }

  function closeDrawer() {
    setSelected(null);
    setEditingSale(false);
    setDeleteId(null);
  }

  useEffect(() => {
    const openFirst = () => {
      const first = referralsRef.current[0];
      if (first) setSelected(first);
    };
    const closeModal = () => closeDrawer();
    window.addEventListener("referidoo:openFirstReferido", openFirst);
    window.addEventListener("referidoo:closeModal", closeModal);
    return () => {
      window.removeEventListener("referidoo:openFirstReferido", openFirst);
      window.removeEventListener("referidoo:closeModal", closeModal);
    };
  }, []);

  const now = new Date();
  const thisMonthConverted = referrals.filter(
    (r) =>
      r.status === "converted" &&
      new Date(r.createdAt).getMonth() === now.getMonth() &&
      new Date(r.createdAt).getFullYear() === now.getFullYear()
  ).length;

  const allConvertedList = referrals.filter(
    (r) => r.status === "converted" && r.saleAmount
  );
  const freemiumCommission = allConvertedList.reduce((sum, r) => {
    const rate = COMMISSION_RATES[r.productType ?? "Otro"];
    return sum + (rate ? Math.round(r.saleAmount! * rate.freemium) : 0);
  }, 0);
  const proCommission = allConvertedList.reduce((sum, r) => {
    const rate = COMMISSION_RATES[r.productType ?? "Otro"];
    return sum + (rate ? Math.round(r.saleAmount! * rate.paid) : 0);
  }, 0);
  const commissionDiff = freemiumCommission - proCommission;
  const netWithPro = commissionDiff - MEMBERSHIP_COST;
  const showFreemiumCard = advisorPlan !== "paid" && allConvertedList.length >= 1;

  const filtered = referrals.filter((r) => matchesFilter(r, filter));

  const FREEMIUM_LEAD_LIMIT = 12;
  const allLeadsSorted = [...referrals].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const lockedLeadIds = new Set<string>(
    advisorPlan === "freemium" && allLeadsSorted.length > FREEMIUM_LEAD_LIMIT
      ? allLeadsSorted.slice(FREEMIUM_LEAD_LIMIT).map((r) => r.id)
      : []
  );
  const lockedCount = lockedLeadIds.size;

  return (
    <div className="w-full">

      <div data-tour="header" className="mb-6">
        <h1 className="text-2xl font-bold text-brand-ink">Referidos</h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">
          {referrals.length} referidos en tu pipeline
          {thisMonthConverted > 0 && ` · ${thisMonthConverted} convertidos este mes`}
        </p>
      </div>

      {/* Filters */}
      <div data-tour="filtros" className="flex gap-2 flex-wrap mb-5">
        {FILTER_OPTIONS.map((opt) => {
          const count = countFilter(referrals, opt.value);
          if (opt.value === "rejected" && count === 0) return null;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                filter === opt.value
                  ? "bg-[#0B0B0C] text-white"
                  : "bg-white text-[#3F4651] border border-brand-border-4 hover:bg-brand-surface"
              }`}
            >
              {opt.label}{" · "}{count}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-brand-gray-4 text-sm">Sin referidos en esta categoría.</div>
      ) : (
        <div data-tour="lista-referidos" className="space-y-2">
          {(() => {
            const lockedOrder = [...lockedLeadIds];

            const renderCard = (r: Referral) => {
              const isLocked = lockedLeadIds.has(r.id);
              const lockIdx = isLocked ? lockedOrder.indexOf(r.id) : -1;
              const blurClass = lockIdx === 0 ? "blur-[3px]" : lockIdx === 1 ? "blur-[6px]" : "blur-[10px]";
              const dimClass  = lockIdx === 0 ? "opacity-90"  : lockIdx === 1 ? "opacity-70"  : "opacity-50";

              const isConverted = r.status === "converted";
              const isBubble = r.productType === "Daños/Auto" || r.productType === "GMM" || r.productType === "Otro";
              const noEscaleraReward = isConverted && r.tierPosition === 0;
              const rawProduct = isConverted ? r.productType : r.interestProductType;
              const displayProduct = rawProduct ? (productShort[rawProduct] ?? rawProduct) : null;

              let amountNode: React.ReactNode;
              if (isConverted) {
                if (noEscaleraReward && isBubble) {
                  const pts = r.productType === "GMM" ? bubblePointsByProduct.gmmPoints : bubblePointsByProduct.autoPoints;
                  amountNode = <span className="text-xs font-semibold text-blue-600">+{pts} pts</span>;
                } else if (!noEscaleraReward) {
                  amountNode = <span className="text-sm font-bold text-[#0B0B0C]">{formatCurrency(r.rewardAmount)}</span>;
                } else {
                  amountNode = <span className="text-sm text-brand-gray-4">—</span>;
                }
              } else {
                amountNode = <span className="text-sm text-brand-gray-4">—</span>;
              }

              return (
                <div
                  key={r.id}
                  className={`relative bg-white rounded-2xl border border-brand-border-1 overflow-hidden transition ${isLocked ? "cursor-default select-none" : "cursor-pointer hover:border-[#C8CDD5]"}`}
                  onClick={isLocked ? undefined : () => setSelected(r)}
                >
                  {/* Content — entirely inside one wrapper so blur covers everything */}
                  <div className={`flex items-center gap-3 px-4 py-3.5 ${isLocked ? `${blurClass} ${dimClass} pointer-events-none` : ""}`}>
                    <div className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[13px] font-semibold text-[#3F4651] flex-shrink-0">
                      {getInitials(r.leadName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0B0B0C] truncate">{r.leadName}</p>
                      <p className="text-xs text-brand-gray-4 truncate">Referido por {r.referrer.name}</p>
                    </div>
                    {displayProduct && (
                      <span className="hidden sm:inline-flex text-xs font-medium px-3 py-1 rounded-full border border-brand-border-4 text-[#3F4651] flex-shrink-0">
                        {displayProduct}
                      </span>
                    )}
                    <div className="text-right flex-shrink-0 min-w-[56px]">
                      {amountNode}
                      <p className="text-xs text-brand-gray-4">{shortDate(r.createdAt)}</p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle[r.status] ?? "bg-[#F4F5F7] text-[#6B727D]"}`}>
                      {statusLabel[r.status] ?? r.status}
                    </span>
                  </div>

                  {/* Lock overlay — centered, over the blurred content */}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center gap-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" className="text-[#3F4651]">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                      </svg>
                      <span className="text-xs font-semibold text-[#0B0B0C]">Lead bloqueado · Actualiza a Pro</span>
                    </div>
                  )}
                </div>
              );
            };

            const unlocked = filtered.filter((r) => !lockedLeadIds.has(r.id));
            const locked   = filtered.filter((r) =>  lockedLeadIds.has(r.id));

            return [...unlocked.map(renderCard), ...locked.map(renderCard)];
          })()}
        </div>
      )}

      {/* Freemium commission card */}
      {showFreemiumCard && (
        <div style={{ background: "#0d0d0d", borderRadius: 26, padding: 26, color: "#fff", position: "relative", overflow: "hidden", marginTop: 20 }}>
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
              ? <>{`Con tus ${allConvertedList.length} conversión${allConvertedList.length !== 1 ? "es" : ""} ya pagarías tu membresía y tendrías `}<b style={{ color: "#fff" }}>{formatCurrency(netWithPro)}</b> extra neto.</>
              : <>{`Con tus ${allConvertedList.length} conversión${allConvertedList.length !== 1 ? "es" : ""} te faltan `}<b style={{ color: "#fff" }}>{formatCurrency(Math.abs(netWithPro))}</b> para cubrir tu membresía.</>}
          </div>
          <Link
            href="/admin/perfil"
            style={{ display: "block", width: "100%", textAlign: "center", textDecoration: "none", background: "#fff", color: "#0d0d0d", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, padding: "15px 0", borderRadius: 999, position: "relative" }}
            className="hover:bg-white/90 active:scale-95 transition"
          >
            Actualizar a Pro · $539/mes
          </Link>
        </div>
      )}

      {/* ─── Convert modal ─── */}
      {convertTarget && (() => {
        const isPPRVida = productType === "PPR" || productType === "Vida";
        const valueLabel = isPPRVida ? "Valor plan" : productType ? "Prima" : "Valor contratado";
        return (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
            <div className="absolute inset-0 bg-black/25" onClick={() => setConvertTarget(null)} />
            <div className="relative bg-white w-full max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
              <h2 className="font-semibold mb-1">Marcar como convertido</h2>
              <p className="text-sm text-brand-gray-4 mb-5">{convertTarget.name}</p>
              <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">Producto contratado</label>
              <div className="flex flex-wrap gap-2 mb-5">
                {["PPR", "Vida", "Daños/Auto", "GMM", "Otro"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setProductType(type === productType ? "" : type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                      productType === type
                        ? "bg-brand-ink text-white border-brand-ink"
                        : "bg-white text-brand-gray-2 border-brand-border-4 hover:bg-brand-surface"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">{valueLabel}</label>
              <div className="relative mb-2">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-gray-4 text-sm font-medium">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={saleInput}
                  onChange={(e) => setSaleInput(formatNumberWithCommas(e.target.value))}
                  required
                  className="w-full pl-8 pr-4 py-3 border border-brand-border-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
                  autoFocus
                />
              </div>
              <p className="text-[11.5px] text-brand-gray-4 leading-snug mb-4">
                Usa el monto real de la carátula — define el premio de tu cliente y tu
                comisión. Referidoo valida muestras contra carátula de póliza.
              </p>
              {initialCaratulaRequired && (
                <div className="mb-5">
                  <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">
                    Carátula de la póliza (foto o PDF)
                  </label>
                  <label className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 cursor-pointer transition ${caratulaFile ? "border-brand-ink bg-brand-surface" : "border-brand-border-4 hover:border-brand-ink"}`}>
                    <span className={`text-sm truncate ${caratulaFile ? "text-brand-ink font-medium" : "text-brand-gray-4"}`}>
                      {caratulaFile ? caratulaFile.name : "Elegir archivo…"}
                    </span>
                    <span className="text-xs font-semibold text-[#2563EB] flex-shrink-0">{caratulaFile ? "Cambiar" : "Subir"}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                      className="hidden"
                      onChange={(e) => setCaratulaFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              )}
              {convertError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 mb-4">{convertError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmConvert}
                  disabled={updating}
                  className="flex-1 bg-brand-ink text-white text-sm py-3 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition"
                >
                  {updating ? "Guardando..." : "Confirmar conversión"}
                </button>
                <button onClick={() => setConvertTarget(null)} className="px-4 text-sm py-3 rounded-full border border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface transition">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── Pay modal ─── */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/25" onClick={() => setPayTarget(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
            <h2 className="font-semibold mb-1">Confirmar pago del premio</h2>
            <p className="text-sm text-brand-gray-4 mb-4">
              Confirma que enviaste <span className="font-semibold text-brand-ink">{formatCurrency(payTarget.amount)}</span> a {payTarget.referrerName}
            </p>
            {payTarget.clabe ? (
              <div className="bg-brand-surface rounded-xl p-4 mb-4">
                <p className="text-[10px] font-bold text-brand-gray-4 uppercase tracking-[0.08em] mb-2">
                  Datos para transferir{payTarget.clabeBank ? ` · ${payTarget.clabeBank}` : ""}
                </p>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-brand-ink tabular-nums tracking-wide">{payTarget.clabe}</span>
                  <button
                    onClick={() => copyField("clabe", payTarget.clabe!)}
                    className="text-xs font-semibold text-[#2563EB] bg-[#EBF2FF] px-2.5 py-1 rounded-full hover:bg-[#dbe7ff] transition flex-shrink-0"
                  >
                    {copiedField === "clabe" ? "Copiada ✓" : "Copiar CLABE"}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-brand-gray-3">
                    {payTarget.clabeHolder || payTarget.referrerName} · {formatCurrency(payTarget.amount)}
                  </span>
                  <button
                    onClick={() => copyField("monto", String(payTarget.amount))}
                    className="text-xs font-semibold text-brand-gray-2 bg-white border border-brand-border-4 px-2.5 py-1 rounded-full hover:border-brand-ink transition flex-shrink-0"
                  >
                    {copiedField === "monto" ? "Copiado ✓" : "Copiar monto"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-brand-gray-4 bg-brand-surface rounded-xl px-4 py-3 mb-4">
                {payTarget.referrerName} aún no guarda su CLABE en su portal — pídesela por
                WhatsApp o dile que la capture en su página (sección &ldquo;Datos para recibir tus premios&rdquo;).
              </p>
            )}
            <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">Referencia del pago (opcional)</label>
            <input
              type="text"
              placeholder="Ej. SPEI 12345 / Efectivo / CLIP"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              className="w-full px-4 py-3 border border-brand-border-4 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition mb-5"
              autoFocus
            />
            <p className="text-xs text-brand-gray-4 mb-5">
              Al confirmar, {payTarget.referrerName} recibirá un correo con el detalle del premio.
            </p>
            <div className="flex gap-2">
              <button onClick={confirmPay} disabled={updating} className="flex-1 bg-brand-ink text-white text-sm py-3 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition">
                {updating ? "Guardando..." : "Confirmar envío"}
              </button>
              <button onClick={() => setPayTarget(null)} className="px-4 text-sm py-3 rounded-full border border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detail drawer ─── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/25" onClick={closeDrawer} />
          <div data-tour="modal" className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">

            {/* Header */}
            <div className="flex items-start gap-4 px-6 pt-6 pb-4">
              <div className="w-14 h-14 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[17px] font-bold flex-shrink-0">
                {getInitials(selected.leadName)}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-bold text-[19px] text-[#0B0B0C] leading-snug">{selected.leadName}</h2>
                    {(selected.status === "converted" ? selected.productType : selected.interestProductType) && (
                      <span className="inline-flex mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-brand-border-4 text-[#3F4651]">
                        {selected.status === "converted" ? selected.productType : selected.interestProductType}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F4F5F7] text-[#6B727D] hover:bg-[#ECEDEF] transition text-xl leading-none flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs text-brand-gray-4 mt-1.5">Creado {shortDate(selected.createdAt)}</p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-5">

              {/* Contact rows */}
              <div className="space-y-2">
                <a
                  href={`tel:${selected.leadPhone}`}
                  className="flex items-center gap-3 bg-[#F4F5F7] rounded-xl px-4 py-3 hover:bg-[#ECEDEF] transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#6B727D] flex-shrink-0">
                    <path d="M6.62 10.79C8.06 13.62 10.38 15.93 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.94C17.55 15.31 18.76 15.51 20 15.51C20.55 15.51 21 15.96 21 16.51V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                  </svg>
                  <span className="text-sm font-medium text-[#0B0B0C]">{selected.leadPhone}</span>
                </a>
                {selected.leadEmail && (
                  <div className="flex items-center gap-3 bg-[#F4F5F7] rounded-xl px-4 py-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#6B727D] flex-shrink-0">
                      <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"/>
                    </svg>
                    <span className="text-sm font-medium text-[#0B0B0C]">{selected.leadEmail}</span>
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-brand-gray-4 mb-0.5">Referido por</p>
                  <p className="text-sm font-semibold text-[#0B0B0C]">{selected.referrer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gray-4 mb-0.5">Referido #</p>
                  <p className="text-sm font-semibold text-[#0B0B0C]">
                    {referrals
                      .filter((r) => r.referrer.id === selected.referrer.id)
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .findIndex((r) => r.id === selected.id) + 1}º de ese cliente
                  </p>
                </div>

                {selected.status === "converted" && (() => {
                  const isBubble = selected.productType === "Daños/Auto" || selected.productType === "GMM" || selected.productType === "Otro";
                  const noEscalera = selected.tierPosition === 0;
                  const pts = selected.productType === "GMM" ? bubblePointsByProduct.gmmPoints : bubblePointsByProduct.autoPoints;
                  return (
                    <>
                      <div>
                        <p className="text-xs text-brand-gray-4 mb-0.5">Premio al cliente</p>
                        {noEscalera && isBubble ? (
                          <p className="text-xl font-bold text-blue-600">+{pts} pts</p>
                        ) : noEscalera ? (
                          <p className="text-sm text-brand-gray-4">Sin premio en efectivo</p>
                        ) : (
                          <div>
                            <p className="text-xl font-bold text-[#0B0B0C]">{formatCurrency(selected.rewardAmount)}</p>
                            {selected.tierPosition === 1 && selected.rewardAmount > initialFirstTierAmount && (
                              <p className="text-[10px] font-semibold mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">★ Bono de inicio</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-brand-gray-4 mb-0.5">
                          {selected.productType ? "Producto y prima" : "Fecha"}
                        </p>
                        {selected.productType && selected.saleAmount ? (
                          <div>
                            {editingSale ? (
                              <div className="flex items-center gap-1.5">
                                <div className="relative flex-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-gray-4 text-xs">$</span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={editSaleInput}
                                    onChange={(e) => setEditSaleInput(formatNumberWithCommas(e.target.value))}
                                    className="w-full pl-5 pr-2 py-1.5 border border-brand-border-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink"
                                    autoFocus
                                  />
                                </div>
                                <button onClick={saveEditedSale} disabled={updating} className="text-xs px-2 py-1.5 bg-brand-ink text-white rounded-lg disabled:opacity-50">✓</button>
                                <button onClick={() => setEditingSale(false)} className="text-xs px-2 py-1.5 border border-brand-border-4 rounded-lg text-brand-gray-4">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-[#0B0B0C]">
                                  {selected.productType} · {formatCurrency(selected.saleAmount)}
                                  {(selected.productType === "Vida" || selected.productType === "PPR") ? "/año" : ""}
                                </p>
                                {selected.rewardStatus !== "paid" && (
                                  <button
                                    onClick={() => { setEditSaleInput(formatNumberWithCommas(String(selected.saleAmount))); setEditingSale(true); }}
                                    className="text-brand-gray-4 hover:text-brand-gray-2 transition flex-shrink-0"
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.45 4 3 4.45 3 5V20C3 20.55 3.45 21 4 21H19C19.55 21 20 20.55 20 20V13M18.5 2.5C19.33 1.67 20.67 1.67 21.5 2.5C22.33 3.33 22.33 4.67 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : selected.productType ? (
                          <p className="text-sm font-semibold text-[#0B0B0C]">{selected.productType}</p>
                        ) : (
                          <p className="text-sm text-[#0B0B0C]">{formatDate(selected.createdAt)}</p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Verificación de carátula (IA): monto + producto vs lo reportado */}
              {selected.status === "converted" && selected.caratulaUrl && (() => {
                const s = selected.caratulaStatus;
                const cfg =
                  s === "validada"
                    ? { bg: "bg-green-50", border: "border-green-200", text: "text-green-800", icon: "✓", title: "Carátula validada", body: "El monto y el producto coinciden con la póliza." }
                    : s === "discrepancia"
                    ? { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-800", icon: "⚠️", title: "Revisar carátula", body: "La póliza no coincide con el producto o el monto que reportaste. Corrige el dato o vuelve a subir la carátula correcta." }
                    : { bg: "bg-[#F4F5F7]", border: "border-brand-border-1", text: "text-brand-gray-2", icon: "⏳", title: "Carátula en revisión", body: "Estamos verificando la póliza contra lo que reportaste. Vuelve a abrir el referido en un momento." };
                return (
                  <div className={`rounded-xl border ${cfg.bg} ${cfg.border} px-4 py-3`}>
                    <p className={`text-sm font-semibold ${cfg.text} flex items-center gap-1.5`}>
                      <span>{cfg.icon}</span> {cfg.title}
                    </p>
                    <p className={`text-xs ${cfg.text} opacity-90 mt-1 leading-relaxed`}>{cfg.body}</p>
                  </div>
                );
              })()}

              {/* Interés del lead */}
              {(selected.status === "contacted" || selected.status === "in_process") && (
                <div>
                  <p className="text-xs font-medium text-[#6B727D] mb-2.5">¿En qué está interesado?</p>
                  <div className="flex flex-wrap gap-2">
                    {["PPR", "Vida", "Daños/Auto", "GMM", "Otro"].map((type) => (
                      <button
                        key={type}
                        disabled={updating}
                        onClick={() =>
                          update(selected.id, {
                            interestProductType: selected.interestProductType === type ? null : type,
                          })
                        }
                        className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                          selected.interestProductType === type
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-white border-[#DADCE0] text-[#3F4651] hover:bg-[#F4F5F7]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado del lead */}
              <div>
                <p className="text-xs font-medium text-[#6B727D] mb-2.5">Estado del lead</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "pending",    label: "Nuevo" },
                    { value: "contacted",  label: "Contactado" },
                    { value: "in_process", label: "En proceso" },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      disabled={updating}
                      onClick={() => update(selected.id, { status: value })}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                        selected.status === value
                          ? "bg-[#0B0B0C] text-white border-[#0B0B0C]"
                          : "bg-white border-[#DADCE0] text-[#3F4651] hover:bg-[#F4F5F7]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    disabled={updating}
                    onClick={() => {
                      if (selected.status !== "converted") {
                        closeDrawer();
                        startConvert(selected.id, selected.leadName, selected.interestProductType);
                      }
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                      selected.status === "converted"
                        ? "bg-[#2563EB] text-white border-[#2563EB]"
                        : "bg-white border-[#DADCE0] text-[#3F4651] hover:bg-[#F4F5F7]"
                    }`}
                  >
                    Convertido
                  </button>
                  <button
                    disabled={updating}
                    onClick={() => update(selected.id, { status: "rejected" })}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                      selected.status === "rejected"
                        ? "bg-[#0B0B0C] text-white border-[#0B0B0C]"
                        : "bg-white border-[#DADCE0] text-[#3F4651] hover:bg-[#F4F5F7]"
                    }`}
                  >
                    Rechazado
                  </button>
                </div>
              </div>

              {/* Estado del premio */}
              {selected.status === "converted" && selected.tierPosition > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#6B727D] mb-2.5">Estado del premio</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "pending",  label: "Sin aprobar" },
                      { value: "approved", label: "Aprobado" },
                      { value: "paid",     label: "Pagado" },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        disabled={updating}
                        onClick={() => {
                          if (value === "paid" && selected.rewardStatus !== "paid") {
                            closeDrawer();
                            startPay(selected.id, selected.referrer.name, selected.rewardAmount, selected.referrer);
                          } else {
                            update(selected.id, { rewardStatus: value });
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                          selected.rewardStatus === value
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-white border-[#DADCE0] text-[#3F4651] hover:bg-[#F4F5F7]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                    {selected.confirmedByReferrer && (
                      <span className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border border-blue-200 text-blue-600 bg-blue-50 select-none">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Confirmado
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Bubble pts info (non-escalera conversions) */}
              {selected.status === "converted" &&
               selected.tierPosition === 0 &&
               (selected.productType === "Daños/Auto" || selected.productType === "GMM" || selected.productType === "Otro") && (
                <div className="bg-blue-50 rounded-xl px-4 py-3 text-sm text-blue-700">
                  <span className="font-semibold">
                    +{selected.productType === "GMM" ? bubblePointsByProduct.gmmPoints : bubblePointsByProduct.autoPoints} pts burbuja
                  </span>{" "}
                  sumados a {selected.referrer.name} · acumulado: {selected.referrer.bubblePoints} pts
                </div>
              )}

              {/* Bottom action buttons */}
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${selected.leadPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white text-sm py-3 rounded-full font-semibold hover:bg-[#22C55E] transition"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a
                  href={`tel:${selected.leadPhone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-white text-[#0B0B0C] text-sm py-3 rounded-full font-medium border border-[#DADCE0] hover:bg-[#F4F5F7] transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79C8.06 13.62 10.38 15.93 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.94C17.55 15.31 18.76 15.51 20 15.51C20.55 15.51 21 15.96 21 16.51V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z"/>
                  </svg>
                  Llamar
                </a>
                <button
                  onClick={() => openCalendar(selected)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#0B0B0C] text-white text-sm py-3 rounded-full font-semibold hover:bg-[#26262a] transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Agendar
                </button>
              </div>

              {/* Notes */}
              {selected.leadNotes && (
                <div className="bg-[#F4F5F7] rounded-xl px-4 py-3">
                  <p className="text-xs text-brand-gray-4 mb-1">Notas</p>
                  <p className="text-sm text-[#0B0B0C]">{selected.leadNotes}</p>
                </div>
              )}

              {/* Delete */}
              <div className="pt-2 border-t border-brand-border-1">
                {selected.rewardStatus === "approved" || selected.rewardStatus === "paid" || selected.billedAt ? (
                  <p className="text-xs text-brand-gray-4">
                    Este referido ya tiene un premio aprobado o pagado (o una comisión facturada) — no se puede eliminar.
                  </p>
                ) : deleteId === selected.id ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-brand-gray-4 flex-1">¿Eliminar este referido?</p>
                      <button onClick={() => deleteReferral(selected.id)} className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition font-medium">Eliminar</button>
                      <button onClick={() => { setDeleteId(null); setDeleteError(""); }} className="text-xs text-brand-gray-4 hover:text-brand-gray-2 transition">Cancelar</button>
                    </div>
                    {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
                  </div>
                ) : (
                  <button onClick={() => setDeleteId(selected.id)} className="text-xs text-brand-gray-4 hover:text-red-500 transition">
                    Eliminar referido
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Conversion upsell toast (freemium) ─── */}
      {conversionUpsell && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <div className="bg-[#0B0B0C] text-white rounded-2xl px-5 py-4 shadow-2xl relative">
            <button
              onClick={() => setConversionUpsell(null)}
              className="absolute top-3 right-4 text-white/40 hover:text-white text-xl leading-none transition"
            >×</button>
            <p className="text-sm font-semibold mb-1.5">¡Conversión registrada!</p>
            <p className="text-xs text-white/70 leading-relaxed">
              Comisión en plan gratuito:{" "}
              <span className="text-white font-semibold">{formatCurrency(conversionUpsell.freemiumCost)}</span>
              {"  ·  "}Con Pro hubiera sido:{" "}
              <span className="text-green-400 font-semibold">{formatCurrency(conversionUpsell.proCost)}</span>
            </p>
            <p className="text-xs text-amber-400 font-semibold mt-1.5">
              Pagaste {formatCurrency(conversionUpsell.saved)} extra por estar en plan gratuito.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}



