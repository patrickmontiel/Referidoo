"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { DonutSkeleton } from "./Skeletons";

type BreakdownRow = { productType: string; commission: number };

const COLORS = ["#000000", "#16a34a", "#9ca3af", "#f59e0b", "#3b82f6", "#ec4899"];

export function BreakdownWidget() {
  const [breakdown, setBreakdown] = useState<BreakdownRow[] | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/owner/breakdown")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.breakdown)) throw new Error("respuesta inválida");
        setBreakdown(d.breakdown);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const total = breakdown?.reduce((s, r) => s + r.commission, 0) ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-3">Comisión por tipo de producto</p>

      {loading && <DonutSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">No se pudo cargar el desglose.</p>
          <button
            onClick={load}
            className="text-xs font-medium text-black hover:underline transition-transform active:scale-95 py-2 px-1 -mx-1"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && breakdown && breakdown.length === 0 && (
        <p className="text-sm text-gray-500">Todavía no hay comisión registrada para desglosar.</p>
      )}

      {!loading && !error && breakdown && breakdown.length === 1 && (
        <p className="text-sm text-amber-600">
          Pocos datos todavía — toda la comisión viene de &quot;{breakdown[0].productType}&quot; ({formatCurrency(breakdown[0].commission)}).
        </p>
      )}

      {!loading && !error && breakdown && breakdown.length > 1 && (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={breakdown} dataKey="commission" nameKey="productType" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {breakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
            <Legend
              formatter={(value: string, entry) => {
                const commission = (entry?.payload as unknown as BreakdownRow)?.commission ?? 0;
                const pct = total > 0 ? Math.round((commission / total) * 100) : 0;
                return `${value} (${pct}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
