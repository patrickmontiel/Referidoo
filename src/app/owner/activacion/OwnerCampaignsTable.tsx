"use client";

import { Fragment, useState } from "react";

export type OwnerCampaignRow = {
  id: string;
  name: string;
  advisorName: string;
  channel: string;
  audience: number;
  contacted: number;
  opens: number;
  shares: number;
  productiveReferrers: number;
  referrals: number;
  productiveReferrerRate: number | null;
  leadYield: number | null;
};

type Drill = { clientName: string; contacted: boolean; opened: boolean; shared: boolean; referrals: number };

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);
const num = (v: number | null) => (v === null ? "—" : (Math.round(v * 10) / 10).toString());

export function OwnerCampaignsTable({ rows }: { rows: OwnerCampaignRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [drill, setDrill] = useState<Record<string, Drill[]>>({});

  async function toggle(id: string) {
    if (open === id) { setOpen(null); return; }
    setOpen(id);
    if (!drill[id]) {
      const res = await fetch(`/api/owner/campaigns/${id}`);
      if (res.ok) { const d = await res.json(); setDrill((p) => ({ ...p, [id]: d.rows })); }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-brand-gray-4 border-b border-brand-border-1">
            <th className="font-medium px-5 py-2">Campaña</th>
            <th className="font-medium px-3 py-2">Asesor</th>
            <th className="font-medium px-3 py-2 tabular-nums">Aud.</th>
            <th className="font-medium px-3 py-2 tabular-nums">Contact.</th>
            <th className="font-medium px-3 py-2 tabular-nums">Abiertos</th>
            <th className="font-medium px-3 py-2 tabular-nums">Shares</th>
            <th className="font-medium px-3 py-2 tabular-nums">Prod.</th>
            <th className="font-medium px-3 py-2 tabular-nums">Refs</th>
            <th className="font-medium px-3 py-2 tabular-nums">Rate</th>
            <th className="font-medium px-3 py-2 tabular-nums">Yield</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr className="border-b border-brand-border-1 last:border-0">
                <td className="px-5 py-2.5 text-brand-ink">{r.name} <span className="text-[11px] text-brand-gray-4">({r.channel === "whatsapp" ? "WA" : "email"})</span></td>
                <td className="px-3 py-2.5 text-brand-gray-2">{r.advisorName}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.audience}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.contacted}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.opens}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.shares}</td>
                <td className="px-3 py-2.5 tabular-nums">{r.productiveReferrers}</td>
                <td className="px-3 py-2.5 tabular-nums font-semibold text-brand-ink">{r.referrals}</td>
                <td className="px-3 py-2.5 tabular-nums text-[#2563EB] font-semibold">{pct(r.productiveReferrerRate)}</td>
                <td className="px-3 py-2.5 tabular-nums">{num(r.leadYield)}</td>
                <td className="px-3 py-2.5"><button onClick={() => toggle(r.id)} className="text-xs text-brand-gray-4 hover:text-brand-ink">{open === r.id ? "Cerrar" : "Ver"}</button></td>
              </tr>
              {open === r.id && (
                <tr className="bg-brand-surface">
                  <td colSpan={11} className="px-5 py-3">
                    {!drill[r.id] ? (
                      <p className="text-xs text-brand-gray-4">Cargando…</p>
                    ) : drill[r.id].length === 0 ? (
                      <p className="text-xs text-brand-gray-4">Sin recipients.</p>
                    ) : (
                      <div className="space-y-1">
                        {drill[r.id].map((d, i) => (
                          <div key={i} className="flex items-center gap-3 text-xs text-brand-gray-2">
                            <span className="w-40 truncate text-brand-ink">{d.clientName}</span>
                            <span>action {d.contacted ? "✅" : "—"}</span>
                            <span>open {d.opened ? "✅" : "—"}</span>
                            <span>share {d.shared ? "✅" : "❌"}</span>
                            <span className="tabular-nums">{d.referrals} referrals</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
