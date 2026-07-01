"use client";

import { useEffect, useRef, useState } from "react";
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
  rewardPaidAt: string | null;
  confirmedByReferrer: boolean;
  referrerConfirmedAt: string | null;
  createdAt: string;
  referrer: { id: string; name: string; createdAt: string; launchBonusUsed: boolean; bubblePoints: number };
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

export default function ReferidosPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const referralsRef = useRef<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [updating, setUpdating] = useState(false);
  const [convertTarget, setConvertTarget] = useState<{ id: string; name: string } | null>(null);
  const [saleInput, setSaleInput] = useState("");
  const [productType, setProductType] = useState("");
  const [payTarget, setPayTarget] = useState<{ id: string; referrerName: string; amount: number } | null>(null);
  const [payNote, setPayNote] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState(false);
  const [editSaleInput, setEditSaleInput] = useState("");
  const [bubblePointsByProduct, setBubblePointsByProduct] = useState({ autoPoints: 150, gmmPoints: 300 });

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

  useEffect(() => {
    load();
    fetch("/api/bubble-settings")
      .then((r) => r.json())
      .then((d) => setBubblePointsByProduct({ autoPoints: d.bubbleAutoPoints ?? 150, gmmPoints: d.bubbleGmmPoints ?? 300 }));
  }, []);

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

  function startConvert(id: string, name: string) {
    setSaleInput("");
    setProductType("");
    setConvertTarget({ id, name });
  }

  function startPay(id: string, referrerName: string, amount: number) {
    setPayNote("");
    setPayTarget({ id, referrerName, amount });
  }

  async function deleteReferral(id: string) {
    await fetch(`/api/referrals/${id}`, { method: "DELETE" });
    setDeleteId(null);
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
    await update(convertTarget.id, { status: "converted", rewardStatus: "approved", saleAmount, productType: productType || null });
    setConvertTarget(null);
    setProductType("");
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

  const filtered = referrals.filter((r) => matchesFilter(r, filter));

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
          {filtered.map((r) => {
            const isConverted = r.status === "converted";
            const isBubble = r.productType === "Daños/Auto" || r.productType === "GMM" || r.productType === "Otro";
            const noEscaleraReward = isConverted && r.tierPosition === 0;
            const displayProduct = r.productType
              ? (productShort[r.productType] ?? r.productType)
              : r.interestProductType
              ? (productShort[r.interestProductType] ?? r.interestProductType)
              : null;

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
                className="bg-white rounded-2xl border border-brand-border-1 px-4 py-3.5 cursor-pointer hover:border-[#C8CDD5] transition flex items-center gap-3"
                onClick={() => setSelected(r)}
              >
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
            );
          })}
        </div>
      )}

      {/* ─── Convert modal ─── */}
      {convertTarget && (() => {
        const isPPRVida = productType === "PPR" || productType === "Vida";
        const valueLabel = isPPRVida ? "Valor del plan (prima anual)" : productType ? "Prima" : "Valor contratado";
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
              <div className="relative mb-5">
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
            <p className="text-sm text-brand-gray-4 mb-5">
              Confirma que enviaste <span className="font-semibold text-brand-ink">{formatCurrency(payTarget.amount)}</span> a {payTarget.referrerName}
            </p>
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
                    {(selected.productType || selected.interestProductType) && (
                      <span className="inline-flex mt-1 text-xs font-medium px-2.5 py-0.5 rounded-full border border-brand-border-4 text-[#3F4651]">
                        {selected.productType ?? selected.interestProductType}
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
                            {selected.referrer.launchBonusUsed && selected.tierPosition === 1 && (
                              <p className="text-[10px] text-amber-600 font-medium mt-0.5">⚡ Incluye bono de lanzamiento</p>
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
                        startConvert(selected.id, selected.leadName);
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
                            startPay(selected.id, selected.referrer.name, selected.rewardAmount);
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
                {deleteId === selected.id ? (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-brand-gray-4 flex-1">¿Eliminar este referido?</p>
                    <button onClick={() => deleteReferral(selected.id)} className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition font-medium">Eliminar</button>
                    <button onClick={() => setDeleteId(null)} className="text-xs text-brand-gray-4 hover:text-brand-gray-2 transition">Cancelar</button>
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
    </div>
  );
}



