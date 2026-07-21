import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";
import { ScrollReveal } from "@/components/ScrollReveal";
import { LiquidBubble } from "@/components/landing/LiquidBubble";
import { BrandWord } from "@/components/landing/BrandWord";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const SECTION_HEADING = "font-extrabold tracking-[-0.028em] text-[#0B0B0C]";
const SECTION_HEADING_SIZE = { fontSize: "clamp(1.75rem, 4vw, 39px)" };
const POV_HEADING_SIZE = { fontSize: "clamp(1.5rem, 3vw, 32px)" };

const PIPELINE_STAGES = [
  { label: "Pendiente", color: "#F0B429", lead: "María G." },
  { label: "Contactado", color: "#2563EB", lead: "Jorge R." },
  { label: "Convertido", color: "#1F9D5B", lead: "Lupita S." },
];

const POV_NAV = [
  { id: "asesor", label: "El asesor" },
  { id: "cliente", label: "Tu cliente" },
  { id: "referido", label: "El nuevo referido" },
];

const POV_STYLES = {
  asesor: "text-[#0B0B0C] bg-[#ECEEF1]",
  cliente: "text-[#2563EB] bg-[#EEF3FE]",
  referido: "text-[#9A6B12] bg-[#FBF3E2]",
} as const;

function PovLabel({ variant, children }: { variant: keyof typeof POV_STYLES; children: React.ReactNode }) {
  return (
    <span className={`inline-block text-xs font-bold tracking-[0.03em] uppercase rounded-full px-3 py-1 mb-3 ${POV_STYLES[variant]}`}>
      {children}
    </span>
  );
}

