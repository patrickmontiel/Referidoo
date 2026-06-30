"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Tour, type TourStep } from "@/components/Tour";

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="greeting"]',
    title: "Tu resumen de un vistazo",
    body: "Aquí ves el estado general de tu programa: clientes activos, referidos recibidos y cuánto dinero se ha movido.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="stats"]',
    title: "Métricas del programa",
    body: "Clientes activos, referidos totales, convertidos y pendientes. Todo en tiempo real.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="recent"]',
    title: "Últimos referidos",
    body: "Los más recientes — quién los mandó y en qué etapa están. Haz clic en 'Ver todos' para gestionarlos.",
    placement: "top",
  },
];

type Referral = {
  id: string;
  leadName: string;
  leadPhone: string;
  status: string;
  rewardAmount: number;
  rewardStatus: string;
  createdAt: string;
  productType?: string | null;
  interestProductType?: string | null;
  referrer: { id: string; name: string };
};

type Advisor = { name: string; companyName: string | null; plan?: string };

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
  contacted:  "bg-amber-50 text-amber-700",
  in_process: "bg-amber-50 text-amber-700",
  converted:  "bg-green-50 text-green-700",
  rejected:   "bg-[#F4F5F7] text-[#6B727D]",
};

export default function AdminOverviewPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientCount, setClientCount] = useState(0);
  const [showTour, setShowTour] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handler = () => setShowTour(true);
    window.addEventListener("referidoo:tour", handler);
    return () => window.removeEventListener("referidoo:tour", handler);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/referrals").then((r) => r.json()),
      fetch("/api/advisor/me").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ])
      .then(([refs, adv, clients]) => {
        setReferrals(Array.isArray(refs) ? refs : []);
        setAdvisor(adv?.name ? adv : null);
        setClientCount(Array.isArray(clients) ? clients.filter((c: { active: boolean }) => c.active).length : 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pending = referrals.filter((r) => r.status === "pending" || r.status === "contacted" || r.status === "in_process").length;
  const converted = referrals.filter((r) => r.status === "converted").length;
  const totalPaid = referrals.filter((r) => r.rewardStatus === "paid").reduce((s, r) => s + r.rewardAmount, 0);
  const totalApproved = referrals.filter((r) => r.rewardStatus === "approved" && r.status === "converted").reduce((s, r) => s + r.rewardAmount, 0);

  const now = new Date();
  const monthYear =
    now.toLocaleDateString("es-MX", { month: "long", year: "numeric" })
      .replace(" de ", " ")
      .replace(/^\w/, (c) => c.toUpperCase());

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
      navigator.share({ url, title: "Únete a Referidoo", text: `Usa mi link para crear tu cuenta en Referidoo: ${url}` }).catch(() => {});
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
    <div className="max-w-2xl">
      {showTour && <Tour steps={TOUR_STEPS} onDone={() => setShowTour(false)} />}

      {/* Greeting */}
      <div data-tour="greeting" className="mb-6">
        <h1 className="text-[28px] font-bold text-brand-ink leading-tight">
          {advisor ? `Hola, ${advisor.name.split(" ")[0]}` : "Resumen"}
        </h1>
        <p className="text-sm text-brand-gray-4 mt-0.5">Resumen de tu actividad · {monthYear}</p>
      </div>

      {/* Stats */}
      <div data-tour="stats" className="mb-6">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {statCards.map((s) => (
            <div key={s.label} className="bg-[#F4F5F7] rounded-2xl p-5">
              <p className="text-[38px] font-bold text-[#0B0B0C] leading-none">{s.value}</p>
              <p className="text-sm text-brand-gray-4 mt-2">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="w-1/3 pr-1.5">
          <div className="bg-[#F4F5F7] rounded-2xl p-5">
            <p className="text-[38px] font-bold text-[#0B0B0C] leading-none">{pending}</p>
            <p className="text-sm text-brand-gray-4 mt-2">Pendientes</p>
          </div>
        </div>
      </div>

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
            <p className="text-brand-gray-4 text-sm">Aún no hay referidos.</p>
            <Link href="/admin/clientes" className="text-xs text-brand-ink underline mt-2 inline-block">
              Agrega tu primer cliente
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-brand-border-1">
            {referrals.slice(0, 5).map((r) => {
              const product = r.productType ?? r.interestProductType;
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
        <div className="bg-[#2563EB] rounded-2xl p-5 mb-5">
          <p className="text-xs font-bold text-white/60 uppercase tracking-[0.08em] mb-1.5">Tu link de referidos</p>
          <p className="font-bold text-white text-[15px] mb-4 break-all">{recruiterLink}</p>
          <div className="flex gap-2">
            <button
              onClick={copyRecruiterLink}
              className="bg-white text-[#0B0B0C] text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-white/90 active:scale-95 transition"
            >
              {copiedLink ? "¡Copiado ✓" : "Copiar link"}
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

      {/* Premios summary — black card */}
      <div className="bg-[#0B0B0C] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#9098A2] mb-1">Premios pagados</p>
          <p className="text-[28px] font-bold text-white leading-none">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#9098A2] mb-1">Por pagar</p>
          <p className="text-[28px] font-bold text-white leading-none">{formatCurrency(totalApproved)}</p>
        </div>
      </div>
    </div>
  );
}
