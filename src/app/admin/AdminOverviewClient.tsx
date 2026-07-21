"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import PrimerosPasosCard from "./PrimerosPasosCard";
import BolaDeNieveCard from "@/components/BolaDeNieveCard";

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  createdAt: string;
  saleAmount?: number | null;
  productType?: string | null;
  interestProductType?: string | null;
  referrer: { id: string; name: string };
};

const COMMISSION_RATES: Record<string, { freemium: number; paid: number }> = {
  PPR:          { freemium: 0.0025, paid: 0.0015 },
  Vida:         { freemium: 0.0025, paid: 0.0015 },
  "Daños/Auto": { freemium: 0.015,  paid: 0.008  },
  GMM:          { freemium: 0.015,  paid: 0.008  },
  Otro:         { freemium: 0.015,  paid: 0.008  },
};

const MEMBERSHIP_COST = 539;

type Advisor = { name: string; companyName: string | null; plan?: string; monthlyPriceMxn?: number; onboardedAt?: string | null };

function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function nameToSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const statusLabel: Record<string, string> = {
  pending:    "Nuevo",
  contacted:  "Contactado",
  in_process: "En proceso",
  converted:  "Convertido",
  rejected:   "Rechazado",
};

const statusStyle: Record<string, string> = {
  pending:    "bg-[#F4F5F7] text-[#6B727D]",
  contacted:  "bg-[#EBF2FF] text-[#2563EB]",
  in_process: "bg-amber-50 text-amber-700",
  converted:  "bg-green-50 text-green-700",
  rejected:   "bg-[#F4F5F7] text-[#6B727D]",
};

type AdminOverviewClientProps = {
  referrals: Referral[];
  advisor: Advisor | null;
  clientCount: number;
};

