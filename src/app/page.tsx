import { redirect } from "next/navigation";
import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { getAdvisorSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ScrollReveal } from "@/components/ScrollReveal";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { ChannelData } from "@/components/landing/ChannelData";
import { LiquidBubble } from "@/components/landing/LiquidBubble";
import { BrandWord } from "@/components/landing/BrandWord";
import { SHOW_BUBBLE_REWARDS, SHOW_NON_CORE_PRODUCTS } from "@/lib/product-visibility";
import BolaDeNieveCard from "@/components/BolaDeNieveCard";

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

const WHATSAPP_URL =
  "https://wa.me/527351209009?text=" +
  encodeURIComponent("Hola Patrick, vi Referidoo y tengo una duda");

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
    title: "Premios sin cuentas a mano",
    body: "Escalera de premios para Vida y PPR. Tú configuras los montos y tú pagas; nosotros llevamos la cuenta de a quién le toca cuánto y tu cliente lo ve, sin que persigas CLABEs.",
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
  { antes: "Se te olvida quién te refirió a quién, o cuánto le debes", despues: "Siempre sabes quién refirió a quién y cuánto le debes. Nosotros lo llevamos, tú solo pagas" },
  { antes: "Tu cliente no tiene idea de cuánto le falta para su premio, ni cómo reclamarlo", despues: "Tu cliente ve su progreso y pide su premio desde su portal, con sus datos listos para que le pagues" },
];

