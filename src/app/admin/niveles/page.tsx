"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatNumberWithCommas } from "@/lib/utils";

type Tier = { amount: number; label: string };

type BubbleClaim = {
  id: string;
  amount: number;
  status: string;
  paymentNote: string | null;
  createdAt: string;
  paidAt: string | null;
  client: { name: string; phone: string | null };
};

function PillCurrencyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center bg-[#F4F5F7] rounded-full px-3 py-1.5 gap-0.5">
      <span className="text-[#8A8F98] text-sm select-none">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatNumberWithCommas(String(value))}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        className="bg-transparent text-sm font-semibold w-16 focus:outline-none text-[#0B0B0C] text-right"
      />
    </div>
  );
}

function PillPointsInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center bg-[#F4F5F7] rounded-full px-3 py-1.5 gap-1">
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        className="bg-transparent text-sm font-semibold w-10 focus:outline-none text-[#0B0B0C] text-right"
      />
      <span className="text-[#8A8F98] text-sm select-none">pts</span>
    </div>
  );
}

export default function PremiosPage() {
  const [tiers, setTiers] = useState<Tier[]>([
    { amount: 1500, label: "" },
    { amount: 1500, label: "" },
    { amount: 3500, label: "¡Bono especial!" },
  ]);
  const [afterLastTier, setAfterLastTier] = useState("cycle");
  const [flatAmount, setFlatAmount] = useState(1500);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [claims, setClaims] = useState<BubbleClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [payTarget, setPayTarget] = useState<BubbleClaim | null>(null);
  const [payNote, setPayNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const [bubbleAutoPoints, setBubbleAutoPoints] = useState(150);
  const [bubbleGmmPoints, setBubbleGmmPoints] = useState(300);
  const [bubbleClaimThreshold, setBubbleClaimThreshold] = useState(500);

  useEffect(() => {
    fetch("/api/tiers")
      .then((r) => r.json())
      .then(({ tiers: t, settings: s }) => {
        if (t && t.length > 0) {
          setTiers(t.map((x: { amount: number; label: string | null }) => ({ amount: x.amount, label: x.label ?? "" })));
        }
        if (s) {
          setAfterLastTier(s.afterLastTier ?? "cycle");
          setFlatAmount(s.flatAmount ?? 1500);
          setWhatsappMessage(s.whatsappMessage ?? "");
          setWelcomeMessage(s.welcomeMessage ?? "");
        }
        setLoadingTiers(false);
      });
  }, []);

  function loadClaims() {
    setLoadingClaims(true);
    fetch("/api/bubble-claims")
      .then((r) => r.json())
      .then((d) => {
        setClaims(Array.isArray(d.claims) ? d.claims : []);
        setLoadingClaims(false);
      });
  }

  useEffect(() => {
    loadClaims();
    fetch("/api/bubble-settings")
      .then((r) => r.json())
      .then((d) => {
        setBubbleAutoPoints(d.bubbleAutoPoints ?? 150);
        setBubbleGmmPoints(d.bubbleGmmPoints ?? 300);
        setBubbleClaimThreshold(d.bubbleClaimThreshold ?? 500);
      });
  }, []);

  function addTier() {
    setTiers([...tiers, { amount: 1500, label: "" }]);
  }

  function removeTier(i: number) {
    if (tiers.length <= 1) return;
    setTiers(tiers.filter((_, idx) => idx !== i));
  }

  function updateTier(i: number, field: "amount" | "label", val: string | number) {
    setTiers(tiers.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  }

  async function saveAll() {
    setSaving(true);
    await Promise.all([
      fetch("/api/tiers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tiers, afterLastTier, flatAmount, whatsappMessage, welcomeMessage }),
      }),
      fetch("/api/bubble-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bubbleAutoPoints, bubbleGmmPoints, bubbleClaimThreshold }),
      }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function confirmPay() {
    if (!payTarget) return;
    setUpdating(true);
    await fetch(`/api/bubble-claims/${payTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid", paymentNote: payNote || null }),
    });
    setUpdating(false);
    setPayTarget(null);
    setPayNote("");
    loadClaims();
  }

  const pendingClaims = claims.filter((c) => c.status === "pending");
  const paidClaims = claims.filter((c) => c.status === "paid");

  const now = new Date();
  const paidThisMonth = paidClaims
    .filter((c) => {
      if (!c.paidAt) return false;
      const d = new Date(c.paidAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, c) => s + c.amount, 0);
  const pendingTotal = pendingClaims.reduce((s, c) => s + c.amount, 0);

  const ordinalLabel = (i: number) =>
    i === 0 ? "1er referido convertido" : i === 1 ? "2do referido convertido" : `${i + 1}er referido convertido`;

  if (loadingTiers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brand-ink">Premios</h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">
          Configura los montos una vez. Referidoo hace las cuentas para siempre.
        </p>
      </div>

      {/* ESCALERA */}
      <div data-tour="premios" className="bg-white rounded-2xl border border-brand-border-1 p-6 mb-4">
        <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-0.5">Vida y PPR</p>
        <h2 className="font-bold text-[18px] text-[#0B0B0C] mb-1">Escalera de premios</h2>
        <p className="text-xs text-brand-gray-4 mb-5">
          Cada venta sube un nivel. Define el monto de cada escalón.
        </p>

        <div className="mb-4">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className="flex items-center gap-3 py-3 border-b border-[#F4F5F7] last:border-0"
            >
              <span className="w-6 h-6 rounded-full bg-[#0B0B0C] text-white text-xs flex items-center justify-center flex-shrink-0 font-semibold">
                {i + 1}
              </span>
              <input
                type="text"
                value={tier.label}
                onChange={(e) => updateTier(i, "label", e.target.value)}
                placeholder={ordinalLabel(i)}
                className="flex-1 text-sm text-[#3F4651] bg-transparent focus:outline-none placeholder:text-[#3F4651] min-w-0"
              />
              <div className="flex items-center gap-2 flex-shrink-0">
                <PillCurrencyInput value={tier.amount} onChange={(v) => updateTier(i, "amount", v)} />
                {tiers.length > 1 && (
                  <button
                    onClick={() => removeTier(i)}
                    className="p-1 text-brand-gray-4 hover:text-red-400 transition"
                    aria-label="Eliminar nivel"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addTier}
          className="flex items-center gap-1.5 text-xs text-brand-gray-4 hover:text-brand-ink transition font-medium mb-5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Agregar nivel
        </button>

        {/* After last tier */}
        <div data-tour="after-last" className="pt-4 border-t border-[#F4F5F7]">
          <p className="text-sm font-medium text-[#0B0B0C] mb-3">Después del último referido</p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "cycle", label: "Vuelve a empezar" },
              { value: "stop", label: "Se queda fijo" },
              { value: "flat", label: "Monto plano" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAfterLastTier(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  afterLastTier === opt.value
                    ? "bg-[#0B0B0C] text-white"
                    : "bg-[#F4F5F7] text-[#3F4651] hover:bg-[#ECEDEF]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {afterLastTier === "flat" && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-[#F4F5F7]">
              <span className="flex-1 text-sm text-[#3F4651]">Monto fijo por referido adicional</span>
              <PillCurrencyInput value={flatAmount} onChange={setFlatAmount} />
            </div>
          )}
        </div>
      </div>

      {/* BURBUJA */}
      <div data-tour="bubble" className="bg-white rounded-2xl border border-brand-border-1 p-6 mb-4">
        <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-0.5">
          Auto y Gastos Médicos Mayores
        </p>
        <h2 className="font-bold text-[18px] text-[#0B0B0C] mb-1">Premios burbuja</h2>
        <p className="text-xs text-brand-gray-4 mb-5">
          Cada venta suma puntos a un mismo fondo. Al llegar al umbral, el cliente reclama el premio.
        </p>

        <div className="mb-5">
          {[
            { label: "Puntos por venta de Auto", value: bubbleAutoPoints, onChange: setBubbleAutoPoints, type: "pts" as const },
            { label: "Puntos por venta de GMM", value: bubbleGmmPoints, onChange: setBubbleGmmPoints, type: "pts" as const },
            { label: "Premio al reclamar", value: bubbleClaimThreshold, onChange: setBubbleClaimThreshold, type: "mxn" as const },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className={`flex items-center gap-3 py-3 ${i < arr.length - 1 ? "border-b border-[#F4F5F7]" : ""}`}
            >
              <span className="flex-1 text-sm text-[#3F4651]">{row.label}</span>
              {row.type === "pts" ? (
                <PillPointsInput value={row.value} onChange={row.onChange} />
              ) : (
                <PillCurrencyInput value={row.value} onChange={row.onChange} />
              )}
            </div>
          ))}
        </div>

        {/* Blue prize card */}
        <div className="bg-[#2563EB] rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-white/70 text-xs mb-0.5">Premio al llegar al umbral</p>
            <p className="text-white text-2xl font-bold">{formatCurrency(bubbleClaimThreshold)}</p>
          </div>
          <span className="bg-white/20 text-white text-xs rounded-full px-3 py-1.5 font-medium">
            Reclamable por el cliente
          </span>
        </div>
      </div>

      {/* MENSAJES */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-6 mb-4">
        <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-0.5">Comunicación</p>
        <h2 className="font-bold text-[18px] text-[#0B0B0C] mb-5">Mensajes personalizados</h2>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#0B0B0C] mb-2">
              Bienvenida en el link de referido
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="Ej: Tu amigo te recomienda conocer los beneficios de un seguro sin comprometerte a nada."
              className="w-full px-4 py-3 rounded-2xl border border-brand-border-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition resize-none text-[#3F4651] placeholder:text-brand-gray-4"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#0B0B0C] mb-2">Mensaje de WhatsApp</label>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={4}
              placeholder={`Ej: ¡Hola! {nombre} te recomienda cotizar un seguro sin compromiso. Entra aquí: {link}`}
              className="w-full px-4 py-3 rounded-2xl border border-brand-border-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition resize-none text-[#3F4651] placeholder:text-brand-gray-4"
            />
            <p className="text-xs text-brand-gray-4 mt-2">
              Usa{" "}
              <code className="bg-[#F4F5F7] px-1.5 py-0.5 rounded-md">{"{link}"}</code> para el enlace y{" "}
              <code className="bg-[#F4F5F7] px-1.5 py-0.5 rounded-md">{"{nombre}"}</code> para el nombre del cliente.
            </p>
          </div>
        </div>
      </div>

      {/* CLAIMS */}
      {!loadingClaims && claims.length > 0 && (
        <div className="space-y-4 mb-4">
          {pendingClaims.length > 0 && (
            <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-brand-border-1">
                <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em]">Premios por pagar</p>
              </div>
              <div className="divide-y divide-brand-border-1">
                {pendingClaims.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#0B0B0C]">{c.client.name}</p>
                      <p className="text-xs text-brand-gray-4 mt-0.5">{formatDate(c.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-amber-600">{formatCurrency(c.amount)}</span>
                      <button
                        onClick={() => setPayTarget(c)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-brand-ink text-white hover:bg-[#26262a] transition"
                      >
                        Marcar pagado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paidClaims.length > 0 && (
            <div className="bg-white rounded-2xl border border-brand-border-1 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-brand-border-1">
                <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em]">Premios pagados</p>
              </div>
              <div className="divide-y divide-brand-border-1">
                {paidClaims.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-[#0B0B0C]">{c.client.name}</p>
                      <p className="text-xs text-brand-gray-4 mt-0.5">
                        {c.paidAt ? formatDate(c.paidAt) : formatDate(c.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SAVE FOOTER */}
      <div className="bg-white rounded-2xl border border-brand-border-1 px-5 py-4 flex items-center justify-between gap-4">
        <p className="text-sm text-brand-gray-4 min-w-0">
          Pagado este mes{" "}
          <span className="text-[#0B0B0C] font-semibold">{formatCurrency(paidThisMonth)}</span>
          {" · "}Por pagar{" "}
          <span className="font-semibold" style={{ color: "#D97706" }}>{formatCurrency(pendingTotal)}</span>
        </p>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex-shrink-0 bg-brand-ink text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-[#26262a] disabled:opacity-50 transition"
        >
          {saving ? "Guardando..." : saved ? "¡Guardado ✓" : "Guardar cambios"}
        </button>
      </div>

      {/* PAY MODAL */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/25" onClick={() => setPayTarget(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
            <h2 className="font-semibold mb-1">Marcar como pagado</h2>
            <p className="text-sm text-brand-gray-4 mb-5">
              {payTarget.client.name} · {formatCurrency(payTarget.amount)}
            </p>
            <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">
              Referencia de pago (opcional)
            </label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Ej: Transferencia, efectivo..."
              className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition mb-5"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={confirmPay}
                disabled={updating}
                className="flex-1 bg-brand-ink text-white text-sm py-3 rounded-full font-medium hover:bg-[#26262a] disabled:opacity-50 transition"
              >
                {updating ? "Guardando..." : "Confirmar pago"}
              </button>
              <button
                onClick={() => setPayTarget(null)}
                className="px-4 text-sm py-3 rounded-full border border-brand-border-4 text-brand-gray-2 hover:bg-brand-surface transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

