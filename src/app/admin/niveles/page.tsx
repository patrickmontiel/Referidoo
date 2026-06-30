"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, formatNumberWithCommas } from "@/lib/utils";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="tiers"]',
    title: "Estructura de premios",
    body: "Define cuánto gana tu cliente por cada referido que convierte. Por defecto: $1,500 · $1,500 · $3,500. Cambia los montos como quieras.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="after-last"]',
    title: "Más allá del último nivel",
    body: "Si un cliente supera el nivel 3, elige qué pasa: ¿reinicia el ciclo? ¿monto fijo? ¿siempre el mismo máximo? Tú decides la regla.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="bubble"]',
    title: "Premios burbuja de Auto, Otro y GMM",
    body: "Auto, Otro y Gastos Médicos Mayores suman puntos a un pool compartido del cliente. Aquí defines cuántos puntos da cada producto y a partir de cuántos puntos se puede reclamar el premio.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="preview"]',
    title: "Vista previa instantánea",
    body: "Así ve tu cliente cuánto gana en cada referido. Se actualiza en tiempo real mientras ajustas los montos arriba.",
    placement: "top",
  },
];

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

function CurrencyInput({
  value,
  onChange,
  placeholder,
}: {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-4 text-sm pointer-events-none">$</span>
      <input
        type="text"
        inputMode="numeric"
        value={formatNumberWithCommas(String(value))}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        placeholder={placeholder}
        className="w-full pl-7 pr-3 py-2 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
      />
    </div>
  );
}

