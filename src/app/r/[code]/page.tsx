"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Logo } from "@/components/Logo";

type ReferralInfo = {
  referrerName: string;
  advisorName: string;
  companyName: string | null;
  welcomeMessage: string | null;
  nextReward: number;
};

type Step = "landing" | "form" | "success";

function GrowthIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M3 3V21H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 16L11 11L15 14L21 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L20 5V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11.5 14.5L15.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.6868 20 9.44 19.7295 8.32 19.2353L3 20.5L4.39 16.28C3.5 15.0354 3 13.5482 3 11.5C3 6.80558 7.02944 3 12 3C16.9706 3 21 6.80558 21 11.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 8V11.5L14 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ReferralLandingPage() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [step, setStep] = useState<Step>("landing");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  useEffect(() => {
    fetch(`/api/referral-info/${code}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError("Este enlace no es válido.");
        else setInfo(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Error al cargar.");
        setLoading(false);
      });
  }, [code]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);

    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: code,
        leadName: form.name,
        leadPhone: form.phone,
        leadEmail: form.email,
      }),
    });

    if (res.ok) setStep("success");
    else {
      const data = await res.json();
      setError(data.error ?? "Error al enviar");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-5xl mb-5">🔗</p>
          <h1 className="text-xl font-semibold mb-2">Enlace no válido</h1>
          <p className="text-gray-400 text-sm">{error || "Este enlace ya no está activo."}</p>
        </div>
      </div>
    );
  }

  const firstName = info.referrerName.split(" ")[0];

  if (step === "success") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-xs w-full">
          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 12L10 17L19 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-3">
            Listo, {form.name.split(" ")[0]}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            Tu asesor te contactará pronto para platicar sobre tu situación patrimonial sin ningún compromiso.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 text-left">
            <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mb-1">
              Te recomendó
            </p>
            <p className="font-semibold">{info.referrerName}</p>
            <p className="text-sm text-gray-500">{info.companyName ?? info.advisorName}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="min-h-screen bg-white flex flex-col"
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full py-10">
          <button
            onClick={() => setStep("landing")}
            className="flex items-center gap-2 text-sm text-gray-400 mb-8 -ml-1 active:opacity-60 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>

          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-2">
            Un paso más
          </p>
          <h2 className="text-2xl font-semibold mb-5">Tus datos</h2>
          <div className="bg-black rounded-2xl p-4 mb-8">
            <p className="text-sm text-white/90 leading-relaxed">
              Tu asesor te contacta para explicarte cómo funciona. Sin formularios largos, sin compromiso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                Nombre completo *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Tu nombre"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                WhatsApp / Teléfono *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                placeholder="55 1234 5678"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
                Correo (opcional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !form.name || !form.phone}
              className="w-full bg-black text-white text-sm font-semibold py-4 rounded-2xl hover:bg-gray-900 active:scale-[0.98] disabled:opacity-40 transition mt-2"
            >
              {submitting ? "Enviando..." : "Quiero que me contacten"}
            </button>
            <p className="text-[11px] text-gray-400 text-center">
              Tu información solo será usada para contactarte. Nada más.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Landing step — FOMO financiero
  return (
    <div className="min-h-screen bg-white flex flex-col"
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="flex-1 flex flex-col justify-between px-6 max-w-sm mx-auto w-full pt-14 pb-8">

        {/* Top */}
        <div className="landing-stagger">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-8">
            <Logo size="sm" />
            <span className="text-[11px] text-gray-400">
              · {info.companyName ?? info.advisorName}
            </span>
          </div>

          <p className="text-sm text-gray-400 mb-2">{firstName} te quiere compartir algo</p>
          <h1 className="text-[2rem] font-semibold leading-tight tracking-tight mb-5">
            Tu amigo ya está cuidando su futuro.
            <span className="text-gray-400"> ¿Y el tuyo?</span>
          </h1>

          <div className="bg-black rounded-2xl p-4 mb-8">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
              Mensaje de {firstName}
            </p>
            <p className="text-sm text-white/90 leading-relaxed">
              {info.welcomeMessage ||
                `${firstName} ya tiene un plan de vida y retiro, y cree que a ti también te puede convenir. Sin compromiso — solo es información.`}
            </p>
          </div>

          {/* Social proof row */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex -space-x-2">
              <div className="w-7 h-7 rounded-full bg-black border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                {firstName.charAt(0).toUpperCase()}
              </div>
              {["A", "M"].map((l) => (
                <div key={l} className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600">
                  {l}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {firstName} y otras personas ya cuidan su futuro financiero con {info.companyName ?? info.advisorName}
            </p>
          </div>

          {/* What you'll learn */}
          <div className="space-y-3">
            {[
              { icon: <GrowthIcon />, text: "Qué es un PPR y cómo te ayuda a pagar menos impuestos" },
              { icon: <ShieldIcon />, text: "Cómo funciona un seguro de vida con valor en inversión" },
              { icon: <ChatIcon />, text: "Una plática de 20 minutos, sin compromiso ni presión" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-700 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <p className="text-sm text-gray-700 leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="landing-cta mt-10">
          <button
            onClick={() => setStep("form")}
            className="w-full bg-black text-white text-sm font-semibold py-4 rounded-2xl hover:bg-gray-900 active:scale-[0.98] transition"
          >
            Quiero conocer mi oportunidad
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-3">
            Te lo recomienda <strong className="text-gray-600">{info.referrerName}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
