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
          <p className="text-xs text-[#8A8F98] mt-4">Gratis hasta 2 clientes. Sin tarjeta para empezar.</p>
        </div>

        <div
          className="landing-cta bg-white rounded-[22px] border border-[#EAEBED] p-5"
          style={{ boxShadow: "0 10px 40px rgba(15,23,42,.10)" }}
        >
          <p className="text-[11px] font-bold text-[#8A8F98] uppercase tracking-[0.08em] mb-3">
            Así se ve tu panel — ejemplo ilustrativo
          </p>
          <div className="mb-4">
            <p className="font-bold text-lg text-[#0B0B0C]">Hola, Eduardo</p>
            <p className="text-sm text-[#8A8F98]">Panel de referidos</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[
              { label: "Clientes activos", value: 5 },
              { label: "Referidos totales", value: 7 },
              { label: "Convertidos", value: 3 },
              { label: "Pendientes", value: 2 },
            ].map((s) => (
              <div key={s.label} className="bg-[#F4F5F7] rounded-[14px] p-3">
                <p className="text-xl font-bold text-[#0B0B0C]">{s.value}</p>
                <p className="text-xs text-[#6B727D] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0B0B0C] text-white rounded-[14px] p-3">
              <p className="text-xs text-[#9098A2] mb-1">Premios pagados</p>
              <p className="text-lg font-bold">$2,500</p>
            </div>
            <div className="bg-[#F4F5F7] rounded-[14px] p-3">
              <p className="text-xs text-[#6B727D] mb-1">Por pagar (aprobados)</p>
              <p className="text-lg font-bold text-[#0B0B0C]">$0</p>
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
            <div className="bg-white rounded-[12px] border border-[#ECEDEF] p-4 mb-4">
              <div className="flex items-center justify-center py-1 mb-3">
                <div
                  className="relative w-16 h-16 rounded-full border-2 overflow-hidden bg-[#EEF3FE]"
                  style={{ borderColor: "#2563EB", boxShadow: "0 3px 10px rgba(37,99,235,.25)" }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0"
                    style={{ height: "70%", background: "linear-gradient(to top, #2563EB, #6EA1F5)" }}
                  />
                  <div className="bubble-shine absolute inset-0 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B727D]">Auto = 150 pts · GMM = 300 pts</span>
                <span className="font-bold text-[#0B0B0C]">350 / 500 pts</span>
              </div>
            </div>
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
          <ScrollReveal>
            <div className="rounded-[20px] border border-[#ECEDEF] bg-[#F4F5F7] p-7">
              <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-2">Freemium</p>
              <p className="text-3xl font-extrabold text-[#0B0B0C] mb-1">Gratis</p>
              <p className="text-sm text-[#8A8F98] mb-6">Hasta 2 clientes — perfecto para probarlo</p>
              <ul className="text-sm text-[#3F4651] space-y-2.5 mb-7">
                {["Seguimiento de referidos", "Premios automáticos", "Portal para tus clientes"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckIcon className="text-[#1F9D5B]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/registro" className="block text-center text-sm font-medium bg-white border border-[#DADCE0] px-4 py-3 rounded-full transition-[background-color,border-color,transform] duration-150 hover:border-[#0B0B0C] active:scale-[0.97]">
                Crear cuenta gratis
              </Link>
            </div>
          </ScrollReveal>
          <ScrollReveal delayMs={60}>
            <div className="relative rounded-[20px] border-2 border-[#2563EB] bg-white p-7">
              <span className="absolute -top-3 left-7 bg-[#2563EB] text-white text-xs font-medium px-3 py-1 rounded-full">
                Recomendado
              </span>
              <p className="text-xs font-bold text-[#2563EB] uppercase tracking-[0.08em] mb-2">Pagado</p>
              <p className="text-3xl font-extrabold text-[#0B0B0C] mb-1">$539 MXN<span className="text-base font-normal text-[#8A8F98]">/mes</span></p>
              <p className="text-sm text-[#8A8F98] mb-6">Clientes ilimitados</p>
              <ul className="text-sm text-[#3F4651] space-y-2.5 mb-7">
                {[
                  "Sin límite de clientes — la mayoría de los asesores activos ya tienen más de 2",
                  "Tu suscripción se cobra sola cada mes, sin transferencias manuales",
                  "Todo lo del plan freemium, ya sin restricciones",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckIcon className="text-[#2563EB]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/registro" className="block text-center text-sm font-medium bg-[#0B0B0C] text-white px-4 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
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
