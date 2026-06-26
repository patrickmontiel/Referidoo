"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ChartSkeleton } from "./Skeletons";

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
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={points}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={11} stroke="#6b7280" />
        <YAxis fontSize={11} stroke="#6b7280" />
        <Tooltip
          labelFormatter={(d) => formatDate(d as string)}
          formatter={(value, name) => {
            const n = Number(value ?? 0);
            if (name === "mrr" || name === "commission") return [formatCurrency(n), name];
            return [n, name];
          }}
        />
        <Line type="monotone" dataKey="mrr" stroke="#000000" strokeWidth={2} dot={false} name="MRR" />
        <Line type="monotone" dataKey="commission" stroke="#16a34a" strokeWidth={2} dot={false} name="Comisión" />
        <Line type="monotone" dataKey="activeAdvisors" stroke="#9ca3af" strokeWidth={2} dot={false} name="Asesores activos" />
      </LineChart>
    </ResponsiveContainer>
  );
}
