"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import { DonutSkeleton } from "./Skeletons";

type BreakdownRow = { productType: string; commission: number };

// Azul de marca primero, luego negro/grises de apoyo — mismo orden que TrendsWidget
const COLORS = ["#3b82f6", "#0a0a0a", "#9ca3af", "#93c5fd", "#d4d4d8", "#52525b"];

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
    <div className="bg-white rounded-2xl border border-brand-border-1 p-4">
      <p className="text-xs text-brand-gray-4 mb-3">Comisión por tipo de producto</p>

      {loading && <DonutSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-brand-gray-4">No se pudo cargar el desglose.</p>
          <button
            onClick={load}
            className="text-xs font-medium text-brand-ink hover:underline transition-transform active:scale-95 py-2 px-1 -mx-1"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && breakdown && breakdown.length === 0 && (
        <p className="text-sm text-brand-gray-4">Todavía no hay comisión registrada para desglosar.</p>
      )}

      {!loading && !error && breakdown && breakdown.length === 1 && (
        <p className="text-sm text-amber-600">
          Pocos datos todavía — toda la comisión viene de &quot;{breakdown[0].productType}&quot; ({formatCurrency(breakdown[0].commission)}).
        </p>
      )}

      {!loading && !error && breakdown && breakdown.length > 1 && (
        <ChartContainer config={{}} className="aspect-auto h-[220px] w-full">
          <PieChart>
            <Pie data={breakdown} dataKey="commission" nameKey="productType" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {breakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value ?? 0))} />} />
            <Legend
              formatter={(value: string, entry) => {
                const commission = (entry?.payload as unknown as BreakdownRow)?.commission ?? 0;
                const pct = total > 0 ? Math.round((commission / total) * 100) : 0;
                return `${value} (${pct}%)`;
              }}
            />
          </PieChart>
        </ChartContainer>
      )}
    </div>
  );
}
