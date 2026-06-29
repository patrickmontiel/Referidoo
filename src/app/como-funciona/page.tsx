import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";
import { ScrollReveal } from "@/components/ScrollReveal";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const SECTION_HEADING = "font-extrabold tracking-[-0.028em] text-[#0B0B0C]";
const SECTION_HEADING_SIZE = { fontSize: "clamp(1.75rem, 4vw, 39px)" };

const PIPELINE_STAGES = [
  { label: "Pendiente", color: "#F0B429", lead: "María G." },
  { label: "Contactado", color: "#2563EB", lead: "Jorge R." },
  { label: "Convertido", color: "#1F9D5B", lead: "Lupita S." },
];

export default function ComoFuncionaPage() {
  return (
    <div className={`bg-white ${hankenGrotesk.className}`}>
      <LandingHeader />

      {/* Hero */}
      <section className="max-w-[760px] mx-auto px-8 pt-16 pb-12 text-center">
        <ScrollReveal>
          <h1 className="font-extrabold tracking-[-0.03em] leading-[1.1] mb-5 text-[#0B0B0C] text-balance" style={{ fontSize: "clamp(2rem, 4.5vw, 48px)" }}>
            Así funciona Referidoo, paso a paso
          </h1>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 18 }}>
            Sin letras chiquitas. Esto es exactamente lo que pasa desde que tu cliente
            comparte su link, hasta que el premio llega a tu bolsillo.
          </p>
        </ScrollReveal>
      </section>

      {/* Paso 1 */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1] grid md:grid-cols-2 gap-16 items-center">
        <ScrollReveal>
          <p className="text-[#2563EB] font-extrabold text-sm mb-3">PASO 1</p>
          <h2 className={`${SECTION_HEADING} mb-4`} style={{ fontSize: "clamp(1.5rem, 3vw, 32px)" }}>
            Tu cliente comparte su link
          </h2>
          <p className="text-[#5A626E] leading-[1.6] mb-3" style={{ fontSize: 17 }}>
            Cada cliente activo tuyo tiene un link único de referidos, disponible en
            su portal. Lo manda por WhatsApp a quien quiera — no necesita tu ayuda ni
            que tú estés al pendiente.
          </p>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 17 }}>
            La persona que recibe el link cae en una landing simple, pensada para
            celular: ve quién la recomendó, qué gana al platicar contigo, y deja su
            nombre y teléfono en menos de un minuto. Sin formularios largos.
          </p>
        </ScrollReveal>
        <ScrollReveal delayMs={60}>
          <div className="bg-white rounded-[22px] border border-[#EAEBED] p-5 max-w-[300px] mx-auto" style={{ boxShadow: "0 10px 40px rgba(15,23,42,.10)" }}>
            <p className="text-[11px] text-[#8A8F98] mb-3">· Eduardo Neri — Asesor Financiero</p>
            <p className="text-sm text-[#8A8F98] mb-2">Lupita te quiere compartir algo</p>
            <p className="font-extrabold text-lg leading-tight mb-3 text-[#0B0B0C]">
              Tu amigo ya está cuidando su futuro. <span className="text-[#8A8F98]">¿Y el tuyo?</span>
            </p>
            <div className="bg-[#0B0B0C] rounded-2xl p-3">
              <p className="text-white/90 text-xs leading-relaxed">
                Lupita ya tiene un plan de vida y retiro, y cree que a ti también te
                puede convenir. Sin compromiso.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Paso 2 */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1] grid md:grid-cols-2 gap-16 items-center">
        <ScrollReveal className="md:order-2">
          <p className="text-[#2563EB] font-extrabold text-sm mb-3">PASO 2</p>
          <h2 className={`${SECTION_HEADING} mb-4`} style={{ fontSize: "clamp(1.5rem, 3vw, 32px)" }}>
            Aparece directo en tu pipeline
          </h2>
          <p className="text-[#5A626E] leading-[1.6] mb-3" style={{ fontSize: 17 }}>
            En cuanto el lead deja sus datos, ya está en tu panel — sin que nadie te
            avise por WhatsApp, sin copiar y pegar a una hoja de Excel.
          </p>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 17 }}>
            Ves quién lo refirió, cuándo llegó, y en qué etapa está: pendiente,
            contactado o convertido. Tú decides cuándo moverlo de etapa conforme
            avanza la plática real.
          </p>
        </ScrollReveal>
        <ScrollReveal delayMs={60} className="md:order-1">
          <div className="bg-[#F4F5F7] rounded-[22px] p-5 max-w-[340px] mx-auto space-y-2">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.lead} className="bg-white rounded-2xl border border-[#ECEDEF] p-3 flex items-center justify-between">
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

      {/* Paso 3 — Premios, igual que la landing */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1]">
        <ScrollReveal className="text-center mb-10">
          <p className="text-[#2563EB] font-extrabold text-sm mb-3">PASO 3</p>
          <h2 className={`${SECTION_HEADING} mb-4 max-w-xl mx-auto`} style={SECTION_HEADING_SIZE}>
            Conviertes la venta. El sistema calcula el premio.
          </h2>
          <p className="text-[#5A626E] max-w-md mx-auto leading-[1.6]" style={{ fontSize: 17 }}>
            Marcas el referido como convertido y eliges el producto — el resto es
            automático.
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
              Tú decides los montos, y qué pasa después del último nivel — ¿vuelve a
              empezar, se queda fijo, o paga un monto plano?
            </p>
          </ScrollReveal>

          <ScrollReveal delayMs={60} className="bg-[#F4F5F7] rounded-[20px] p-6 border border-[#ECEDEF]">
            <p className="text-xs font-bold text-[#6B727D] uppercase tracking-[0.08em] mb-1">Auto y Gastos Médicos Mayores</p>
            <h3 className="font-bold text-[20px] text-[#0B0B0C] mb-4">Premios burbuja</h3>
            <div className="bg-white rounded-[12px] border border-[#ECEDEF] p-4 mb-4">
              <div className="flex items-center justify-center py-1 mb-3">
                <div className="relative w-16 h-16 rounded-full border-2 overflow-hidden bg-[#EEF3FE]" style={{ borderColor: "#2563EB", boxShadow: "0 3px 10px rgba(37,99,235,.25)" }}>
                  <div className="absolute bottom-0 left-0 right-0" style={{ height: "70%", background: "linear-gradient(to top, #2563EB, #6EA1F5)" }} />
                  <div className="bubble-shine absolute inset-0 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6B727D]">Auto = 150 pts · GMM = 300 pts</span>
                <span className="font-bold text-[#0B0B0C]">350 / 500 pts</span>
              </div>
            </div>
            <p className="text-xs text-[#8A8F98] leading-relaxed">
              Cada venta suma puntos a un mismo fondo. Al llegar al umbral, el premio
              queda listo para reclamarse — sin que tengas que avisarle a nadie.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Paso 4 — Portal del cliente */}
      <section className="max-w-[1180px] mx-auto px-8 py-16 border-t border-[#EFEFF1] grid md:grid-cols-2 gap-16 items-center">
        <ScrollReveal>
          <p className="text-[#2563EB] font-extrabold text-sm mb-3">PASO 4</p>
          <h2 className={`${SECTION_HEADING} mb-4`} style={{ fontSize: "clamp(1.5rem, 3vw, 32px)" }}>
            Tu cliente ve su progreso y reclama solo
          </h2>
          <p className="text-[#5A626E] leading-[1.6] mb-3" style={{ fontSize: 17 }}>
            Cada cliente tiene su propio portal — ahí ve cuánto ha ganado, cuánto le
            falta para su próximo premio, y el historial completo de a quién ha
            referido.
          </p>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 17 }}>
            Cuando hay un premio listo para reclamar, lo reclama él mismo desde ahí.
            Tú solo ves la notificación y envías el pago — sin estar explicando por
            WhatsApp cuánto le tocaba.
          </p>
        </ScrollReveal>
        <ScrollReveal delayMs={60}>
          <div className="bg-[#F4F5F7] rounded-[22px] p-4 max-w-[300px] mx-auto">
            <div className="flex gap-1 bg-[#ECEDEF] rounded-xl p-1 mb-3">
              <span className="flex-1 text-center py-1.5 text-xs font-medium rounded-lg bg-white text-[#0B0B0C] shadow-sm">Inicio</span>
              <span className="flex-1 text-center py-1.5 text-xs font-medium text-[#8A8F98]">Mis Referidos</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-[#0B0B0C] text-white rounded-2xl p-3">
                <p className="text-[11px] text-[#9098A2]">Ganado</p>
                <p className="text-lg font-bold">$4,500</p>
              </div>
              <div className="bg-white rounded-2xl border border-[#ECEDEF] p-3">
                <p className="text-[11px] text-[#8A8F98]">Por cobrar</p>
                <p className="text-lg font-bold text-[#0B0B0C]">$1,500</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-[#ECEDEF] p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-[#0B0B0C]">Premio listo para reclamar</span>
              <span className="text-[11px] font-bold text-white bg-[#2563EB] px-2 py-1 rounded-full">Reclamar</span>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Paso 5 — Cobro */}
      <section className="max-w-[760px] mx-auto px-8 py-16 border-t border-[#EFEFF1] text-center">
        <ScrollReveal>
          <p className="text-[#2563EB] font-extrabold text-sm mb-3">PASO 5</p>
          <h2 className={`${SECTION_HEADING} mb-4`} style={SECTION_HEADING_SIZE}>
            A ti te cobramos solo, sin que hagas nada
          </h2>
          <p className="text-[#5A626E] leading-[1.6]" style={{ fontSize: 17 }}>
            Tu suscripción se cobra automáticamente cada mes vía Mercado Pago. Nada
            de transferencias manuales, nada de recordatorios — y si decides
            cancelar, lo haces cuando quieras, sin penalización.
          </p>
        </ScrollReveal>
      </section>

      {/* CTA final */}
      <section className="max-w-[760px] mx-auto px-8 py-16 border-t border-[#EFEFF1] text-center">
        <ScrollReveal>
          <h2 className={`${SECTION_HEADING} mb-6`} style={SECTION_HEADING_SIZE}>
            Pruébalo gratis con tus primeros 2 clientes
          </h2>
          <Link href="/registro" className="inline-block text-sm font-medium bg-[#0B0B0C] text-white px-6 py-3.5 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]">
            Crear cuenta gratis
          </Link>
        </ScrollReveal>
      </section>

      <LandingFooter />
    </div>
  );
}