export default function AdminOverviewClient({ referrals, advisor, clientCount }: AdminOverviewClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const pending = referrals.filter((r) => r.status === "pending" || r.status === "contacted" || r.status === "in_process").length;
  const converted = referrals.filter((r) => r.status === "converted").length;
  const totalPaid = referrals.filter((r) => r.rewardStatus === "paid").reduce((s, r) => s + r.rewardAmount, 0);
  const totalApproved = referrals.filter((r) => r.rewardStatus === "approved" && r.status === "converted").reduce((s, r) => s + r.rewardAmount, 0);

  const now = new Date();
  const monthYear =
    now.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
      .replace(" de ", " ")
      .replace(/^\w/, (c) => c.toUpperCase());
  const monthName = now.toLocaleDateString("es-MX", { month: "long" });

  const isFreemium = advisor?.plan !== "paid";
  const allConverted = referrals.filter(
    (r) => r.status === "converted" && r.saleAmount
  );
  const freemiumCommission = allConverted.reduce((sum, r) => {
    const rate = COMMISSION_RATES[r.productType ?? "Otro"];
    return sum + (rate ? Math.round(r.saleAmount! * rate.freemium) : 0);
  }, 0);
  const proCommission = allConverted.reduce((sum, r) => {
    const rate = COMMISSION_RATES[r.productType ?? "Otro"];
    return sum + (rate ? Math.round(r.saleAmount! * rate.paid) : 0);
  }, 0);
  const commissionDiff = freemiumCommission - proCommission;
  const netWithPro = commissionDiff - MEMBERSHIP_COST;
  const showFreemiumCard = isFreemium && allConverted.length >= 1;

  const advisorSlug = advisor ? nameToSlug(advisor.name) : "";
  const recruiterLink = `referidoo.com/unete/${advisorSlug}`;

  function copyRecruiterLink() {
    navigator.clipboard.writeText(`https://${recruiterLink}`).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function shareRecruiterLink() {
    const url = `https://${recruiterLink}`;
    if (navigator.share) {
      navigator.share({ url, title: "Unete a Referidoo", text: `Usa mi link para crear tu cuenta en Referidoo: ${url}` }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  const statCards = [
    { value: clientCount,       label: "Clientes activos" },
    { value: referrals.length,  label: "Referidos totales" },
    { value: converted,         label: "Convertidos" },
  ];

  return (
    <div className="w-full">
      {/* Greeting */}
      <div data-tour="greeting" className="mb-6">
        <h1 className="text-[28px] font-bold text-brand-ink leading-tight">
          {advisor ? `Hola, ${advisor.name.split(" ")[0]}` : "Resumen"}
        </h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">Resumen de tu actividad · {monthYear}</p>
      </div>

      {/* Primeros Pasos */}
      <PrimerosPasosCard />

      {/* Stats */}
      <div data-tour="stats" className="mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {statCards.map((s) => (
            <div key={s.label} className="bg-[#F4F5F7] rounded-2xl p-5">
              <p className="text-[38px] font-bold text-[#0B0B0C] leading-none">{s.value}</p>
              <p className="text-sm mt-2" style={{ color: "#6B727D" }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="w-1/3 pr-1.5">
          <div className="bg-[#F4F5F7] rounded-2xl p-5">
            <p className="text-[38px] font-bold text-[#0B0B0C] leading-none">{pending}</p>
            <p className="text-sm mt-2" style={{ color: "#6B727D" }}>Pendientes</p>
          </div>
        </div>
      </div>

      {/* Tu bola de nieve — proyección de valor (arranque en frío) */}
      <BolaDeNieveCard initialClientCount={clientCount} />

      {/* Recent referrals */}
      <div data-tour="recent" className="bg-white rounded-2xl border border-brand-border-1 mb-5">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-bold text-[#0B0B0C] text-[15px]">Referidos recientes</h2>
          <Link href="/admin/referidos" className="text-sm font-medium text-[#2563EB] hover:text-blue-800 transition">
            Ver todos
          </Link>
        </div>
        {referrals.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-brand-gray-4 text-sm">Aun no hay referidos.</p>
            <Link href="/admin/clientes" className="text-xs text-brand-ink underline mt-2 inline-block">
              Agrega tu primer cliente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-brand-border-1">
            {referrals.slice(0, 5).map((r) => {
              const product = r.status === "converted" ? r.productType : r.interestProductType;
              return (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[13px] font-semibold text-[#3F4651] flex-shrink-0">
                    {getInitials(r.leadName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0B0B0C] truncate">{r.leadName}</p>
                    <p className="text-xs text-brand-gray-4 truncate">
                      {product ? `${product} · por ${r.referrer.name}` : `por ${r.referrer.name}`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusStyle[r.status] ?? "bg-[#F4F5F7] text-[#6B727D]"}`}>
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recruiter link blue card */}
      {advisor && (
        <div data-tour="link" className="bg-[#2563EB] rounded-2xl p-5 mb-5">
          <p className="text-xs font-bold text-white/60 uppercase tracking-[0.08em] mb-1.5">Invita a un colega</p>
          <p className="font-bold text-white text-[15px] mb-1.5 break-all">{recruiterLink}</p>
          <p className="text-[13px] text-[#CFE0FF] mb-4">
            Cuando tu invitado cierre su primer cliente, <b className="text-white">los dos ganan 1 mes de Pro</b> — tú y él.
          </p>
          <div className="flex gap-2">
            <button
              onClick={copyRecruiterLink}
              className="bg-white text-[#0B0B0C] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition"
            >
              {copiedLink ? "Copiado" : "Copiar link"}
            </button>
            <button
              onClick={shareRecruiterLink}
              className="border border-white/40 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/10 active:scale-95 transition"
            >
              Compartir
            </button>
          </div>
        </div>
      )}

      {/* Premios summary */}
      <div className="bg-[#0B0B0C] rounded-2xl p-5 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#9098A2] mb-1">Premios pagados</p>
          <p className="text-[28px] font-bold text-white leading-none">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9098A2] mb-1">Por pagar</p>
          <p className="text-[28px] font-bold text-white leading-none">{formatCurrency(totalApproved)}</p>
        </div>
      </div>

      {/* Resumen mensual freemium — al fondo */}
      {showFreemiumCard && (
        <div style={{ background: "#0d0d0d", borderRadius: 26, padding: 26, color: "#fff", position: "relative", overflow: "hidden" }}>
          {/* Glow esquina superior derecha */}
          <div style={{ position: "absolute", top: -70, right: -50, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(43,87,240,.45), transparent 70%)", pointerEvents: "none" }} />

          {/* Chip */}
          <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 999, padding: "6px 13px", width: "fit-content", marginBottom: 20, position: "relative" }}>
            <span style={{ fontWeight: 700, fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>Plan gratuito · acumulado</span>
          </div>

          {/* Contexto + número héroe */}
          <div style={{ fontWeight: 500, fontSize: 14, color: "rgba(255,255,255,.66)", position: "relative" }}>
            Te habrías ahorrado en total hasta ahora
          </div>
          <div style={{ marginTop: 4, marginBottom: 20, position: "relative" }}>
            <span style={{ fontWeight: 800, fontSize: 52, letterSpacing: "-.03em", color: "#fff", lineHeight: .95, display: "inline-block" }}>
              {formatCurrency(commissionDiff)}
            </span>
          </div>

          {/* Dos mini-cards */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, position: "relative" }}>
            <div style={{ flex: 1, background: "rgba(255,255,255,.06)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontWeight: 500, fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.3 }}>Comisiones en plan Gratuito</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{formatCurrency(freemiumCommission)}</div>
            </div>
            <div style={{ flex: 1, background: "rgba(255,255,255,.06)", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontWeight: 500, fontSize: 12.5, color: "rgba(255,255,255,.5)", lineHeight: 1.3 }}>Comisiones en plan Pro</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4, color: "#9db4fb" }}>{formatCurrency(proCommission)}</div>
            </div>
          </div>

          {/* Nota de cierre */}
          <div style={{ fontWeight: 500, fontSize: 12.5, color: "rgba(255,255,255,.5)", marginBottom: 20, lineHeight: 1.5, position: "relative" }}>
            {netWithPro >= 0 ? (
              <>Con tus {allConverted.length} conversión{allConverted.length !== 1 ? "es" : ""} ya pagarías tu membresía y tendrías <b style={{ color: "#fff" }}>{formatCurrency(netWithPro)}</b> extra neto.</>
            ) : (
              <>Con tus {allConverted.length} conversión{allConverted.length !== 1 ? "es" : ""} te faltan <b style={{ color: "#fff" }}>{formatCurrency(Math.abs(netWithPro))}</b> para cubrir tu membresía.</>
            )}
          </div>

          {/* CTA */}
          <Link
            href="/admin/perfil"
            style={{ display: "block", width: "100%", textAlign: "center", textDecoration: "none", background: "#fff", color: "#0d0d0d", fontFamily: "inherit", fontWeight: 700, fontSize: 14.5, padding: "15px 0", borderRadius: 999, position: "relative" }}
            className="hover:bg-white/90 active:scale-95 transition"
          >
            Actualizar a Pro · $539/mes
          </Link>
        </div>
      )}
    </div>
  );
}
