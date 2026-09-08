"use client";

import { Fragment, useState } from "react";

type Row = { advisorId: string; name: string; counts: Record<string, number> };
type Step = { key: string; label: string };

const SHORT: Record<string, string> = {
  client_created: "Clientes",
  portal_link_sent: "Envíos",
  client_portal_opened: "Abiertos",
  referral_share_clicked: "Shares",
  referral_landing_viewed: "Vistas",
  referral_form_started: "Forms",
  referral_created: "Referidos",
};

const EVENT_LABEL: Record<string, string> = {
  client_created: "Cliente creado",
  portal_link_sent: "Link enviado",
  client_portal_opened: "Portal abierto",
  referral_share_clicked: "Compartió",
  referral_landing_viewed: "Landing vista",
  referral_form_started: "Empezó el formulario",
  referral_created: "Referido creado",
};

type TimelineEvent = { id: string; event: string; channel: string | null; createdAt: string; client: string | null; lead: string | null };

function fmt(ts: string) {
  return new Date(ts).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function ActivacionTable({ rows, steps }: { rows: Row[]; steps: Step[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, TimelineEvent[] | "loading">>({});

  async function toggle(advisorId: string) {
    if (openId === advisorId) { setOpenId(null); return; }
    setOpenId(advisorId);
    if (!timeline[advisorId]) {
      setTimeline((t) => ({ ...t, [advisorId]: "loading" }));
      try {
        const r = await fetch(`/api/owner/activation/timeline?advisorId=${advisorId}`);
        const d = await r.json();
        setTimeline((t) => ({ ...t, [advisorId]: d.events ?? [] }));
      } catch {
        setTimeline((t) => ({ ...t, [advisorId]: [] }));
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-brand-gray-4 border-b border-brand-border-1">
            <th className="px-5 py-2.5 font-medium">Asesor</th>
            {steps.map((s) => (
              <th key={s.key} className="px-2 py-2.5 font-medium text-right tabular-nums whitespace-nowrap">{SHORT[s.key] ?? s.label}</th>
            ))}
            <th className="px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = openId === row.advisorId;
            const tl = timeline[row.advisorId];
            return (
              <Fragment key={row.advisorId}>
                <tr
                  onClick={() => toggle(row.advisorId)}
                  className="border-b border-brand-border-1 cursor-pointer hover:bg-brand-surface transition"
                >
                  <td className="px-5 py-3 font-semibold text-brand-ink whitespace-nowrap">{row.name}</td>
                  {steps.map((s) => {
                    const v = row.counts[s.key] ?? 0;
                    return (
                      <td key={s.key} className={`px-2 py-3 text-right tabular-nums ${v === 0 ? "text-brand-gray-4" : "text-brand-ink font-semibold"}`}>{v}</td>
                    );
                  })}
                  <td className="px-3 py-3 text-right text-[#2563EB] text-xs font-semibold">{isOpen ? "Cerrar" : "Ver"}</td>
                </tr>
                {isOpen && (
                  <tr className="bg-brand-surface">
                    <td colSpan={steps.length + 2} className="px-5 py-4">
                      {tl === "loading" || tl === undefined ? (
                        <p className="text-sm text-brand-gray-4">Cargando actividad…</p>
                      ) : tl.length === 0 ? (
                        <p className="text-sm text-brand-gray-4">Sin actividad registrada.</p>
                      ) : (
                        <ol className="space-y-1.5">
                          {tl.map((e) => (
                            <li key={e.id} className="flex items-center gap-3 text-sm">
                              <span className="text-brand-gray-4 tabular-nums w-28 flex-shrink-0">{fmt(e.createdAt)}</span>
                              <span className="font-medium text-brand-ink">{EVENT_LABEL[e.event] ?? e.event}</span>
                              {e.channel && <span className="text-xs text-brand-gray-4 px-1.5 py-0.5 rounded-full bg-white border border-brand-border-1">{e.channel}</span>}
                              {e.client && <span className="text-xs text-brand-gray-4">· {e.client}</span>}
                              {e.lead && <span className="text-xs text-brand-gray-4">→ {e.lead}</span>}
                            </li>
                          ))}
                        </ol>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
