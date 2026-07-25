"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Confetti from "@/components/Confetti";

// Festejo del asesor: cuando abre el dashboard y llegó un referido nuevo desde
// su última visita, recibe una celebración (confeti + banner cálido) que lo
// empuja a contactar YA. Detección sin migración: guarda en localStorage los
// IDs de leads ya vistos y compara. En la PRIMERA visita solo fija la línea
// base (no festeja el historial). Marca vistos al montar → idempotente ante
// recargas; el banner se queda hasta que el asesor lo cierra o pica el CTA.

const KEY = "referidoo_seen_leads";

type Lead = { id: string; leadName: string; status: string; referrer: { name: string } };

export default function LeadFestejo({ referrals }: { referrals: Lead[] }) {
  const [fresh, setFresh] = useState<Lead[]>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const pending = referrals.filter((r) => r.status === "pending");
    let seen: string[] = [];
    let firstRun = false;
    try {
      const raw = localStorage.getItem(KEY);
      firstRun = raw === null;
      seen = raw ? JSON.parse(raw) : [];
    } catch {
      firstRun = true;
    }

    const nuevos = firstRun ? [] : pending.filter((r) => !seen.includes(r.id));

    // Nueva línea base: todo lo pendiente actual queda como "visto" (tope 200).
    try {
      const merged = Array.from(new Set([...seen, ...pending.map((r) => r.id)])).slice(-200);
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {}

    if (nuevos.length > 0) {
      setFresh(nuevos);
      setShow(true);
    }
  }, [referrals]);

  if (!show || fresh.length === 0) return null;

  const one = fresh.length === 1 ? fresh[0] : null;

  return (
    <div
      className="relative mb-6 overflow-hidden rounded-2xl border border-[#BFD3FF] bg-brand-blue-bg p-5"
      style={{ animation: "festejoIn .5s cubic-bezier(.34,1.3,.5,1) both" }}
      role="status"
    >
      <Confetti originY={0.22} count={70} />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-brand-ink">
            {one ? "¡Te llegó un referido nuevo!" : `¡Te llegaron ${fresh.length} referidos nuevos!`}
          </p>
          <p className="mt-0.5 text-sm text-brand-gray-2">
            {one ? (
              <><b className="font-semibold text-brand-ink">{one.leadName}</b> quiere que lo contactes · por {one.referrer.name}</>
            ) : (
              <>Varias personas quieren que las contactes. Entra antes de que se enfríen.</>
            )}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/admin/referidos"
              onClick={() => setShow(false)}
              className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
            >
              Contactar ahora
            </Link>
            <button
              onClick={() => setShow(false)}
              className="rounded-full px-3 py-2 text-sm font-medium text-brand-gray-3 transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          onClick={() => setShow(false)}
          aria-label="Cerrar"
          className="relative -mt-1 -mr-1 flex-shrink-0 p-1 text-brand-gray-4 transition hover:text-brand-gray-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <style>{`@keyframes festejoIn { 0% { opacity: 0; transform: translateY(-8px) scale(.98); } 100% { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}
