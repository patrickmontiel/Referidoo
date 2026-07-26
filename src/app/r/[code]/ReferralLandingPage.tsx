"use client";

import { useEffect, useState } from "react";
import Confetti from "@/components/Confetti";
import { useParams } from "next/navigation";
import { Hanken_Grotesk } from "next/font/google";
import { Logo } from "@/components/Logo";
import { DEFAULT_REFERRAL_WELCOME_MESSAGE, renderMessage } from "@/lib/message-templates";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

type ReferralInfo = {
  referrerName: string;
  advisorName: string;
  companyName: string | null;
  welcomeMessage: string | null;
  schedulingUrl: string | null;
  credential: string | null;
  yearsExperience: number | null;
  peopleServed: number | null;
  nextReward: number;
};

// Abre el link de agenda del asesor con el nombre/correo del lead prellenados
// donde el proveedor lo soporta (Calendly y Cal.com usan ?name=&email=; Google
// ignora los params desconocidos sin romperse).
function buildBookingUrl(base: string, name: string, email: string): string {
  try {
    const u = new URL(base);
    if (name && !u.searchParams.has("name")) u.searchParams.set("name", name);
    if (email && !u.searchParams.has("email")) u.searchParams.set("email", email);
    return u.toString();
  } catch {
    return base;
  }
}

type Step = "landing" | "form" | "success";

