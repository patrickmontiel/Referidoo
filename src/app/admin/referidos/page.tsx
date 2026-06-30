"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatNumberWithCommas, getRewardStatusLabel } from "@/lib/utils";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="header"]',
    title: "Tu pipeline de referidos",
    body: "Cada persona que alguien te mandó aparece aquí. Tú llevas el control: contactas, conviertes, pagas el premio.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="filters"]',
    title: "Filtra por etapa",
    body: "Ve solo los nuevos, los que ya contactaste, o los que ya cerraron. Útil cuando tienes varios en proceso al mismo tiempo.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="list"]',
    title: "Tarjetas de leads",
    body: "Cada tarjeta muestra el nombre, quién lo refirió, el producto, la fecha y el estado. Haz clic en cualquiera para cambiar el estado o enviar el premio.",
    placement: "top",
  },
];

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
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function shortDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
}

const FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Nuevos" },
  { value: "contacted", label: "En proceso" },
  { value: "converted", label: "Convertidos" },
  { value: "rejected", label: "Rechazados" },
];

const statusStyle: Record<string, string> = {
  pending:   "bg-[#F4F5F7] text-[#6B727D]",
  contacted: "bg-amber-50 text-amber-700",
  converted: "bg-green-50 text-green-700",
  rejected:  "bg-[#F4F5F7] text-[#6B727D]",
};

const statusLabel: Record<string, string> = {
  pending:   "Nuevo",
  contacted: "En proceso",
  converted: "Convertido",
  rejected:  "Rechazado",
};

const productShort: Record<string, string> = {
  "Daños/Auto": "Auto",
  GMM: "GMM",
  Vida: "Vida",
  PPR: "PPR",
  Otro: "Otro",
};

const rewardBg: Record<string, string> = {
  pending:  "bg-brand-border-1 text-brand-gray-4",
  approved: "bg-amber-50 text-amber-700",
  paid:     "bg-green-50 text-green-700",
};

