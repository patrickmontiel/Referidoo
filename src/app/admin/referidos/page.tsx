"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, getStatusLabel, getRewardStatusLabel } from "@/lib/utils";

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  leadEmail: string | null;
  leadNotes: string | null;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  tierPosition: number;
  createdAt: string;
  referrer: { id: string; name: string };
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "contacted", label: "Contactados" },
  { value: "converted", label: "Convertidos" },
  { value: "rejected", label: "Rechazados" },
];

const statusBg: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-100",
  contacted: "bg-blue-50 text-blue-700 border-blue-100",
  converted: "bg-green-50 text-green-700 border-green-100",
  rejected:  "bg-gray-100 text-gray-500 border-gray-200",
};

const rewardBg: Record<string, string> = {
  pending:  "bg-gray-100 text-gray-500",
  approved: "bg-amber-50 text-amber-700",
  paid:     "bg-green-50 text-green-700",
};

export default function ReferidosPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Referral | null>(null);
  const [updating, setUpdating] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((d) => { setReferrals(Array.isArray(d) ? d : []); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  async function update(id: string, data: Partial<{ status: string; rewardStatus: string; leadNotes: string }>) {
    setUpdating(true);
    await fetch(`/api/referrals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, ...data } : null);
    }
    setUpdating(false);
  }

  const filtered = referrals.filter((r) => !filter || r.status === filter);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Referidos</h1>
        <p className="text-sm text-gray-400 mt-0.5">{referrals.length} en total</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              filter === opt.value
                ? "bg-black text-white border-black"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.label}
            {opt.value && (
              <span className="ml-1.5 text-[10px] opacity-60">
                {referrals.filter((r) => r.status === opt.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Sin referidos en esta categoría.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-gray-200 transition"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{r.leadName}</p>
                  <p className="text-xs text-gray-400">{r.leadPhone}</p>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Vía <span className="text-gray-500">{r.referrer.name}</span> · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{formatCurrency(r.rewardAmount)}</p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium border ${statusBg[r.status]}`}>
                    {getStatusLabel(r.status)}
                  </span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-4 pt-3 border-t border-gray-50">
                {r.status === "pending" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); update(r.id, { status: "contacted" }); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition font-medium"
                  >
                    Marcar contactado
                  </button>
                )}
                {r.status === "contacted" && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); update(r.id, { status: "converted", rewardStatus: "approved" }); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition font-medium"
                    >
                      Convertido ✓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); update(r.id, { status: "rejected" }); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition font-medium"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {r.status === "converted" && r.rewardStatus === "approved" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); update(r.id, { rewardStatus: "paid" }); }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-black text-white hover:bg-gray-800 transition font-medium"
                  >
                    Marcar pagado
                  </button>
                )}
                <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${rewardBg[r.rewardStatus]}`}>
                  {getRewardStatusLabel(r.rewardStatus)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">Detalle del referido</h2>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Lead</p>
                <p className="font-medium">{selected.leadName}</p>
                <p className="text-sm text-gray-500">{selected.leadPhone}</p>
                {selected.leadEmail && <p className="text-sm text-gray-500">{selected.leadEmail}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Referido por</p>
                  <p className="text-sm font-medium">{selected.referrer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Referido #</p>
                  <p className="text-sm font-medium">{selected.tierPosition}º de ese cliente</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Premio</p>
                  <p className="text-sm font-semibold">{formatCurrency(selected.rewardAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Fecha</p>
                  <p className="text-sm">{formatDate(selected.createdAt)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">Estado del lead</p>
                <div className="flex gap-2 flex-wrap">
                  {["pending", "contacted", "converted", "rejected"].map((s) => (
                    <button
                      key={s}
                      disabled={updating}
                      onClick={() => update(selected.id, { status: s, ...(s === "converted" ? { rewardStatus: "approved" } : {}) })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        selected.status === s
                          ? "bg-black text-white border-black"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {getStatusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">Estado del premio</p>
                <div className="flex gap-2 flex-wrap">
                  {["pending", "approved", "paid"].map((s) => (
                    <button
                      key={s}
                      disabled={updating}
                      onClick={() => update(selected.id, { rewardStatus: s })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                        selected.rewardStatus === s
                          ? "bg-black text-white border-black"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {getRewardStatusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href={`tel:${selected.leadPhone}`}
                className="flex items-center justify-center gap-2 w-full bg-black text-white text-sm py-3 rounded-xl font-medium hover:bg-gray-900 transition"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6.62 10.79C8.06 13.62 10.38 15.93 13.21 17.38L15.41 15.18C15.68 14.91 16.08 14.82 16.43 14.94C17.55 15.31 18.76 15.51 20 15.51C20.55 15.51 21 15.96 21 16.51V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" fill="currentColor"/>
                </svg>
                Llamar a {selected.leadName.split(" ")[0]}
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