export default function PremiosPage() {
  // Escalera de premios PPR y Vida
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
  const [savingTiers, setSavingTiers] = useState(false);
  const [savedTiers, setSavedTiers] = useState(false);

  // Premios burbuja de Auto y GMM
  const [claims, setClaims] = useState<BubbleClaim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [payTarget, setPayTarget] = useState<BubbleClaim | null>(null);
  const [payNote, setPayNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const [bubbleAutoPoints, setBubbleAutoPoints] = useState(150);
  const [bubbleGmmPoints, setBubbleGmmPoints] = useState(300);
  const [bubbleClaimThreshold, setBubbleClaimThreshold] = useState(500);
  const [loadingBubbleSettings, setLoadingBubbleSettings] = useState(true);
  const [savingBubble, setSavingBubble] = useState(false);
  const [savedBubble, setSavedBubble] = useState(false);

  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const handler = () => setShowTour(true);
    window.addEventListener("referidoo:tour", handler);
    return () => window.removeEventListener("referidoo:tour", handler);
  }, []);

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
      .then((d) => { setClaims(Array.isArray(d.claims) ? d.claims : []); setLoadingClaims(false); });
  }

  useEffect(() => {
    loadClaims();
    fetch("/api/bubble-settings")
      .then((r) => r.json())
      .then((d) => {
        setBubbleAutoPoints(d.bubbleAutoPoints ?? 150);
        setBubbleGmmPoints(d.bubbleGmmPoints ?? 300);
        setBubbleClaimThreshold(d.bubbleClaimThreshold ?? 500);
        setLoadingBubbleSettings(false);
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
    setTiers(tiers.map((t, idx) => idx === i ? { ...t, [field]: val } : t));
  }

  async function saveTiers() {
    setSavingTiers(true);
    await fetch("/api/tiers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers, afterLastTier, flatAmount, whatsappMessage, welcomeMessage }),
    });
    setSavingTiers(false);
    setSavedTiers(true);
    setTimeout(() => setSavedTiers(false), 2500);
  }

  async function saveBubbleSettings() {
    setSavingBubble(true);
    await fetch("/api/bubble-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bubbleAutoPoints, bubbleGmmPoints, bubbleClaimThreshold }),
    });
    setSavingBubble(false);
    setSavedBubble(true);
    setTimeout(() => setSavedBubble(false), 2500);
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

  if (loadingTiers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {showTour && <Tour steps={TOUR_STEPS} onDone={() => setShowTour(false)} />}

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Premios</h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">Define cuánto gana cada cliente por referido y cómo funcionan los premios burbuja</p>
      </div>

      {/* Escalera de premios PPR y Vida */}
      <div className="flex items-center gap-2 mb-3">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-brand-gray-4">
          <path d="M4 20V16H8V12H12V8H16V4H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2 className="text-xs font-semibold text-brand-gray-4 uppercase tracking-wide">Escalera de premios PPR y Vida</h2>
      </div>

      {/* Tiers */}
      <div data-tour="tiers" className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-5">
        <h2 className="font-medium text-sm mb-1">Estructura de premios</h2>
        <p className="text-xs text-brand-gray-4 mb-4">Cuánto recibe tu cliente por cada referido (1º, 2º, 3º...) que llega a contratar Vida o PPR.</p>

        <div className="hidden sm:flex items-center gap-3 mb-1.5 px-0">
          <div className="w-8 flex-shrink-0" />
          <span className="flex-1 text-xs text-brand-gray-4 uppercase tracking-wide">Monto</span>
          <span className="flex-1 text-xs text-brand-gray-4 uppercase tracking-wide">Etiqueta (opcional)</span>
          <div className="w-5 flex-shrink-0" />
        </div>

        <div className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0B0B0C] rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <CurrencyInput
                  value={tier.amount}
                  onChange={(val) => updateTier(i, "amount", val)}
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={tier.label}
                  onChange={(e) => updateTier(i, "label", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
                  placeholder={`Ej: ¡Bono especial!`}
                />
              </div>
              <button
                onClick={() => removeTier(i)}
                disabled={tiers.length <= 1}
                className="p-1 text-brand-gray-4 hover:text-red-400 disabled:opacity-20 transition"
                aria-label="Eliminar nivel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addTier}
          className="mt-4 flex items-center gap-2 text-xs text-brand-gray-4 hover:text-brand-ink transition font-medium"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Agregar nivel
        </button>
      </div>

      {/* After last tier */}
      <div data-tour="after-last" className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-5">
        <h2 className="font-medium text-sm mb-1">¿Qué pasa después del último nivel?</h2>
        <p className="text-xs text-brand-gray-4 mb-4">
          Si un cliente supera el nivel {tiers.length}, ¿qué premio recibe?
        </p>
        <div className="space-y-2">
          {[
            { value: "cycle", label: "Reiniciar ciclo", desc: `El 4º referido da ${tiers[0] ? formatCurrency(tiers[0].amount) : "$1,500"} de nuevo, y así.` },
            { value: "flat", label: "Monto fijo", desc: "Todos los referidos adicionales dan el mismo monto." },
            { value: "stop", label: "Premio del último nivel", desc: `Siempre da ${tiers[tiers.length - 1] ? formatCurrency(tiers[tiers.length - 1].amount) : "$3,500"} a partir de ahí.` },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                afterLastTier === opt.value ? "border-brand-ink bg-brand-surface" : "border-brand-border-1 hover:bg-brand-surface"
              }`}
            >
              <input
                type="radio"
                name="afterLastTier"
                value={opt.value}
                checked={afterLastTier === opt.value}
                onChange={(e) => setAfterLastTier(e.target.value)}
                className="mt-0.5 accent-brand-ink"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-brand-gray-4 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {afterLastTier === "flat" && (
          <div className="mt-3">
            <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">Monto fijo</label>
            <CurrencyInput value={flatAmount} onChange={setFlatAmount} placeholder="0" />
          </div>
        )}
      </div>

      {/* Premios burbuja de Auto, Otro y GMM */}
      <div className="flex items-center gap-2 mb-3 mt-2">
        <div className="w-4 h-4 rounded-full border-2 border-brand-blue bg-brand-blue-bg flex-shrink-0" />
        <h2 className="text-xs font-semibold text-brand-gray-4 uppercase tracking-wide">Premios burbuja de Auto, Otro y Gastos Médicos Mayores</h2>
      </div>

      <div data-tour="bubble" className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-5">
        <h2 className="font-medium text-sm mb-1">Configuración de puntos</h2>
        <p className="text-xs text-brand-gray-4 mb-4">Cada vez que un referido contrata Auto, Otro tipo de seguro o GMM, se suman puntos a un fondo del cliente. Al llegar a la meta, sus burbujas explotan y reciben el premio.</p>

        {loadingBubbleSettings ? (
          <div className="flex justify-center py-6">
            <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">Por Auto / Otro</label>
                <CurrencyInput value={bubbleAutoPoints} onChange={setBubbleAutoPoints} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">Por GMM</label>
                <CurrencyInput value={bubbleGmmPoints} onChange={setBubbleGmmPoints} placeholder="0" />
              </div>
              <div>
                <label className="block text-xs text-brand-gray-4 uppercase tracking-wide mb-2">Meta para reclamar</label>
                <CurrencyInput value={bubbleClaimThreshold} onChange={setBubbleClaimThreshold} placeholder="0" />
              </div>
            </div>

            {/* Vista previa de burbujas */}
            {(() => {
              const BUBBLE_COUNT = 5;
              const previewPoints = bubbleAutoPoints * 2 + bubbleGmmPoints;
              const previewFraction = bubbleClaimThreshold > 0 ? Math.min(1, previewPoints / bubbleClaimThreshold) : 0;
              const previewFills = Array.from({ length: BUBBLE_COUNT }, (_, i) => Math.max(0, Math.min(1, previewFraction * BUBBLE_COUNT - i)));
              const previewReady = previewFraction >= 1;
              return (
                <div className="mb-4 p-4 rounded-xl bg-brand-blue-bg/50 border border-brand-border-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-brand-gray-2">Vista previa</p>
                    <p className="text-xs text-brand-gray-4">2 referidos de Auto/Otro + 1 de GMM</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 py-2 mb-2">
                    {previewFills.map((fill, i) => (
                      <div
                        key={i}
                        className={`relative w-14 h-14 rounded-full border-2 overflow-hidden bg-[#EEF3FE] ${previewReady ? "border-brand-blue bubble-ready" : "border-brand-blue"}`}
                        style={{ boxShadow: "0 3px 10px rgba(37,99,235,0.25)" }}
                      >
                        <div
                          className="absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out"
                          style={{ height: `${fill * 100}%`, background: "linear-gradient(to top, #2563EB, #6EA1F5)" }}
                        />
                        <div className="absolute inset-0 rounded-full bubble-shine" />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-brand-gray-4 text-center">
                    {previewReady
                      ? `¡Listo! Tu cliente puede reclamar ${formatCurrency(bubbleClaimThreshold)}.`
                      : `Suma ${formatCurrency(previewPoints)} de ${formatCurrency(bubbleClaimThreshold)} para reclamar el premio.`}
                  </p>
                </div>
              );
            })()}

            <button
              onClick={saveBubbleSettings}
              disabled={savingBubble}
              className="w-full bg-brand-ink text-white text-sm font-medium py-3 rounded-full hover:bg-[#26262a] disabled:opacity-50 transition"
            >
              {savingBubble ? "Guardando..." : savedBubble ? "¡Guardado ✓" : "Guardar premios burbuja"}
            </button>
          </>
        )}
      </div>

      {loadingClaims ? (
        <div className="flex justify-center py-8 mb-5">
          <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-8 mb-5 text-brand-gray-4 text-sm bg-white rounded-2xl border border-brand-border-1">Aún no hay reclamos de premios burbuja.</div>
      ) : (
        <div className="space-y-5 mb-5">
          {pendingClaims.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-brand-gray-4 uppercase tracking-wide mb-2">Pendientes de pago</h2>
              <div className="bg-white rounded-2xl border border-brand-border-1 divide-y divide-brand-border-2">
                {pendingClaims.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{c.client.name}</p>
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
            <div>
              <h2 className="text-xs font-semibold text-brand-gray-4 uppercase tracking-wide mb-2">Pagados</h2>
              <div className="bg-white rounded-2xl border border-brand-border-1 divide-y divide-brand-border-2">
                {paidClaims.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{c.client.name}</p>
                      <p className="text-xs text-brand-gray-4 mt-0.5">{c.paidAt ? formatDate(c.paidAt) : formatDate(c.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="bg-white rounded-2xl border border-brand-border-1 p-5 mb-6">
        <h2 className="font-medium text-sm mb-4">Mensajes personalizados</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">
              Mensaje de bienvenida (landing de referidos)
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="Ej: Tu amigo te recomienda conocer los beneficios de un seguro sin comprometerte a nada."
              className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-brand-gray-4 mb-1.5 uppercase tracking-wide">
              Mensaje de WhatsApp
            </label>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={4}
              placeholder={`Ej: ¡Hola! {nombre} te recomienda cotizar un seguro sin compromiso. Entra aquí: {link}`}
              className="w-full px-3 py-2.5 rounded-xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition resize-none"
            />
            <p className="text-xs text-brand-gray-4 mt-1.5">
              Usa <code className="bg-brand-border-1 px-1 rounded">{"{link}"}</code> para el enlace y{" "}
              <code className="bg-brand-border-1 px-1 rounded">{"{nombre}"}</code> para el nombre del cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div data-tour="preview" className="bg-[#F4F5F7] rounded-2xl p-5 mb-6 border border-[#ECEDEF]">
        <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Vida y PPR</p>
        <h2 className="font-bold text-[18px] text-[#0B0B0C] mb-4">Escalera de premios</h2>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded-[12px] border border-[#ECEDEF] px-4 py-2.5">
              <span className="text-sm text-[#3F4651] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0C] text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                {t.label || `${i === 0 ? "1er" : i === 1 ? "2do" : `${i + 1}er`} referido convertido`}
              </span>
              <span className="text-sm font-bold text-[#0B0B0C]">{formatCurrency(t.amount)}</span>
            </div>
          ))}
          {afterLastTier === "cycle" && (
            <div className="flex items-center justify-between bg-white rounded-[12px] border border-[#ECEDEF] px-4 py-2.5 opacity-50">
              <span className="text-sm text-[#3F4651] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0C] text-white text-xs flex items-center justify-center flex-shrink-0">↩</span>
                Referido #{tiers.length + 1} (ciclo)
              </span>
              <span className="text-sm font-bold text-[#0B0B0C]">{tiers[0] ? formatCurrency(tiers[0].amount) : "—"}</span>
            </div>
          )}
          {afterLastTier === "flat" && (
            <div className="flex items-center justify-between bg-white rounded-[12px] border border-[#ECEDEF] px-4 py-2.5 opacity-50">
              <span className="text-sm text-[#3F4651] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0C] text-white text-xs flex items-center justify-center flex-shrink-0">∞</span>
                Referidos adicionales
              </span>
              <span className="text-sm font-bold text-[#0B0B0C]">{formatCurrency(flatAmount)}</span>
            </div>
          )}
          {afterLastTier === "stop" && (
            <div className="flex items-center justify-between bg-white rounded-[12px] border border-[#ECEDEF] px-4 py-2.5 opacity-50">
              <span className="text-sm text-[#3F4651] flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0B0B0C] text-white text-xs flex items-center justify-center flex-shrink-0">→</span>
                Referidos adicionales
              </span>
              <span className="text-sm font-bold text-[#0B0B0C]">{tiers[tiers.length - 1] ? formatCurrency(tiers[tiers.length - 1].amount) : "—"}</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={saveTiers}
        disabled={savingTiers}
        className="w-full bg-brand-ink text-white text-sm font-medium py-3.5 rounded-full hover:bg-[#26262a] disabled:opacity-50 transition"
      >
        {savingTiers ? "Guardando..." : savedTiers ? "¡Guardado ✓" : "Guardar escalera y mensajes"}
      </button>

      {/* Pay modal */}
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