export default function ReferidosPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [updating, setUpdating] = useState(false);
  const [convertTarget, setConvertTarget] = useState<{ id: string; name: string } | null>(null);
  const [saleInput, setSaleInput] = useState("");
  const [productType, setProductType] = useState("");
  const [payTarget, setPayTarget] = useState<{ id: string; referrerName: string; amount: number } | null>(null);
  const [payNote, setPayNote] = useState("");
  const [showTour, setShowTour] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState(false);
  const [editSaleInput, setEditSaleInput] = useState("");
  const [editingProductType, setEditingProductType] = useState(false);
  const [bubblePointsByProduct, setBubblePointsByProduct] = useState({ autoPoints: 150, gmmPoints: 300 });

  function load() {
    setLoading(true);
    return fetch("/api/referrals")
      .then((r) => r.json())
      .then((d) => {
        const list: Referral[] = Array.isArray(d) ? d : [];
        setReferrals(list);
        setLoading(false);
        return list;
      });
  }

  useEffect(() => {
    load();
    fetch("/api/bubble-settings")
      .then((r) => r.json())
      .then((d) => setBubblePointsByProduct({ autoPoints: d.bubbleAutoPoints ?? 150, gmmPoints: d.bubbleGmmPoints ?? 300 }));
    const handler = () => setShowTour(true);
    window.addEventListener("referidoo:tour", handler);
    return () => window.removeEventListener("referidoo:tour", handler);
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

  function startConvert(id: string, name: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    setSaleInput("");
    setProductType("");
    setConvertTarget({ id, name });
  }

  function startPay(id: string, referrerName: string, amount: number, e?: React.MouseEvent) {
    e?.stopPropagation();
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
      `Objetivo: presentar el plan de vida/retiro y la oferta que mejor le convenga a ${firstName}.`,
    ];
    if (r.leadNotes) detailLines.push(`Notas: ${r.leadNotes}`);
    const details = encodeURIComponent(detailLines.join("\n\n"));
    const emailParam = r.leadEmail ? `&add=${encodeURIComponent(r.leadEmail)}` : "";
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}${emailParam}`, "_blank");
  }

  const now = new Date();
  const thisMonthConverted = referrals.filter(
    (r) => r.status === "converted" &&
    new Date(r.createdAt).getMonth() === now.getMonth() &&
    new Date(r.createdAt).getFullYear() === now.getFullYear()
  ).length;

  const filtered = referrals.filter((r) => !filter || r.status === filter);

  return (
    <div className="max-w-2xl">
      {showTour && <Tour steps={TOUR_STEPS} onDone={() => setShowTour(false)} />}

      <div data-tour="header" className="mb-6">
        <h1 className="text-2xl font-bold text-brand-ink">Referidos</h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">
          {referrals.length} referidos en tu pipeline
          {thisMonthConverted > 0 && ` · ${thisMonthConverted} convertidos este mes`}
        </p>
      </div>

      {/* Filters */}
      <div data-tour="filters" className="flex gap-2 flex-wrap mb-5">
        {FILTER_OPTIONS.map((opt) => {
          const count = opt.value ? referrals.filter((r) => r.status === opt.value).length : referrals.length;
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
        <div data-tour="list" className="space-y-2">
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
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[13px] font-semibold text-[#3F4651] flex-shrink-0">
                  {getInitials(r.leadName)}
                </div>

                {/* Name + referrer */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0B0B0C] truncate">{r.leadName}</p>
                  <p className="text-xs text-brand-gray-4 truncate">Referido por {r.referrer.name}</p>
                </div>

                {/* Product pill */}
                {displayProduct && (
                  <span className="hidden sm:inline-flex text-xs font-medium px-3 py-1 rounded-full border border-brand-border-4 text-[#3F4651] flex-shrink-0">
                    {displayProduct}
                  </span>
                )}

                {/* Amount + date */}
                <div className="text-right flex-shrink-0 min-w-[56px]">
                  {amountNode}
                  <p className="text-xs text-brand-gray-4">{shortDate(r.createdAt)}</p>
                </div>

                {/* Status */}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle[r.status] ?? "bg-[#F4F5F7] text-[#6B727D]"}`}>
                  {statusLabel[r.status] ?? r.status}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Convert modal */}
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

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/25" onClick={() => setPayTarget(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
            <h2 className="font-semibold mb-1">Enviar premio</h2>
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
              Al confirmar, {payTarget.referrerName} recibirá un correo con el detalle del premio y un botón para confirmar recibo.
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

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/25" onClick={() => { setSelected(null); setEditingSale(false); setEditingProductType(false); }} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Detalle del referido</h2>
              <button
                onClick={() => { setSelected(null); setEditingSale(false); setEditingProductType(false); }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-border-1 text-brand-gray-4 hover:bg-brand-border-4 transition"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-brand-gray-4 mb-1">Lead</p>
                <p className="font-medium">{selected.leadName}</p>
                <p className="text-sm text-brand-gray-4">{selected.leadPhone}</p>
                {selected.leadEmail && <p className="text-sm text-brand-gray-4">{selected.leadEmail}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-brand-gray-4 mb-1">Referido por</p>
                  <p className="text-sm font-medium">{selected.referrer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-brand-gray-4 mb-1">Referido #</p>
                  <p className="text-sm font-medium">
                    {referrals
                      .filter((r) => r.referrer.id === selected.referrer.id)
                      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                      .findIndex((r) => r.id === selected.id) + 1}º de ese cliente
                  </p>
                </div>
                {selected.status === "converted" ? (
                  <>
                    <div>
                      <p className="text-xs text-brand-gray-4 mb-1">Premio al cliente</p>
                      {selected.tierPosition === 0 ? (
                        selected.productType === "Daños/Auto" || selected.productType === "GMM" || selected.productType === "Otro" ? (
                          <div>
                            <p className="text-sm font-semibold text-blue-600">
                              +{selected.productType === "GMM" ? bubblePointsByProduct.gmmPoints : bubblePointsByProduct.autoPoints} pts
                            </p>
                            <p className="text-[10px] text-blue-500 font-medium">
                              Sumó esto a premios burbuja · acumulado: {selected.referrer.bubblePoints} pts
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-semibold text-brand-gray-4">—</p>
                            <p className="text-[10px] text-brand-gray-4">Sin premio en efectivo</p>
                          </div>
                        )
                      ) : (
                        <div>
                          <p className="text-sm font-semibold">{formatCurrency(selected.rewardAmount)}</p>
                          {selected.tierPosition === 1 && selected.referrer.launchBonusUsed && (
                            <p className="text-[10px] text-amber-600 font-medium">⚡ Incluye bono de lanzamiento</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      {selected.saleAmount ? (
                        <>
                          <div className="flex items-center gap-1 mb-1">
                            <p className="text-xs text-brand-gray-4">{selected.productType ?? "Valor del plan"}</p>
                            {selected.rewardStatus !== "paid" && (
                              <button onClick={() => setEditingProductType((v) => !v)} className="text-brand-gray-4 hover:text-brand-gray-1 transition" title="Editar producto">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            )}
                          </div>
                          {editingSale ? (
                            <div className="flex items-center gap-1.5">
                              <div className="relative flex-1">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-brand-gray-4 text-xs">$</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editSaleInput}
                                  onChange={(e) => setEditSaleInput(formatNumberWithCommas(e.target.value))}
                                  className="w-full pl-5 pr-2 py-1.5 border border-brand-border-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
                                  autoFocus
                                />
                              </div>
                              <button onClick={saveEditedSale} disabled={updating} className="text-xs px-2 py-1.5 bg-brand-ink text-white rounded-lg disabled:opacity-50">✓</button>
                              <button onClick={() => setEditingSale(false)} className="text-xs px-2 py-1.5 border border-brand-border-4 rounded-lg text-brand-gray-4">✕</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold text-green-700">{formatCurrency(selected.saleAmount)}</p>
                              <button onClick={() => { setEditSaleInput(formatNumberWithCommas(String(selected.saleAmount))); setEditingSale(true); }} className="text-brand-gray-4 hover:text-brand-gray-1 transition" title="Editar valor">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div>
                          <p className="text-xs text-brand-gray-4 mb-1">Fecha</p>
                          <p className="text-sm">{formatDate(selected.createdAt)}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <p className="text-xs text-brand-gray-4 mb-1">Fecha</p>
                    <p className="text-sm">{formatDate(selected.createdAt)}</p>
                  </div>
                )}
              </div>

              {selected.status === "converted" && selected.rewardStatus !== "paid" && editingProductType && (
                <div>
                  <p className="text-xs text-brand-gray-4 mb-2">Producto contratado</p>
                  <div className="flex gap-2 flex-wrap">
                    {["PPR", "Vida", "Daños/Auto", "GMM", "Otro"].map((type) => (
                      <button
                        key={type}
                        disabled={updating}
                        onClick={() => { setEditingProductType(false); if (type !== selected.productType) update(selected.id, { productType: type }); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          selected.productType === type
                            ? "bg-brand-ink text-white border-brand-ink"
                            : "bg-white border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected.status !== "converted" && (
                <div>
                  <p className="text-xs text-brand-gray-4 mb-2">Interesado en</p>
                  <div className="flex gap-2 flex-wrap">
                    {["Daños/Auto", "GMM", "Vida", "PPR", "Otro"].map((type) => (
                      <button
                        key={type}
                        disabled={updating}
                        onClick={() => update(selected.id, { interestProductType: type === selected.interestProductType ? null : type })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          selected.interestProductType === type
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-white border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs text-brand-gray-4 mb-2">Estado del lead</p>
                <div className="flex gap-2 flex-wrap">
                  {(["pending", "contacted", "rejected"] as const).map((s) => (
                    <button
                      key={s}
                      disabled={updating}
                      onClick={() => update(selected.id, { status: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        selected.status === s
                          ? "bg-brand-ink text-white border-brand-ink"
                          : "bg-white border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface"
                      }`}
                    >
                      {statusLabel[s] ?? s}
                    </button>
                  ))}
                  <button
                    disabled={updating}
                    onClick={() => { setSelected(null); startConvert(selected.id, selected.leadName); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                      selected.status === "converted"
                        ? "bg-brand-ink text-white border-brand-ink"
                        : "bg-white border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface"
                    }`}
                  >
                    Convertido
                  </button>
                </div>
              </div>

              {selected.status === "converted" && selected.tierPosition > 0 && (
                <div>
                  <p className="text-xs text-brand-gray-4 mb-2">Estado del premio</p>
                  <div className="flex gap-2 flex-wrap">
                    {["pending", "approved", "paid"].map((s) => (
                      <button
                        key={s}
                        disabled={updating}
                        onClick={() => update(selected.id, { rewardStatus: s })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                          selected.rewardStatus === s
                            ? "bg-brand-ink text-white border-brand-ink"
                            : "bg-white border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface"
                        }`}
                      >
                        {getRewardStatusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selected.status === "converted" && selected.rewardStatus === "approved" && selected.tierPosition > 0 && (
                <button
                  onClick={() => { setSelected(null); startPay(selected.id, selected.referrer.name, selected.rewardAmount); }}
                  className="w-full bg-brand-ink text-white text-sm py-3 rounded-full font-medium hover:bg-[#26262a] transition"
                >
                  Enviar premio →
                </button>
              )}

              {selected.status === "converted" && selected.rewardStatus === "paid" && selected.tierPosition > 0 && (
                <div className={`text-center text-xs px-3 py-2 rounded-full font-medium ${
                  selected.confirmedByReferrer
                    ? "bg-green-50 text-green-700"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  {selected.confirmedByReferrer ? "✓ Premio confirmado por el cliente" : "Premio enviado · pendiente de confirmar"}
                </div>
              )}

              <div className="flex gap-2">
                <a
                  href={`tel:${selected.leadPhone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-border-1 text-brand-gray-1 text-sm py-3 rounded-full font-medium hover:bg-brand-border-4 transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6.62 10.79C8.06 13.62 10.38 15.93 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.94C17.55 15.31 18.76 15.51 20 15.51C20.55 15.51 21 15.96 21 16.51V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" fill="currentColor"/></svg>
                  Llamar
                </a>
                <button
                  onClick={() => openCalendar(selected)}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-ink text-white text-sm py-3 rounded-full font-medium hover:bg-[#26262a] transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Agendar
                </button>
              </div>

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