function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div className="flex flex-col gap-5">
      {items.map((s, i) => (
        <div key={s.title} className="grid gap-3" style={{ gridTemplateColumns: "28px 1fr" }}>
          <span className="w-7 h-7 rounded-full bg-[#0B0B0C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {i + 1}
          </span>
          <div>
            <h3 className="font-bold text-[16px] text-[#0B0B0C] mb-1">{s.title}</h3>
            <p className="text-[#5A626E] leading-[1.55]" style={{ fontSize: 15 }}>{s.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ComoFuncionaPage() {
  return (
    <div className={`bg-white ${hankenGrotesk.className}`}>
      <LandingHeader />

      {/* Hero */}
      <section className="max-w-[760px] mx-auto px-8 pt-16 pb-12 text-center">
        <div className="landing-stagger">
          <h1 className="font-extrabold tracking-[-0.03em] leading-[1.1] mb-5 text-[#0B0B0C] text-balance" style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}>
            Así funciona <BrandWord />, desde los tres lados
          </h1>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 18 }}>
            El mismo loop, visto por cada quien: tú (el asesor), el cliente que
            te recomienda, y la persona nueva que llega por su link.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {POV_NAV.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs font-semibold border border-[#DADCE0] rounded-full px-4 py-1.5 text-[#3F4651] hover:border-[#0B0B0C] hover:text-[#0B0B0C] transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── El asesor ── */}
      <section id="asesor" className="scroll-mt-24 max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1] grid md:grid-cols-2 gap-16 items-center">
        <ScrollReveal>
          <PovLabel variant="asesor">El asesor · tú</PovLabel>
          <h2 className={`${SECTION_HEADING} mb-5`} style={POV_HEADING_SIZE}>
            Cómo lo ves tú
          </h2>
          <Steps
            items={[
              {
                title: "Configuras tus premios una vez",
                body: "Defines cuánto gana tu cliente por cada referido (escalera o burbuja), y cada cliente recibe su link. Se configura una sola vez.",
              },
              {
                title: "Los referidos caen solos en tu pipeline",
                body: "En cuanto alguien deja sus datos, aparece en tu panel: quién lo refirió y en qué etapa está. Sin avisos por WhatsApp, sin copiar a Excel.",
              },
              {
                title: "Cierras la venta y subes la carátula",
                body: "Trabajas al referido como siempre. Al cerrar, subes una foto de la carátula de la póliza; con eso calculamos nuestra comisión, una sola vez.",
              },
              {
                title: "Pagas el premio, sin perseguir a nadie",
                body: "Referidoo lleva la cuenta de a quién le toca cuánto, según tus reglas. Tú pagas (tu cliente ya dejó su CLABE en su portal). Tu suscripción se cobra sola por Mercado Pago.",
              },
            ]}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={60}>
          <div className="bg-[#F4F5F7] rounded-[22px] p-5 max-w-[340px] mx-auto space-y-2">
            <p className="text-[11px] font-bold text-[#8A8F98] uppercase tracking-[0.08em] px-1 mb-1">Tu pipeline</p>
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.lead} className="sr-item bg-white rounded-2xl border border-[#ECEDEF] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-medium text-[#0B0B0C]">{stage.lead}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: stage.color }}>{stage.label}</span>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── Tu cliente ── */}
      <section id="cliente" className="scroll-mt-24 max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1] grid md:grid-cols-2 gap-16 items-center">
        <ScrollReveal className="md:order-2">
          <PovLabel variant="cliente">Tu cliente · el que refiere</PovLabel>
          <h2 className={`${SECTION_HEADING} mb-5`} style={POV_HEADING_SIZE}>
            Cómo lo ve tu cliente
          </h2>
          <Steps
            items={[
              {
                title: "Recibe su link personal",
                body: "En su portal, sin descargar apps ni recordar contraseñas. Es solo un link.",
              },
              {
                title: "Lo comparte por WhatsApp",
                body: "Con quien quiera, cuando quiera. Cada persona que entra por su link queda ligada a él.",
              },
              {
                title: "Ve su progreso en vivo",
                body: "Cuánto ha ganado, cuánto le falta para su próximo premio, y a quién ha referido. Sin preguntarte nada.",
              },
              {
                title: "Pide su premio cuando está listo",
                body: "Cuando un referido cierra, su premio aparece listo. Lo pide desde su portal y deja ahí su CLABE, para que tú se lo deposites.",
              },
            ]}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={60} className="md:order-1">
          <div className="bg-[#F4F5F7] rounded-[22px] p-4 max-w-[300px] mx-auto">
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
            <div className="sr-item bg-white rounded-2xl border border-[#ECEDEF] p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-[#0B0B0C]">Premio listo para reclamar</span>
              <span className="claim-pulse text-[11px] font-bold text-white bg-[#2563EB] px-2 py-1 rounded-full">Reclamar</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Así crece su premio (detalle escalera / burbuja) */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center mb-10">
          <h2 className={`${SECTION_HEADING} mb-3 max-w-xl mx-auto text-balance`} style={SECTION_HEADING_SIZE}>
            Así crece el premio de tu cliente
          </h2>
          <p className="text-[#5A626E] max-w-md mx-auto leading-[1.6]" style={{ fontSize: 17 }}>
            Tú pones los montos; el sistema lleva la cuenta según tus reglas. Dos
            formas, según el producto.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-2 gap-4">
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
              Tú decides los montos, y qué pasa después del último nivel — ¿vuelve a
              empezar, se queda fijo, o paga un monto plano?
            </p>
          </ScrollReveal>

          <ScrollReveal delayMs={60} className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Auto y Gastos Médicos Mayores</p>
            <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-4">Premios burbuja</h3>
            <div className="bg-white rounded-[12px] border border-[#ECEDEF] p-4 mb-4">
              <div className="flex items-center justify-center py-1 mb-3">
                <LiquidBubble size={64} fill={70} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B727D]">Auto = 150 pts · GMM = 300 pts</span>
                <span className="font-bold text-[#0B0B0C]">350 / 500 pts</span>
              </div>
            </div>
            <p className="text-xs text-[#8A8F98] leading-relaxed">
              Cada venta suma puntos a un mismo fondo. Al llegar al umbral que tú
              definas, el premio queda listo para que tu cliente lo pida.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── El nuevo referido ── */}
      <section id="referido" className="scroll-mt-24 max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1] grid md:grid-cols-2 gap-16 items-center">
        <ScrollReveal>
          <PovLabel variant="referido">El nuevo referido · el que llega</PovLabel>
          <h2 className={`${SECTION_HEADING} mb-5`} style={POV_HEADING_SIZE}>
            Cómo lo ve el nuevo referido
          </h2>
          <Steps
            items={[
              {
                title: "Le llega el link de alguien de confianza",
                body: "No es publicidad fría: se lo mandó una persona que ya confía en ti, con su nombre de por medio.",
              },
              {
                title: "Cae en una página simple, pensada para celular",
                body: "Ve quién lo recomendó y qué gana al platicar contigo. Nada de formularios largos ni datos sensibles.",
              },
              {
                title: "Deja su nombre y teléfono en un minuto",
                body: "Solo lo justo para que tú lo contactes. Sin compromiso.",
              },
              {
                title: "Tú lo contactas y sigues desde tu pipeline",
                body: "A partir de ahí, es una plática normal — pero llegó recomendado, así que arranca con confianza.",
              },
            ]}
          />
        </ScrollReveal>
        <ScrollReveal delayMs={60}>
          <div className="bg-white rounded-[22px] border border-[#EAEBED] p-5 max-w-[300px] mx-auto" style={{ boxShadow: "0 10px 40px rgba(15,23,42,.10)" }}>
            <p className="text-[11px] text-[#8A8F98] mb-3">· Eduardo Neri — Asesor Financiero</p>
            <p className="text-sm text-[#8A8F98] mb-2">Lupita te quiere compartir algo</p>
            <p className="font-extrabold text-lg leading-tight mb-3 text-[#0B0B0C]">
              Tu amigo ya está cuidando su futuro. <span className="text-[#8A8F98]">¿Y el tuyo?</span>
            </p>
            <div className="bg-[#0B0B0C] rounded-2xl p-3 mb-3">
              <p className="text-white/90 text-xs leading-relaxed">
                Lupita ya tiene un plan de vida y retiro, y cree que a ti también te
                puede convenir. Sin compromiso.
              </p>
            </div>
            <div className="bg-[#2563EB] rounded-full py-2 text-center text-xs font-semibold text-white">
              Me interesa — que me contacten
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* CTA final */}
      <section className="max-w-[760px] mx-auto px-8 py-16 border-t border-[#EFEFF1] text-center">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-6`} style={SECTION_HEADING_SIZE}>
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
