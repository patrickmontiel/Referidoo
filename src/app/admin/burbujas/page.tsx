"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

type BubbleClaim = {
  id: string;
  amount: number;
  status: string;
  paymentNote: string | null;
  createdAt: string;
  paidAt: string | null;
  client: { name: string; phone: string | null };
};

export default function BurbujasPage() {
  const [claims, setClaims] = useState<BubbleClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<BubbleClaim | null>(null);
  const [payNote, setPayNote] = useState("");
  const [updating, setUpdating] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/bubble-claims")
      .then((r) => r.json())
      .then((d) => { setClaims(Array.isArray(d.claims) ? d.claims : []); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

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
    load();
  }

  const pending = claims.filter((c) => c.status === "pending");
  const paid = claims.filter((c) => c.status === "paid");

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Premios burbuja</h1>
        <p className="text-sm text-gray-400 mt-0.5">Reclamos acumulados de Auto + GMM</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : claims.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Aún no hay reclamos de premios burbuja.</div>
      ) : (
        <div className="space-y-5">
          {pending.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pendientes de pago</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {pending.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{c.client.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-amber-600">{formatCurrency(c.amount)}</span>
                      <button
                        onClick={() => setPayTarget(c)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-black text-white hover:bg-gray-900 transition"
                      >
                        Marcar pagado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paid.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pagados</h2>
              <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {paid.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="text-sm font-medium">{c.client.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.paidAt ? formatDate(c.paidAt) : formatDate(c.createdAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/25" onClick={() => setPayTarget(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl md:rounded-2xl p-6 shadow-2xl">
            <h2 className="font-semibold mb-1">Marcar como pagado</h2>
            <p className="text-sm text-gray-500 mb-5">
              {payTarget.client.name} · {formatCurrency(payTarget.amount)}
            </p>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-2">
              Referencia de pago (opcional)
            </label>
            <input
              type="text"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="Ej: Transferencia, efectivo..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition mb-5"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={confirmPay}
                disabled={updating}
                className="flex-1 bg-black text-white text-sm py-3 rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 transition"
              >
                {updating ? "Guardando..." : "Confirmar pago"}
              </button>
              <button
                onClick={() => setPayTarget(null)}
                className="px-4 text-sm py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
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