const SALES_FAQ = [
  {
    question: "¿Quién paga los premios a los clientes?",
    answer: "Tú — y tú defines los montos desde tu panel. Referidoo los calcula, los trackea y le avisa a tu cliente; tú solo envías el pago. Piénsalo así: el premio es tu costo de adquisición, y sale mucho más barato que comprar leads que cierran al 1–5%.",
  },
  {
    question: "¿Qué pasa cuando llego a 12 leads en el plan gratis?",
    answer: "Los leads del 13 en adelante se guardan bloqueados — no se pierden. Subes a Pro cuando quieras y se desbloquean todos. Tus clientes y sus premios nunca se bloquean.",
  },
  {
    question: "¿Mis clientes necesitan bajar una app?",
    answer: "No. Su portal es un link que se abre en el navegador del celular — sin descargas, sin contraseñas. Lo comparten por WhatsApp como cualquier otro link.",
  },
  {
    question: "¿Cómo gana dinero Referidoo?",
    answer: "Dos cosas: la membresía Pro ($539/mes, opcional) y una comisión pequeña por contrato cerrado, con las tasas publicadas en la tabla de precios. Sin letras chiquitas.",
  },
  {
    question: "¿Y si ya llevo mis referidos en Excel?",
    answer: "Importas tu lista de clientes en minutos y arrancas con tu cartera actual. Lo que ya trackeabas a mano, el sistema lo sigue solo desde ahí.",
  },
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
        Acceso anticipado — entra antes que tu competencia
      </div>

      {/* Hero */}
      <section className="max-w-[1180px] mx-auto px-8 pt-16 pb-12 grid md:grid-cols-2 gap-16 items-center">
        <div className="landing-stagger">
          <h1 className="font-extrabold tracking-[-0.03em] leading-[1.04] mb-5 text-[#0B0B0C] text-balance" style={{ fontSize: "clamp(2.5rem, 5.5vw, 60px)" }}>
            Deja de perseguir clientes.
            <br />
            Los que ya tienes te los traen.
          </h1>
          <p className="text-[#5A626E] leading-[1.6] mb-8 max-w-md" style={{ fontSize: 18 }}>
            Tus clientes felices conocen a quien necesita lo que vendes. Referidoo
            hace que te recomienden de verdad, porque ven lo que ganan, y te caen
            tibios en tu pipeline. Sin comprar un solo lead.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/registro" className="text-sm font-medium bg-[#0B0B0C] text-white px-5 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
              Crear cuenta gratis
            </Link>
            <Link href="/login" className="text-sm font-medium text-[#3F4651] hover:text-[#0B0B0C] px-5 py-3 rounded-full border border-[#DADCE0] hover:border-[#0B0B0C] transition-[background-color,transform,border-color] duration-150 active:scale-[0.97]">
              Ya tengo cuenta
            </Link>
          </div>
          {/* Reversión de riesgo visible + ruta a precios */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3F4651]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F9D5B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              30 días de Pro gratis · sin tarjeta
            </span>
            <Link href="#precios" className="text-sm font-medium text-[#2563EB] hover:underline">Ver precios</Link>
          </div>
          <p className="text-xs text-[#8A8F98] mt-4">
            Para asesores de seguros y planes financieros en México.
          </p>
        </div>

        <HeroDemo />
      </section>

      {/* Cómo funciona — 3 pasos (condensado de /como-funciona) */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center mb-10">
          <h2 className={`${SECTION_HEADING} mb-3 text-balance`} style={SECTION_HEADING_SIZE}>
            Cómo funciona
          </h2>
          <p className="text-[#5A626E] max-w-lg mx-auto leading-[1.6]" style={{ fontSize: 18 }}>
            De un referido a un premio, sin perseguir a nadie.
          </p>
        </ScrollReveal>
        <div className="grid md:grid-cols-3 gap-4 max-w-[1000px] mx-auto">
          {[
            {
              n: "01",
              title: "Tu cliente comparte su link",
              body: "Cada cliente tuyo tiene su propio link. Lo manda por WhatsApp a quien quiera; el referido deja su nombre y teléfono en menos de un minuto.",
            },
            {
              n: "02",
              title: "Cae solo en tu panel",
              body: "El referido aparece directo en tu pipeline: quién lo mandó y en qué etapa va. Tú lo trabajas y lo cierras como siempre.",
            },
            {
              n: "03",
              title: "Cierras, y el premio queda claro",
              body: "Al cerrar, subes una foto de la carátula de la póliza. Con eso calculamos nuestra comisión, una sola vez, y tu cliente ve en su portal el premio que tú configuraste, listo para que se lo pagues.",
            },
          ].map((s, i) => (
            <ScrollReveal key={s.n} delayMs={i * 60} className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
              <span className="text-[#2563EB] font-extrabold text-2xl">{s.n}</span>
              <h3 className="font-bold text-[19px] text-[#0B0B0C] mt-2 mb-2 text-balance">{s.title}</h3>
              <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 15 }}>{s.body}</p>
            </ScrollReveal>
          ))}
        </div>
        <ScrollReveal className="text-center mt-8">
          <Link href="/como-funciona" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:gap-2.5 transition-[gap]">
            Ver el flujo completo, desde los 3 lados
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </ScrollReveal>
      </section>

      {/* Feature highlight */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="max-w-[760px] mx-auto text-center">
          <h2 className={`${SECTION_HEADING} mb-4 text-balance`} style={SECTION_HEADING_SIZE}>
            Cero cuentas a mano. Cero premios olvidados.
          </h2>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 18 }}>
            Cuando un referido cierra, Referidoo ya sabe qué premio le toca a tu
            cliente según tus reglas y se lo muestra. Tú configuras una vez, y
            nosotros llevamos la cuenta de a quién le debes.
          </p>
        </ScrollReveal>
      </section>

      {/* Cómo se calculan los premios */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center mb-10">
          <h2 className={`${SECTION_HEADING} mb-4 max-w-xl mx-auto text-balance`} style={SECTION_HEADING_SIZE}>
            Tú pones los montos. <BrandWord /> lleva la cuenta.
          </h2>
          <p className="text-[#5A626E] max-w-lg mx-auto leading-[1.6] mb-3" style={{ fontSize: 18 }}>
            Premia a tus clientes por cada referido que cierres — tú decides los
            números, el sistema nunca se equivoca.
          </p>
          <Link href="/como-funciona" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:gap-2.5 transition-[gap]">
            Ver cómo funciona, paso a paso
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </ScrollReveal>

        <div className={`grid gap-4 ${SHOW_BUBBLE_REWARDS ? "md:grid-cols-2" : ""}`}>
          <ScrollReveal className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Vida y PPR</p>
            <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-4">Escalera de premios</h3>
            <div className="space-y-2 mb-4">
              {[
                { label: "1er referido convertido", amount: "$1,500" },
                { label: "2do referido convertido", amount: "$1,500" },
                { label: "3er referido convertido", amount: "$3,500" },
              ].map((step, i) => (
                <div key={step.label} className="sr-item flex items-center justify-between bg-white rounded-[12px] border border-[#ECEDEF] px-4 py-2.5">
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

          {/* Premios burbuja — ocultos en Fase 1 (SHOW_BUBBLE_REWARDS). */}
          {SHOW_BUBBLE_REWARDS && (
          <ScrollReveal delayMs={60} className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Auto y Gastos Médicos Mayores</p>
            <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-4">Premios burbuja</h3>

            {/* Fondo + pts */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-[0.08em]">Fondo compartido</span>
              <span className="text-sm font-bold text-[#0B0B0C]">350 / 500 pts</span>
            </div>

            {/* Bubble visualization — la burbuja líquida del portal */}
            <div className="bg-white rounded-[12px] border border-[#ECEDEF] p-4 mb-3 flex items-center gap-4" style={{ minHeight: 110 }}>
              <LiquidBubble size={76} fill={70} className="sr-bubble flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="sr-item flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#3F4651]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] flex-shrink-0" />
                    GMM
                  </span>
                  <span className="font-bold text-[#0B0B0C]">+300 pts</span>
                </div>
                <div className="sr-item flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-[#3F4651]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6] flex-shrink-0" />
                    Auto
                  </span>
                  <span className="font-bold text-[#0B0B0C]">+150 pts</span>
                </div>
                <div className="sr-item flex items-center justify-between text-xs pt-1.5 border-t border-[#F4F5F7]">
                  <span className="text-[#8A8F98]">Meta para reclamar</span>
                  <span className="font-bold text-[#2563EB]">500 pts</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#8A8F98] leading-relaxed">
              Auto y GMM suman al mismo fondo. Al llegar al umbral que tú definas,
              tu cliente ve el premio listo para reclamar desde su portal — sin
              que tengas que avisarle. Montos y meta, configurables.
            </p>
          </ScrollReveal>
          )}
        </div>
      </section>

      {/* Tu bola de nieve — misma tarjeta interactiva que el panel del asesor */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <div className="max-w-[820px] mx-auto">
          <BolaDeNieveCard initialClientCount={50} />
        </div>
      </section>

      {/* Features + portal del cliente */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center">
          <h2 className={`${SECTION_HEADING} mb-10 max-w-xl mx-auto text-balance`} style={SECTION_HEADING_SIZE}>
            Todo lo que necesitas para no perder ni un <BrandWord />
          </h2>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delayMs={i * 60}>
                <div
                  className={`grid gap-4 py-6 px-3 -mx-3 rounded-[12px] hover:bg-[#FAFAFB] transition-colors ${i > 0 ? "border-t border-[#EFEFF1]" : ""}`}
                  style={{ gridTemplateColumns: "52px 1fr" }}
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

          {/* Mockup del portal del cliente */}
          <ScrollReveal delayMs={80}>
            <div className="bg-[#F4F5F7] rounded-[22px] p-4 max-w-[320px] mx-auto select-none">
              <div className="flex items-center justify-between px-1 mb-3">
                <p className="text-[13px] font-bold text-[#0B0B0C]">Portal de Lupita</p>
                <span className="text-[10px] font-bold text-[#8A8F98] uppercase tracking-[0.08em]">Ejemplo</span>
              </div>
              <div className="flex gap-1 bg-[#ECEDEF] rounded-xl p-1 mb-3">
                <span className="flex-1 text-center py-1.5 text-xs font-medium rounded-lg bg-white text-[#0B0B0C] shadow-sm">Inicio</span>
                <span className="flex-1 text-center py-1.5 text-xs font-medium text-[#8A8F98]">Mis Referidos</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="sr-item bg-[#0B0B0C] text-white rounded-2xl p-3">
                  <p className="text-[11px] text-[#9098A2]">Ganado</p>
                  <p className="text-lg font-bold">$4,500</p>
                </div>
                <div className="sr-item bg-white rounded-2xl border border-[#ECEDEF] p-3">
                  <p className="text-[11px] text-[#8A8F98]">Por cobrar</p>
                  <p className="text-lg font-bold text-[#0B0B0C]">$1,500</p>
                </div>
              </div>
              {SHOW_BUBBLE_REWARDS && (
              <div className="sr-item bg-white rounded-2xl border border-[#ECEDEF] p-3 mb-2 flex items-center gap-3">
                <LiquidBubble size={44} fill={70} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0B0B0C]">Tu burbuja de premio</p>
                  <p className="text-[11px] text-[#8A8F98]">350 / 500 pts — ya casi</p>
                </div>
              </div>
              )}
              <div className="sr-item bg-white rounded-2xl border border-[#ECEDEF] p-3 mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-[#0B0B0C]">Premio listo para reclamar</span>
                <span className="claim-pulse text-[11px] font-bold text-white bg-[#2563EB] px-2 py-1 rounded-full">Reclamar</span>
              </div>
              <div className="sr-item bg-[#2563EB] rounded-2xl p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-[0.06em]">Tu link</p>
                  <p className="text-[11px] font-bold text-white truncate">referidoo.com/r/lupita</p>
                </div>
                <span className="bg-white/20 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white flex-shrink-0">Compartir</span>
              </div>
            </div>
            <p className="text-xs text-[#8A8F98] text-center mt-4 max-w-[320px] mx-auto leading-relaxed">
              Esto es lo que ve tu cliente — sin apps ni contraseñas, solo un link.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Por qué referidos — data de la industria (movido abajo: primero explicar, luego convencer) */}
      <ChannelData />

      {/* Comparison */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-10 text-center text-balance`} style={SECTION_HEADING_SIZE}>
            Antes vs. con <BrandWord />
          </h2>
        </ScrollReveal>
        <div className="relative grid md:grid-cols-2 gap-6 max-w-[820px] mx-auto">
          <ScrollReveal className="bg-[#F4F5F7] rounded-[20px] p-6">
            <p className="text-xs font-bold text-[#8A8F98] uppercase tracking-[0.08em] mb-4">Antes</p>
            <div className="space-y-4">
              {COMPARISON.map((row, i) => (
                <div key={i} className={`sr-item flex items-start gap-3 ${i > 0 ? "pt-4 border-t border-[#EAEBED]" : ""}`}>
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
                Con{" "}
                <span className="normal-case tracking-normal">
                  <Logo size="sm" />
                </span>
              </div>
              <div className="space-y-4">
                {COMPARISON.map((row, i) => (
                  <div key={i} className={`sr-item flex items-start gap-3 ${i > 0 ? "pt-4 border-t border-[#EAEBED]" : ""}`}>
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

      {/* Nota de acceso anticipado */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="max-w-[640px] mx-auto text-center">
          <p className="text-[20px] leading-[1.55] text-[#0B0B0C] font-medium mb-5 text-balance">
            Referidoo está en acceso anticipado. Lo construyo mano a mano con los
            primeros asesores en México — cada función sale de su semana real, no
            de una junta de producto. Entra ahora y ayúdame a moldearlo.
          </p>
          <p className="text-sm text-[#8A8F98] mb-6">Patrick — fundador de Referidoo</p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0B0B0C] border border-[#DADCE0] rounded-full px-5 py-2.5 hover:border-[#0B0B0C] transition-[border-color,transform] duration-150 active:scale-[0.97]"
          >
            <WhatsAppIcon />
            ¿Dudas? Escríbeme directo
          </a>
        </ScrollReveal>
      </section>

      {/* FAQ de objeciones */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="max-w-[680px] mx-auto">
          <h2 className={`${SECTION_HEADING} mb-10 text-center text-balance`} style={SECTION_HEADING_SIZE}>
            Las preguntas antes de empezar
          </h2>
          <FaqAccordion items={SALES_FAQ} />
          <p className="text-sm text-[#5A626E] text-center mt-8">
            ¿Otra pregunta?{" "}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[#2563EB] hover:underline"
            >
              Escríbeme por WhatsApp
            </a>
            {" "}— respondo yo, no un bot.
          </p>
        </ScrollReveal>
      </section>

      {/* Pricing */}
      <section id="precios" className="scroll-mt-24 max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-3 text-center text-balance`} style={SECTION_HEADING_SIZE}>
            Un precio simple, sin letras chiquitas
          </h2>
          <p className="text-[#5A626E] text-center max-w-lg mx-auto leading-[1.6] mb-10" style={{ fontSize: 17 }}>
            Empiezas con 30 días de Pro gratis. Al terminar, eliges: te quedas en
            Pro por $539/mes o bajas al plan gratis para siempre.
          </p>
        </ScrollReveal>
        <div className="grid md:grid-cols-2 gap-4 max-w-[760px] mx-auto">

          {/* Freemium */}
          <ScrollReveal>
            <div className="rounded-[20px] border border-[#ECEDEF] bg-[#F4F5F7] p-7 flex flex-col h-full transition-transform duration-200 hover:-translate-y-0.5">
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
                <p className="text-xs text-[#8A8F98] mb-3">Se cobra una sola vez, al emitir la póliza.</p>
                <div className="space-y-1.5 mb-6">
                  {[
                    { label: "PPR/Vida",             pct: "0.25%" },
                    ...(SHOW_NON_CORE_PRODUCTS ? [{ label: "Daños/Auto/GMM/Otro", pct: "1.5%" }] : []),
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
            <div className="relative rounded-[20px] border-2 border-[#2563EB] bg-white p-7 flex flex-col h-full transition-transform duration-200 hover:-translate-y-0.5">
              <div className="flex-1">
                <p className="text-xs font-bold text-[#2563EB] uppercase tracking-[0.08em] mb-2">Pagado</p>
                <p className="text-[42px] font-extrabold text-[#0B0B0C] leading-none mb-1">
                  $539 <span className="text-[22px] font-bold">MXN</span><span className="text-base font-normal text-[#8A8F98]">/mes</span>
                </p>
                <p className="text-sm text-[#2563EB] font-semibold mb-6">Primeros 30 días gratis</p>
                <ul className="text-sm text-[#3F4651] space-y-2.5 mb-6">
                  {[
                    "Todo lo del plan gratis, y además:",
                    "Leads ilimitados en el pipeline",
                    ...(SHOW_BUBBLE_REWARDS ? ["Premios Burbuja configurables (Auto y GMM)"] : []),
                    "Comisiones más bajas en todos los productos",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckIcon className="text-[#2563EB]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-[0.08em] mb-2">Comisión por producto</p>
                <p className="text-xs text-[#8A8F98] mb-3">Se cobra una sola vez, al emitir la póliza.</p>
                <div className="space-y-1.5 mb-6">
                  {[
                    { label: "PPR/Vida",             pct: "0.15%" },
                    ...(SHOW_NON_CORE_PRODUCTS ? [{ label: "Daños/Auto/GMM/Otro", pct: "0.80%" }] : []),
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between text-sm">
                      <span className="text-[#5A626E]">{r.label}</span>
                      <span className="font-bold text-[#2563EB]">{r.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/registro?plan=pro" className="block text-center text-sm font-semibold bg-[#0B0B0C] text-white px-4 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
                Empezar con Pro
              </Link>
            </div>
          </ScrollReveal>

        </div>

        {/* Qué tan baja es la comisión */}
        <ScrollReveal className="max-w-[760px] mx-auto mt-4">
          <div className="bg-[#F4F5F7] rounded-[20px] border border-[#ECEDEF] p-6">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-2">¿Qué tan baja es la comisión?</p>
            <p className="text-[#3F4651] leading-[1.6]" style={{ fontSize: 15 }}>
              Se calcula sobre el <strong className="text-[#0B0B0C]">valor plan</strong> de la venta — la prima mensual por 12 y por los años del plan — una sola vez, al emitir la póliza.
            </p>
            <p className="text-[#3F4651] leading-[1.6] mt-2" style={{ fontSize: 15 }}>
              Ejemplo: un PPR de $2,000 al mes a 25 años son <strong className="text-[#0B0B0C]">$600,000 de valor plan</strong>. Nuestra comisión es <strong className="text-[#0B0B0C]">$1,500</strong> en Gratis o <strong className="text-[#2563EB]">$900</strong> en Pro. Una fracción de lo que tú ganas por esa venta.
            </p>
            <p className="text-[#8A8F98] leading-[1.6] mt-3" style={{ fontSize: 13 }}>
              La sacamos de la carátula de la póliza — por eso te la pedimos al cerrar. Es una foto, nada más.
            </p>
          </div>
        </ScrollReveal>
      </section>

      {/* CTA final */}
      <section className="max-w-[760px] mx-auto px-8 py-16 border-t border-[#EFEFF1] text-center">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-6 text-balance`} style={SECTION_HEADING_SIZE}>
            Pruébalo gratis con tu propia cartera
          </h2>
          <Link href="/registro" className="inline-block text-sm font-medium bg-[#0B0B0C] text-white px-6 py-3.5 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
            Crear cuenta gratis
          </Link>
          <p className="text-xs text-[#8A8F98] mt-4">30 días de Pro gratis. Sin tarjeta para empezar.</p>
        </ScrollReveal>
      </section>

      <LandingFooter />
    </div>
  );
}
