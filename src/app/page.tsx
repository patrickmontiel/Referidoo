import { redirect } from "next/navigation";
import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { getAdvisorSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ScrollReveal } from "@/components/ScrollReveal";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={`flex-shrink-0 ${className}`}>
      <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className={`flex-shrink-0 ${className}`}>
      <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SECTION_HEADING = "font-extrabold tracking-[-0.028em] text-[#0B0B0C]";
const SECTION_HEADING_SIZE = { fontSize: "clamp(1.75rem, 4vw, 39px)" };

const FEATURES = [
  {
    title: "Seguimiento de referidos",
    body: "Cada referido que llega por el link de un cliente aparece en tu pipeline — quién lo mandó, cuándo, y en qué etapa está.",
  },
  {
    title: "Premios automáticos",
    body: "Escalera de premios para Vida y PPR, premios burbuja para Auto y GMM. Tú configuras los montos, Referidoo hace las cuentas.",
  },
  {
    title: "Portal para tus clientes",
    body: "Cada cliente recibe su propio link de referidos y un portal donde ve su progreso y reclama premios — sin que tú tengas que estar checando WhatsApp.",
  },
  {
    title: "Cobros y planes seguros",
    body: "Suscripción mensual cobrada automáticamente vía Mercado Pago. Sin transferencias manuales, sin recordatorios de pago.",
  },
];

const COMPARISON = [
  { antes: "Cuentas tus referidos a mano, en un chat de WhatsApp que ya nadie revisa", despues: "Cada referido se registra solo — su estatus siempre a la vista, sin perseguir a nadie" },
  { antes: "Se te olvida quién te refirió a quién, o cuánto le debes", despues: "El premio se calcula solo, con tus propias reglas. Cero cuentas a mano" },
  { antes: "Tu cliente no tiene idea de cuánto le falta para su premio, ni cómo reclamarlo", despues: "Tu cliente ve su progreso y reclama su premio solo, desde su propio portal" },
];

const SECURITY_FAQ = [
  {
    question: "¿Mis clientes tienen que dar información sensible?",
    answer: "No. Solo nombre, teléfono y correo — lo mismo que ya te comparten por WhatsApp. Nunca pedimos RFC, cuentas bancarias ni datos de la póliza.",
  },
  {
    question: "¿Quién puede ver los datos de mis clientes?",
    answer: "Solo tú. Nadie más entra a tu cuenta, y no vendemos ni compartimos tu información con terceros — ni con otros asesores.",
  },
  {
    question: "¿Cómo protegen mi contraseña?",
    answer: "Se guarda cifrada con bcrypt, nunca en texto plano. Ni nosotros podemos ver tu contraseña real.",
  },
  {
    question: "¿Guardan los datos de mi tarjeta?",
    answer: "No. El cobro pasa por Mercado Pago, que tokeniza tu tarjeta — Referidoo nunca ve ni guarda tu número completo.",
  },
  {
    question: "¿Dónde se guarda toda la información?",
    answer: "En una base de datos cifrada, con conexión segura (HTTPS) en todo momento — la misma infraestructura que usan miles de aplicaciones reales todos los días.",
  },
  {
    question: "¿Qué pasa si cancelo mi cuenta?",
    answer: "Cancelas cuando quieras, sin penalización. Tus datos no se venden ni se quedan dando vueltas en ningún lado.",
  },
];