// Etiquetas amigables para el lead → valor canónico que ve el asesor en su
// panel (interestProductType usa el mismo vocabulario que productType:
// PPR / Vida / GMM / Daños/Auto). "Aún no sé" no fija ningún producto.
const INTERESTS: { label: string; value: string }[] = [
  { label: "Plan de retiro / ahorro", value: "PPR" },
  { label: "Seguro de vida", value: "Vida" },
  { label: "Gastos médicos mayores", value: "GMM" },
  { label: "Seguro de auto", value: "Daños/Auto" },
  { label: "Aún no sé", value: "" },
];

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
  const [form, setForm] = useState({ name: "", phone: "", email: "", interest: "", preferredDays: "", preferredHours: "" });

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
    if (!form.name || !form.phone || !form.email) return;
    setSubmitting(true);

    const res = await fetch("/api/referrals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referralCode: code,
        leadName: form.name,
        leadPhone: form.phone,
        leadEmail: form.email,
        interestProductType: INTERESTS.find((i) => i.label === form.interest)?.value || null,
        preferredDays: form.preferredDays,
        preferredHours: form.preferredHours,
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
      <div className={`min-h-screen bg-white flex items-center justify-center ${hankenGrotesk.className}`}>
        <div className="w-5 h-5 border-2 border-brand-ink border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className={`min-h-screen bg-white flex items-center justify-center px-6 text-center ${hankenGrotesk.className}`}>
        <div>
          <p className="text-5xl mb-5">🔗</p>
          <h1 className="text-xl font-bold mb-2 text-brand-ink">Enlace no válido</h1>
          <p className="text-brand-gray-4 text-sm">{error || "Este enlace ya no está activo."}</p>
        </div>
      </div>
    );
  }

  const firstName = info.referrerName.split(" ")[0];

  if (step === "success") {
    return (
      <div className={`min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center ${hankenGrotesk.className}`}
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <Confetti originY={0.32} />
        <style>{`@keyframes popIn { 0% { opacity: 0; transform: scale(.6); } 60% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }`}</style>
        <div className="max-w-xs w-full">
          <div className="w-16 h-16 bg-brand-ink rounded-full flex items-center justify-center mx-auto mb-6"
               style={{ animation: "popIn .5s cubic-bezier(.34,1.3,.5,1) both" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M5 12L10 17L19 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-3 text-brand-ink">
            Listo, {form.name.split(" ")[0]}
          </h1>
          {info.schedulingUrl ? (
            <>
              <p className="text-brand-gray-4 text-sm leading-relaxed mb-5">
                Tus datos ya le llegaron. Si quieres, aparta tu radiografía ahora mismo — o él te escribe.
              </p>
              <a
                href={buildBookingUrl(info.schedulingUrl, form.name, form.email)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-[#2563EB] text-white text-base font-semibold py-4 rounded-full shadow-[0_8px_24px_rgba(37,99,235,.28)] hover:bg-[#1D4ED8] active:scale-[0.98] transition mb-8"
              >
                Aparta mi radiografía →
              </a>
            </>
          ) : (
            <p className="text-brand-gray-4 text-sm leading-relaxed mb-8">
              {info.advisorName.split(" ")[0]} te va a escribir por WhatsApp para agendar tu radiografía. Sin compromiso — tú decides si sigues.
            </p>
          )}
          <div className="bg-brand-surface rounded-[20px] p-4 text-left">
            <p className="text-[11px] text-brand-gray-4 uppercase tracking-[0.08em] font-bold mb-1">
              Te recomendó
            </p>
            <p className="font-bold text-brand-ink">{info.referrerName}</p>
            <p className="text-sm text-brand-gray-4">{info.companyName ?? info.advisorName}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className={`min-h-screen bg-white flex flex-col ${hankenGrotesk.className}`}
           style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex-1 flex flex-col justify-center px-6 max-w-sm mx-auto w-full py-10">
          <button
            onClick={() => setStep("landing")}
            className="flex items-center gap-2 text-sm text-brand-gray-4 mb-8 -ml-1 py-2 px-1 active:opacity-60 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19L5 12L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Volver
          </button>

          <p className="text-xs font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
            Último paso
          </p>
          <h2 className="text-2xl font-bold mb-5 text-brand-ink">¿Cómo te contactamos?</h2>
          <div className="bg-brand-ink rounded-[20px] p-4 mb-8">
            <p className="text-sm text-white/90 leading-relaxed">
              Tu asesor te escribe por WhatsApp para agendar tu radiografía cuando te acomode. Sin llamadas sorpresa, sin compromiso.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
                Tu nombre *
              </label>
              <input
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Tu nombre"
                className="w-full px-4 py-3.5 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
                Tu WhatsApp *
              </label>
              <input
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                placeholder="55 1234 5678"
                className="w-full px-4 py-3.5 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
              <p className="text-[11px] text-brand-gray-4 mt-1.5">Ahí te escribe tu asesor.</p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
                Correo *
              </label>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="tu@correo.com"
                className="w-full px-4 py-3.5 rounded-2xl border border-brand-border-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-ink transition"
              />
            </div>

            {/* Producto de interés (opcional) — le llega al asesor como interestProductType */}
            <div>
              <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
                ¿Sobre qué te gustaría platicar?
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((it) => {
                  const active = form.interest === it.label;
                  return (
                    <button
                      key={it.label}
                      type="button"
                      onClick={() => setForm({ ...form, interest: active ? "" : it.label })}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-[0.97] ${
                        active
                          ? "bg-[#2563EB] text-white border-[#2563EB]"
                          : "bg-white text-brand-gray-1 border-brand-border-4"
                      }`}
                    >
                      {it.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferencias de contacto (opcionales) — para que el asesor te busque cuando te acomode */}
            <div>
              <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
                ¿Qué días te acomoda?
              </label>
              <div className="flex flex-wrap gap-2">
                {["Entre semana", "Fin de semana", "Cualquier día"].map((d) => {
                  const active = form.preferredDays === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, preferredDays: active ? "" : d })}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-[0.97] ${
                        active
                          ? "bg-brand-ink text-white border-brand-ink"
                          : "bg-white text-brand-gray-1 border-brand-border-4"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-brand-gray-3 uppercase tracking-[0.08em] mb-2">
                ¿A qué hora?
              </label>
              <div className="flex flex-wrap gap-2">
                {["Mañana · 8–11am", "Medio día · 11am–1pm", "Comida · 1–4pm", "Tarde · 4–7pm", "Noche · 7–9pm", "Cualquier hora"].map((h) => {
                  const active = form.preferredHours === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setForm({ ...form, preferredHours: active ? "" : h })}
                      className={`px-3.5 py-2 rounded-full text-sm font-medium border transition active:scale-[0.97] ${
                        active
                          ? "bg-brand-ink text-white border-brand-ink"
                          : "bg-white text-brand-gray-1 border-brand-border-4"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-brand-danger-ink text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !form.name || !form.phone || !form.email}
              className="w-full bg-[#2563EB] text-white text-base font-semibold py-4 rounded-full shadow-[0_8px_24px_rgba(37,99,235,.28)] hover:bg-[#1D4ED8] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none transition mt-2"
            >
              {submitting ? "Enviando..." : "Aparta mi radiografía gratis"}
            </button>
            <p className="text-[11px] text-brand-gray-4 text-center">
              Solo la usamos para contactarte. Nada de spam.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // Landing step — el amigo te abre una puerta: una radiografía de tu dinero, gratis
  const company = info.companyName ?? info.advisorName;
  return (
    <div className={`relative min-h-screen bg-white ${hankenGrotesk.className}`}
         style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Glow premium superior */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(37,99,235,0.10),transparent_70%)]" />

      <div className="relative px-6 max-w-sm mx-auto w-full pt-12 pb-36">
        <div className="landing-stagger">
          {/* Brand */}
          <div className="flex items-center gap-2 mb-9">
            <Logo size="sm" />
            <span className="text-[11px] text-brand-gray-4">· {company}</span>
          </div>

          {/* El amigo primero — confianza antes que nada */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-brand-ink text-white flex items-center justify-center text-[15px] font-bold flex-shrink-0 ring-[3px] ring-white shadow-[0_4px_14px_rgba(0,0,0,.12)]">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <p className="text-sm text-brand-gray-2"><b className="font-semibold text-brand-ink">{firstName}</b> pensó en ti</p>
          </div>

          <h1 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.02em] text-brand-ink mb-3">
            Una radiografía de tu dinero, <span className="text-brand-blue">sin costo.</span>
          </h1>
          <p className="text-[15px] text-brand-gray-2 leading-relaxed mb-7">
            {firstName} trabaja con {company} y le pidió que te dé la misma revisión que a {firstName} le abrió los ojos. 20 minutos, sin venta.
          </p>

          {/* La recomendación del amigo — protagonista y creíble */}
          <div className="relative overflow-hidden bg-brand-ink rounded-[22px] p-5 mb-7">
            <div aria-hidden="true" className="pointer-events-none absolute -top-12 -right-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.35),transparent_70%)]" />
            <div className="relative flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{info.referrerName}</p>
                <p className="text-[11px] text-white/45">te lo recomienda de corazón</p>
              </div>
            </div>
            <p className="relative text-[15px] text-white/90 leading-relaxed">
              {renderMessage(info.welcomeMessage || DEFAULT_REFERRAL_WELCOME_MESSAGE, { nombre: firstName })}
            </p>
          </div>

          {/* Credibilidad del asesor — quién te va a atender (solo si la capturó) */}
          {(info.credential || info.yearsExperience != null || info.peopleServed != null) && (
            <div className="rounded-[22px] border border-brand-border-1 bg-white p-5 mb-7 shadow-[0_2px_22px_rgba(0,0,0,.05)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-ink text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {info.advisorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-brand-ink truncate">{info.advisorName}</p>
                  <p className="text-[11px] text-brand-gray-4 truncate">Quien te va a atender · {company}</p>
                </div>
              </div>
              {(info.yearsExperience != null || info.peopleServed != null) && (
                <div className="flex gap-8 mt-4">
                  {info.yearsExperience != null && (
                    <div>
                      <p className="text-xl font-extrabold text-brand-ink tabular-nums leading-none">{info.yearsExperience}</p>
                      <p className="text-[11px] text-brand-gray-4 mt-1 leading-tight">años de<br />experiencia</p>
                    </div>
                  )}
                  {info.peopleServed != null && (
                    <div>
                      <p className="text-xl font-extrabold text-brand-ink tabular-nums leading-none">{info.peopleServed.toLocaleString("es-MX")}</p>
                      <p className="text-[11px] text-brand-gray-4 mt-1 leading-tight">personas<br />atendidas</p>
                    </div>
                  )}
                </div>
              )}
              {info.credential && (
                <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-brand-border-1">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-brand-success-ink flex-shrink-0">
                    <path d="M12 2L20 5V11C20 16 16.5 19.5 12 21C7.5 19.5 4 16 4 11V5L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12L11.5 14.5L15.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <p className="text-[11px] text-brand-gray-3">{info.credential}</p>
                </div>
              )}
            </div>
          )}

          {/* Qué vas a ver — el valor, en beneficios concretos */}
          <div className="rounded-[22px] border border-brand-border-1 bg-white p-5 mb-6 shadow-[0_2px_22px_rgba(0,0,0,.05)]">
            <p className="text-[13px] font-bold text-brand-ink mb-4">En tu radiografía vas a ver:</p>
            <div className="space-y-3.5">
              {[
                { icon: <GrowthIcon />, text: "Cuánto podrías estar ahorrando en impuestos cada año" },
                { icon: <ShieldIcon />, text: "Si tu familia quedaría protegida si algo te pasara hoy" },
                { icon: <ChatIcon />, text: "Un plan claro para tu dinero, en español y sin tecnicismos" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-blue-bg text-brand-blue flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <p className="text-sm text-brand-gray-1 leading-snug">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Cero riesgo */}
          <div className="flex flex-wrap gap-2">
            {["Gratis", "Sin compromiso", "20 minutos", "Tú decides"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-gray-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-success-ink"><path d="M20 6 9 17l-5-5"/></svg>
                {t}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* CTA fija — siempre alcanzable con el pulgar, sin depender de scroll */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 px-6 pt-8 bg-gradient-to-t from-white via-white to-transparent"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <div className="landing-cta max-w-sm mx-auto">
          <button
            onClick={() => setStep("form")}
            className="w-full bg-brand-blue text-white text-base font-semibold py-4 rounded-full shadow-[0_8px_24px_rgba(37,99,235,.28)] hover:bg-[#1D4ED8] active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            Quiero mi radiografía gratis
          </button>
          <p className="text-center text-[11px] text-brand-gray-4 mt-2.5">
            Te la recomienda <strong className="text-brand-gray-3">{info.referrerName}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
