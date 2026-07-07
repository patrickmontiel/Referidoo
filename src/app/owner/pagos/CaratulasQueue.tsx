"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

export type CaratulaRow = {
  referralId: string;
  advisorName: string;
  leadName: string;
  productType: string | null;
  saleAmount: number | null;
  caratulaUrl: string;
  caratulaStatus: string;
  convertedAt: string;
};

// Cola de validación: el dueño abre la carátula, la compara contra el monto
// reportado y la marca. "Discrepancia" la deja visible hasta resolverse con
// el asesor (corregir monto o carátula nueva).
export function CaratulasQueue({ initialRows }: { initialRows: CaratulaRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState<string | null>(null);

  async function mark(referralId: string, status: "validada" | "discrepancia") {
    setBusy(referralId);
    const res = await fetch("/api/owner/caratulas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId, status }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return;
    setRows((prev) =>
      status === "validada"
        ? prev.filter((r) => r.referralId !== referralId)
        : prev.map((r) => (r.referralId === referralId ? { ...r, caratulaStatus: "discrepancia" } : r))
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-brand-gray-4">Sin carátulas pendientes de validar.</p>;
  }

  return (
    <div className="divide-y divide-brand-border-1">
      {rows.map((r) => (
        <div key={r.referralId} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-brand-ink">
                {r.productType ?? "Sin producto"} · {formatCurrency(r.saleAmount ?? 0)}
              </p>
              {r.caratulaStatus === "discrepancia" && (
                <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                  Discrepancia — resolver con el asesor
                </span>
              )}
            </div>
            <p className="text-xs text-brand-gray-4 mt-0.5">
              {r.leadName} · asesor: {r.advisorName} · {r.convertedAt}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`/api/caratula-view?u=${encodeURIComponent(r.caratulaUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[#2563EB] border border-[#2563EB]/30 px-3 py-1.5 rounded-full hover:bg-[#EBF2FF] transition"
            >
              Ver carátula
            </a>
            <button
              onClick={() => mark(r.referralId, "validada")}
              disabled={busy === r.referralId}
              className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-full hover:bg-green-100 disabled:opacity-50 transition"
            >
              Coincide ✓
            </button>
            <button
              onClick={() => mark(r.referralId, "discrepancia")}
              disabled={busy === r.referralId || r.caratulaStatus === "discrepancia"}
              className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 disabled:opacity-50 transition"
            >
              No coincide
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
