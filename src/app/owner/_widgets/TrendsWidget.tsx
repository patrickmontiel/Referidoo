"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChartSkeleton } from "./Skeletons";

const chartConfig = {
  mrr: { label: "MRR", color: "#3b82f6" },
  commission: { label: "Comisión", color: "#0a0a0a" },
  activeAdvisors: { label: "Asesores activos", color: "#9ca3af" },
} satisfies ChartConfig;

type TrendPoint = {
  date: string;
  activeAdvisors: number;
  mrr: number;
  commission: number;
};

type TrendsResponse = {
  points: TrendPoint[];
  hasData: boolean;
};

export function TrendsWidget() {
  const [data, setData] = useState<TrendsResponse | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/owner/trends")
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d?.points)) throw new Error("respuesta inválida");
        setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-xs text-gray-500 mb-3">Tendencia (MRR / asesores activos / comisión)</p>

      {loading && <ChartSkeleton />}

      {!loading && error && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">No se pudieron cargar las tendencias.</p>
          <button
            onClick={load}
            className="text-xs font-medium text-black hover:underline transition-transform active:scale-95 py-2 px-1 -mx-1"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && !data.hasData && (
        <p className="text-sm text-gray-500">
          Todavía no hay datos suficientes — la tendencia empieza a llenarse desde hoy.
        </p>
      )}

      {!loading && !error && data && data.hasData && data.points.length < 3 && (
        <>
          <p className="text-xs text-amber-600 mb-2">Pocos datos todavía — solo {data.points.length} día(s) registrados.</p>
          <SimpleChart points={data.points} />
        </>
      )}

      {!loading && !error && data && data.hasData && data.points.length >= 3 && (
        <SimpleChart points={data.points} />
      )}
    </div>
  );
}

function SimpleChart({ points }: { points: TrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[220px] w-full">
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={11} stroke="#6b7280" />
        <YAxis fontSize={11} stroke="#6b7280" />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(d) => formatDate(d as string)}
              formatter={(value, name) => {
                const n = Number(value ?? 0);
                const label = chartConfig[name as keyof typeof chartConfig]?.label ?? name;
                const display = name === "mrr" || name === "commission" ? formatCurrency(n) : n;
                return (
                  <div className="flex w-full justify-between gap-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">{display}</span>
                  </div>
                );
              }}
            />
          }
        />
        <Line type="monotone" dataKey="mrr" stroke="var(--color-mrr)" strokeWidth={2} dot={false} name="mrr" />
        <Line type="monotone" dataKey="commission" stroke="var(--color-commission)" strokeWidth={2} dot={false} name="commission" />
        <Line type="monotone" dataKey="activeAdvisors" stroke="var(--color-activeAdvisors)" strokeWidth={2} dot={false} name="activeAdvisors" />
      </LineChart>
    </ChartContainer>
  );
}
