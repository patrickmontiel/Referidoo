"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, CardNumber, SecurityCode, ExpirationDate, createCardToken } from "@mercadopago/sdk-react";

let initialized = false;

export function UpgradeCardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [cardholderName, setCardholderName] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (publicKey && !initialized) {
      initMercadoPago(publicKey);
      initialized = true;
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      // RFC es el identificador fiscal estándar en México para este flujo.
      const tokenResponse = await createCardToken({
        cardholderName,
        identificationType: "RFC",
        identificationNumber,
      });

      const cardTokenId = (tokenResponse as { id?: string })?.id;
      if (!cardTokenId) {
        setError("No se pudo procesar la tarjeta — revisa los datos e intenta de nuevo");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardTokenId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo procesar el pago");
        setBusy(false);
        return;
      }

      onSuccess();
    } catch {
      setError("No se pudo procesar la tarjeta — revisa los datos e intenta de nuevo");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="cardholder-name" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Nombre en la tarjeta
        </label>
        <input
          id="cardholder-name"
          type="text"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          required
          className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
          placeholder="Como aparece en la tarjeta"
        />
      </div>

      <div>
        <label htmlFor="identification-number" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          RFC
        </label>
        <input
          id="identification-number"
          type="text"
          value={identificationNumber}
          onChange={(e) => setIdentificationNumber(e.target.value)}
          required
          className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
          placeholder="XAXX010101000"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Número de tarjeta</label>
        <div className="w-full min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm">
          <CardNumber placeholder="•••• •••• •••• ••••" />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Vencimiento</label>
          <div className="min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm">
            <ExpirationDate placeholder="MM/AA" mode="short" />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">CVV</label>
          <div className="min-h-11 px-4 py-3 rounded-xl border border-gray-200 text-sm">
            <SecurityCode placeholder="•••" />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 min-h-11 bg-black text-white text-sm font-medium py-2.5 rounded-xl hover:bg-gray-900 disabled:opacity-50 transition"
        >
          {busy ? "Procesando..." : "Confirmar pago"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-4 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
