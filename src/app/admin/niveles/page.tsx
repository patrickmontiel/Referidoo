"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Tier = { amount: number; label: string };

export default function NivelesPage() {
  const [tiers, setTiers] = useState<Tier[]>([
    { amount: 1500, label: "" },
    { amount: 1500, label: "" },
    { amount: 3500, label: "¡Bono especial!" },
  ]);
  const [afterLastTier, setAfterLastTier] = useState("cycle");
  const [flatAmount, setFlatAmount] = useState(1500);
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
        setLoading(false);
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

  async function save() {
    setSaving(true);
    await fetch("/api/tiers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers, afterLastTier, flatAmount, whatsappMessage, welcomeMessage }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Niveles de premios</h1>
        <p className="text-sm text-gray-400 mt-0.5">Define cuánto gana cada cliente por referido</p>
      </div>

      {/* Tiers */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="font-medium text-sm mb-4">Estructura de premios</h2>
        <div className="space-y-3">
          {tiers.map((tier, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={tier.amount}
                  onChange={(e) => updateTier(i, "amount", Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
                  placeholder="Monto en pesos"
                  min="0"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={tier.label}
                  onChange={(e) => updateTier(i, "label", e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
                  placeholder={`Etiqueta (opcional)`}
                />
              </div>
              <button
                onClick={() => removeTier(i)}
                disabled={tiers.length <= 1}
                className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-20 transition"
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
          className="mt-4 flex items-center gap-2 text-xs text-gray-500 hover:text-black transition font-medium"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Agregar nivel
        </button>
      </div>

      {/* After last tier */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5">
        <h2 className="font-medium text-sm mb-1">¿Qué pasa después del último nivel?</h2>
        <p className="text-xs text-gray-400 mb-4">
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
                afterLastTier === opt.value ? "border-black bg-gray-50" : "border-gray-100 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="afterLastTier"
                value={opt.value}
                checked={afterLastTier === opt.value}
                onChange={(e) => setAfterLastTier(e.target.value)}
                className="mt-0.5 accent-black"
              />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {afterLastTier === "flat" && (
          <div className="mt-3">
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">Monto fijo (pesos)</label>
            <input
              type="number"
              value={flatAmount}
              onChange={(e) => setFlatAmount(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              min="0"
            />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <h2 className="font-medium text-sm mb-4">Mensajes personalizados</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
              Mensaje de bienvenida (landing de referidos)
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              placeholder="Ej: Tu amigo te recomienda conocer los beneficios de un seguro sin comprometerte a nada."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5 uppercase tracking-wide">
              Mensaje de WhatsApp
            </label>
            <textarea
              value={whatsappMessage}
              onChange={(e) => setWhatsappMessage(e.target.value)}
              rows={4}
              placeholder={`Ej: ¡Hola! {nombre} te recomienda cotizar un seguro sin compromiso. Entra aquí: {link}`}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition resize-none"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Usa <code className="bg-gray-100 px-1 rounded">{"{link}"}</code> para el enlace y{" "}
              <code className="bg-gray-100 px-1 rounded">{"{nombre}"}</code> para el nombre del cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gray-50 rounded-2xl p-5 mb-6 border border-gray-100">
        <h2 className="font-medium text-sm mb-3">Vista previa de premios</h2>
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span className="text-gray-600">{t.label || `Referido #${i + 1}`}</span>
              <span className="font-semibold">{formatCurrency(t.amount)}</span>
            </div>
          ))}
          {afterLastTier === "cycle" && (
            <div className="flex justify-between items-center text-sm opacity-50">
              <span className="text-gray-600">Referido #{tiers.length + 1} (ciclo)</span>
              <span className="font-semibold">{tiers[0] ? formatCurrency(tiers[0].amount) : "—"}</span>
            </div>
          )}
          {afterLastTier === "flat" && (
            <div className="flex justify-between items-center text-sm opacity-50">
              <span className="text-gray-600">Referidos adicionales</span>
              <span className="font-semibold">{formatCurrency(flatAmount)}</span>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full bg-black text-white text-sm font-medium py-3.5 rounded-2xl hover:bg-gray-900 disabled:opacity-50 transition"
      >
        {saving ? "Guardando..." : saved ? "¡Guardado ✓" : "Guardar configuración"}
      </button>
    </div>
  );
}