export default async function Home() {
  const session = await getAdvisorSession();
  if (session) redirect("/admin");

  return (
    <div className={`bg-white ${hankenGrotesk.className}`} style={{ WebkitFontSmoothing: "antialiased" }}>
      <LandingHeader />

      {/* Acceso anticipado */}
      <div className="bg-[#2563EB] text-white text-center text-xs font-medium" style={{ paddingTop: 11, paddingBottom: 11 }}>
        Acceso anticipado — sé de los primeros asesores en usarlo
      </div>

      {/* Hero */}
      <section className="max-w-[1180px] mx-auto px-8 pt-16 pb-12 grid md:grid-cols-2 gap-16 items-center">
        <div className="landing-stagger">
          <h1 className="font-extrabold tracking-[-0.03em] leading-[1.04] mb-5 text-[#0B0B0C] text-balance" style={{ fontSize: "clamp(2.5rem, 5.5vw, 60px)" }}>
            El sistema de referidos
            <br />
            que no existía. Hasta ahora.
          </h1>
          <p className="text-[#5A626E] leading-[1.6] mb-8 max-w-md" style={{ fontSize: 18 }}>
            Referidoo es para asesores de seguros y planes financieros en México.
            Antes, cada referido vivía en un chat de WhatsApp o una fila de Excel.
            Ahora se registra solo, se calcula solo, y se paga solo.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/registro" className="text-sm font-medium bg-[#0B0B0C] text-white px-5 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
              Crear cuenta gratis
            </Link>
            <Link href="/login" className="text-sm font-medium text-[#3F4651] hover:text-[#0B0B0C] px-5 py-3 rounded-full border border-[#DADCE0] hover:border-[#0B0B0C] transition-[background-color,transform,border-color] duration-150 active:scale-[0.97]">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="text-xs text-[#8A8F98] mt-4">Plan gratis — clientes ilimitados. Sin tarjeta para empezar.</p>
        </div>

        <div
          className="landing-cta bg-[#F4F5F7] rounded-[22px] border border-[#EAEBED] p-5 select-none"
          style={{ boxShadow: "0 12px 48px rgba(15,23,42,.12)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-[15px] text-[#0B0B0C] leading-tight">Hola, Eduardo</p>
              <p className="text-xs text-[#8A8F98]">Resumen · Julio 2026</p>
            </div>
            <span className="text-[11px] font-bold text-[#8A8F98] uppercase tracking-[0.08em]">Ejemplo</span>
          </div>

          {/* 4 stat cards in a row */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { value: "5", label: "Clientes" },
              { value: "12", label: "Referidos" },
              { value: "4", label: "Convertidos" },
              { value: "3", label: "Pendientes" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-[14px] p-3">
                <p className="text-xl font-bold text-[#0B0B0C] leading-none">{s.value}</p>
                <p className="text-[10px] text-[#6B727D] mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main: referrals list + right column */}
          <div className="grid grid-cols-[1fr_140px] gap-2">
            {/* Referrals list */}
            <div className="bg-white rounded-[14px] overflow-hidden">
              <div className="px-3 py-2.5 border-b border-[#F4F5F7]">
                <p className="text-[11px] font-bold text-[#0B0B0C]">Referidos recientes</p>
              </div>
              {[
                { name: "María López", sub: "Vida · Alejandro R.", badge: "Contactado", blue: true },
                { name: "Carlos Pérez", sub: "PPR · Ana G.", badge: "Convertido", green: true },
                { name: "Rosa Flores", sub: "por Javier M.", badge: "Nuevo", gray: true },
              ].map((r) => (
                <div key={r.name} className="flex items-center gap-2.5 px-3 py-2 border-b border-[#F4F5F7] last:border-0">
                  <div className="w-7 h-7 rounded-full bg-[#F4F5F7] flex items-center justify-center text-[9px] font-bold text-[#3F4651] flex-shrink-0">
                    {r.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#0B0B0C] truncate">{r.name}</p>
                    <p className="text-[9px] text-[#8A8F98] truncate">{r.sub}</p>
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${r.green ? "bg-green-50 text-green-700" : r.blue ? "bg-[#EBF2FF] text-[#2563EB]" : "bg-[#F4F5F7] text-[#6B727D]"}`}>
                    {r.badge}
                  </span>
                </div>
              ))}
            </div>

            {/* Right column: link card + earnings */}
            <div className="flex flex-col gap-2">
              <div className="bg-[#2563EB] rounded-[14px] p-3 flex-1">
                <p className="text-[9px] font-bold text-white/60 uppercase tracking-[0.06em] mb-1">Tu link</p>
                <p className="text-[10px] font-bold text-white leading-tight mb-2.5">referidoo.com/c/eduardo</p>
                <div className="bg-white/20 rounded-full px-2 py-1 text-[9px] font-semibold text-white text-center">
                  Copiar
                </div>
              </div>
              <div className="bg-[#0B0B0C] rounded-[14px] p-3">
                <p className="text-[9px] text-[#9098A2] mb-1">Premios pagados</p>
                <p className="text-base font-bold text-white leading-none">$4,500</p>
                <p className="text-[9px] text-[#9098A2] mt-2 mb-0.5">Por pagar</p>
                <p className="text-sm font-bold text-white leading-none">$1,500</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature highlight */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="max-w-[760px] mx-auto text-center">
          <h2 className={`${SECTION_HEADING} mb-4 text-balance`} style={SECTION_HEADING_SIZE}>
            Cobra automático, sin perseguir pagos
          </h2>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 18 }}>
            Tu suscripción se cobra sola, cada mes, vía Mercado Pago — sin que
            tengas que acordarte. Y cuando un referido cierra, Referidoo ya sabe
            cuánto te toca: escalera para Vida y PPR, premios burbuja para Auto
            y Gastos Médicos Mayores. Configura tus reglas una vez; el sistema
            hace las cuentas para siempre.
          </p>
        </ScrollReveal>
      </section>

      {/* Cómo se calculan los premios */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center mb-10">
          <h2 className={`${SECTION_HEADING} mb-4 max-w-xl mx-auto text-balance`} style={SECTION_HEADING_SIZE}>
            Tú pones los montos. Referidoo hace las cuentas.
          </h2>
          <p className="text-[#5A626E] max-w-md mx-auto leading-[1.6] mb-3" style={{ fontSize: 18 }}>
            Dos formas de premiar, según el producto — tú decides los números,
            el sistema nunca se equivoca.
          </p>
          <Link href="/como-funciona" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:gap-2.5 transition-[gap]">
            Ver cómo funciona, paso a paso
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-4">
          <ScrollReveal className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Vida y PPR</p>
            <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-4">Escalera de premios</h3>
            <div className="space-y-2 mb-4">
              {[
                { label: "1er referido convertido", amount: "$1,500" },
                { label: "2do referido convertido", amount: "$1,500" },
                { label: "3er referido convertido", amount: "$2,500" },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center justify-between bg-white rounded-[12px] border border-[#ECEDEF] px-4 py-2.5">
                  <span className="text-sm text-[#3F4651] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#0B0B0C] text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    {step.label}
                  </span>
                  <span className="text-sm font-bold text-[#0B0B0C]">{step.amount}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#8A8F98] leading-relaxed">
              Cada venta sube un nivel. Tú eliges qué pasa después del último —
              ¿vuelve a empezar, se queda fijo, o paga un monto plano? Los montos
              de ejemplo son los que trae el sistema por default; tú los cambias
              cuando quieras desde tu panel.
            </p>
          </ScrollReveal>

          <ScrollReveal delayMs={60} className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Auto y Gastos Médicos Mayores</p>
            <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-4">Premios burbuja</h3>

            {/* Fondo + pts */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-[0.08em]">Fondo compartido</span>
              <span className="text-sm font-bold text-[#0B0B0C]">450 / 500 pts</span>
            </div>

            {/* Bubble visualization */}
            <div className="bg-white rounded-[12px] border border-[#ECEDEF] px-4 pt-4 pb-3 mb-3 relative overflow-hidden" style={{ minHeight: 110 }}>
              {/* META dashed line */}
              <div className="absolute left-0 right-0" style={{ top: 18 }}>
                <div className="border-t border-dashed border-[#2563EB]/40 mx-4" />
                <span className="absolute right-4 -top-2.5 text-[9px] font-bold text-[#2563EB] tracking-[0.06em]">META · 500</span>
              </div>
              {/* Circles */}
              <div className="flex items-end gap-3 mt-3">
                {/* GMM — largest, dark blue */}
                <div className="flex flex-col items-center justify-center rounded-full bg-[#1D4ED8] text-white flex-shrink-0" style={{ width: 68, height: 68 }}>
                  <span className="text-[11px] font-bold leading-tight">GMM</span>
                  <span className="text-[10px] font-semibold text-white/80">+300</span>
                </div>
                {/* Auto — medium, lighter blue */}
                <div className="flex flex-col items-center justify-center rounded-full bg-[#3B82F6] text-white flex-shrink-0" style={{ width: 50, height: 50 }}>
                  <span className="text-[10px] font-bold leading-tight">Auto</span>
                  <span className="text-[9px] font-semibold text-white/80">+150</span>
                </div>
                {/* Empty slots */}
                <div className="rounded-full border-2 border-dashed border-[#DADCE0] flex-shrink-0" style={{ width: 40, height: 40 }} />
                <div className="rounded-full border-2 border-dashed border-[#DADCE0] flex-shrink-0" style={{ width: 40, height: 40 }} />
              </div>
            </div>

            <p className="text-xs text-[#8A8F98] leading-relaxed mb-3 flex items-start gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#2563EB] flex-shrink-0 mt-0.5" />
              Auto y GMM suman al mismo fondo — montos y meta configurables.
            </p>
            <p className="text-xs text-[#8A8F98] leading-relaxed">
              Cada venta suma puntos a un mismo fondo. Al llegar al umbral que tú
              definas, tu cliente ve el premio listo para reclamar directamente
              desde su portal — sin que tengas que avisarle.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center">
          <h2 className={`${SECTION_HEADING} mb-10 max-w-xl mx-auto text-balance`} style={SECTION_HEADING_SIZE}>
            Todo lo que necesitas para no perder ni un referido
          </h2>
        </ScrollReveal>
        <div>
          {FEATURES.map((f, i) => (
            <ScrollReveal key={f.title} delayMs={i * 60}>
              <div
                className={`grid gap-4 py-6 px-3 -mx-3 rounded-[12px] hover:bg-[#FAFAFB] transition-colors ${i > 0 ? "border-t border-[#EFEFF1]" : ""}`}
                style={{ gridTemplateColumns: "64px 1fr" }}
              >
                <span className="text-[#2563EB] font-extrabold text-2xl">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-1.5">{f.title}</h3>
                  <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 16 }}>{f.body}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-10 text-center text-balance`} style={SECTION_HEADING_SIZE}>
            Antes vs. con Referidoo
          </h2>
        </ScrollReveal>
        <div className="relative grid md:grid-cols-2 gap-6 max-w-[820px] mx-auto">
          <ScrollReveal className="bg-[#F4F5F7] rounded-[20px] p-6">
            <p className="text-xs font-bold text-[#8A8F98] uppercase tracking-[0.08em] mb-4">Antes</p>
            <div className="space-y-4">
              {COMPARISON.map((row, i) => (
                <div key={i} className={`flex items-start gap-3 ${i > 0 ? "pt-4 border-t border-[#EAEBED]" : ""}`}>
                  <span className="w-5 h-5 rounded-full bg-[#F0DDE2] text-[#C2566B] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <XIcon />
                  </span>
                  <p className="text-sm text-[#5A626E]">{row.antes}</p>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delayMs={60}>
            <div
              className="bg-white rounded-[20px] p-6 border-2 border-[#2563EB]"
              style={{ boxShadow: "0 10px 30px rgba(37,99,235,.12)" }}
            >
              <div className="text-xs font-bold text-[#2563EB] uppercase tracking-[0.08em] mb-4 flex items-center gap-1.5">
                Con <Logo size="sm" />
              </div>
              <div className="space-y-4">
                {COMPARISON.map((row, i) => (
                  <div key={i} className={`flex items-start gap-3 ${i > 0 ? "pt-4 border-t border-[#EAEBED]" : ""}`}>
                    <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon />
                    </span>
                    <p className="text-sm font-medium text-[#0B0B0C]">{row.despues}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#0B0B0C] text-white text-xs font-bold items-center justify-center z-10">
            vs
          </div>
        </div>
      </section>

      {/* Seguridad y privacidad */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="max-w-[680px] mx-auto">
          <h2 className={`${SECTION_HEADING} mb-3 text-center text-balance`} style={SECTION_HEADING_SIZE}>
            ¿Cómo protegemos los datos?
          </h2>
          <p className="text-[#5A626E] text-center mb-10 leading-[1.6]" style={{ fontSize: 17 }}>
            Manejas información de tus clientes. Esto es exactamente lo que hacemos con ella.
          </p>
          <FaqAccordion items={SECURITY_FAQ} />
        </ScrollReveal>
      </section>

      {/* Pricing */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-10 text-center text-balance`} style={SECTION_HEADING_SIZE}>
            Simple y transparente
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 gap-4 max-w-[760px] mx-auto">

          {/* Freemium */}
          <ScrollReveal>
            <div className="rounded-[20px] border border-[#ECEDEF] bg-[#F4F5F7] p-7 flex flex-col h-full">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-2">Freemium</p>
                <p className="text-[42px] font-extrabold text-[#0B0B0C] leading-none mb-1">Gratis</p>
                <p className="text-sm text-[#8A8F98] mb-6">Clientes ilimitados — lleva tu cartera completa</p>
                <ul className="text-sm text-[#3F4651] space-y-2.5 mb-6">
                  {[
                    "Clientes ilimitados",
                    "Hasta 12 leads en tu pipeline",
                    "Premios Escalera configurables (PPR/Vida)",
                    "Portal para tus clientes",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckIcon className="text-[#1F9D5B]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-[0.08em] mb-2">Comisión por producto</p>
                <div className="space-y-1.5 mb-6">
                  {[
                    { label: "PPR",         pct: "0.25%" },
                    { label: "Vida",        pct: "0.25%" },
                    { label: "Daños/Auto",  pct: "1.5%"  },
                    { label: "GMM",         pct: "1.5%"  },
                    { label: "Otro",        pct: "1.5%"  },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-[#5A626E]">{r.label}</span>
                      <span className="font-bold text-[#0B0B0C]">{r.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/registro" className="block text-center text-sm font-semibold bg-white border border-[#DADCE0] px-4 py-3 rounded-full transition-[background-color,border-color,transform] duration-150 hover:border-[#0B0B0C] active:scale-[0.97]">
                Crear cuenta gratis
              </Link>
            </div>
          </ScrollReveal>

          {/* Pro */}
          <ScrollReveal delayMs={60}>
            <div className="relative rounded-[20px] border-2 border-[#2563EB] bg-white p-7 flex flex-col h-full">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#2563EB] uppercase tracking-[0.08em] mb-2">Pagado</p>
                <p className="text-[42px] font-extrabold text-[#0B0B0C] leading-none mb-1">
                  $539 <span className="text-[22px] font-bold">MXN</span><span className="text-base font-normal text-[#8A8F98]">/mes</span>
                </p>
                <p className="text-sm text-[#8A8F98] mb-6">Clientes ilimitados</p>
                <ul className="text-sm text-[#3F4651] space-y-2.5 mb-6">
                  {[
                    "Todo lo del plan gratis, y además:",
                    "Leads ilimitados en el pipeline",
                    "Premios Burbuja configurables (Auto y GMM)",
                    "Comisiones más bajas en todos los productos",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckIcon className="text-[#2563EB]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.08em] mb-2">Comisión por producto</p>
                <div className="space-y-1.5 mb-6">
                  {[
                    { label: "PPR",         pct: "0.15%" },
                    { label: "Vida",        pct: "0.15%" },
                    { label: "Daños/Auto",  pct: "0.80%" },
                    { label: "GMM",         pct: "0.80%" },
                    { label: "Otro",        pct: "0.80%" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-[#5A626E]">{r.label}</span>
                      <span className="font-bold text-[#2563EB]">{r.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/registro" className="block text-center text-sm font-semibold bg-[#0B0B0C] text-white px-4 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
                Empezar
              </Link>
            </div>
          </ScrollReveal>

        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
