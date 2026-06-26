"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendsWidget } from "./_widgets/TrendsWidget";
import { ProblemsWidget } from "./_widgets/ProblemsWidget";
import { RankingWidget } from "./_widgets/RankingWidget";
import { BreakdownWidget } from "./_widgets/BreakdownWidget";

type Summary = {
  mrr: number;
  paidAdvisorsCount: number;
  lessioCommissionTotal: number;
  lessioCommissionSince: string;
};

export default function OwnerResumenPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/owner/summary")
      .then((r) => r.json())
      .then((data) => setSummary(typeof data?.mrr === "number" ? data : null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!summary) {
    return <p className="text-sm text-gray-500">No se pudo cargar el resumen.</p>;
  }

  return (
    <div className="max-w-2xl space-y-3">
      <h1 className="text-xl font-semibold mb-3">Resumen del negocio</h1>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-black text-white rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-1">MRR (suscripciones)</p>
          <p className="text-xl font-semibold">{formatCurrency(summary.mrr)}</p>
          <p className="text-xs text-gray-500 mt-1">{summary.paidAdvisorsCount} asesor(es) en plan pagado</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Comisión Referidoo</p>
          <p className="text-xl font-semibold">{formatCurrency(summary.lessioCommissionTotal)}</p>
          <p className="text-xs text-gray-500 mt-1">desde {formatDate(summary.lessioCommissionSince)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        La comisión por contrato cerrado solo se cuenta desde {formatDate(summary.lessioCommissionSince)} —
        no incluye conversiones anteriores a esa fecha (backfill histórico diferido, ver TODOS.md).
      </p>

      <TrendsWidget />
      <ProblemsWidget />
      <RankingWidget />
      <BreakdownWidget />
    </div>
  );
}
