import { Hanken_Grotesk } from "next/font/google";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Términos y condiciones — Referidoo",
};

const SECTIONS = [
  {
    title: "El servicio",
    body: [
      "Referidoo es un software de gestión de referidos para asesores de seguros y planes financieros: registra referidos, calcula premios según las reglas que configura cada asesor y da a sus clientes un portal para ver su progreso. Referidoo no es una aseguradora ni intermediario de seguros, y no participa en la venta de pólizas.",
    ],
  },
  {
    title: "Tu cuenta",
    body: [
      "Eres responsable de mantener seguras tus credenciales y de la información que registras en la plataforma. Al registrar datos de tus clientes y referidos, confirmas que cuentas con su consentimiento para hacerlo.",
    ],
  },
  {
    title: "Premios a clientes",
    body: [
      "Los premios que se ofrecen a los clientes referidores los define y los paga cada asesor. Referidoo calcula, registra y da seguimiento a esos premios, pero no es responsable de su pago ni parte de ese acuerdo entre el asesor y su cliente.",
    ],
  },
  {
    title: "Precios y cobros",
    body: [
      "El plan gratuito incluye clientes ilimitados y hasta 12 leads en el pipeline. El plan Pro cuesta $539 MXN al mes e incluye leads ilimitados y comisiones reducidas.",
      "Referidoo cobra además una comisión por contrato cerrado, según las tasas publicadas en la tabla de precios del sitio. Los cobros se procesan automáticamente vía Mercado Pago.",
      "Puedes cancelar tu suscripción en cualquier momento desde tu perfil, sin penalización. Al cancelar, conservas el acceso Pro hasta el final del periodo ya pagado.",
    ],
  },
  {
    title: "Uso aceptable",
    body: [
      "No está permitido usar Referidoo para enviar spam, registrar datos de personas sin su consentimiento, ni para cualquier actividad contraria a la ley mexicana.",
    ],
  },
  {
    title: "Disponibilidad y responsabilidad",
    body: [
      "Referidoo está en fase de acceso anticipado y se ofrece \"tal cual\". Trabajamos para mantener el servicio disponible y tus datos seguros, pero no garantizamos disponibilidad ininterrumpida.",
      "En cualquier caso, la responsabilidad total de Referidoo frente a un asesor se limita al monto pagado por ese asesor en el último mes de servicio.",
    ],
  },
  {
    title: "Terminación",
    body: [
      "Podemos suspender o cerrar cuentas que incumplan estos términos. Tú puedes cerrar tu cuenta cuando quieras.",
    ],
  },
  {
    title: "Ley aplicable y contacto",
    body: [
      "Estos términos se rigen por las leyes de México. Para cualquier duda escríbenos a hola@referidoo.com.",
    ],
  },
];

export default function TerminosPage() {
  return (
    <div className={`bg-white ${hankenGrotesk.className}`}>
      <LandingHeader />
      <main className="max-w-[680px] mx-auto px-8 pt-16 pb-20">
        <h1 className="font-extrabold tracking-[-0.03em] text-[#0B0B0C] mb-3" style={{ fontSize: "clamp(1.8rem, 4vw, 40px)" }}>
          Términos y condiciones
        </h1>
        <p className="text-sm text-[#8A8F98] mb-10">Última actualización: julio 2026</p>
        {SECTIONS.map((s) => (
          <section key={s.title} className="mb-8">
            <h2 className="font-bold text-[19px] text-[#0B0B0C] mb-2.5">{s.title}</h2>
            {s.body.map((p, i) => (
              <p key={i} className="text-[15px] text-[#3F4651] leading-[1.7] mb-2.5">
                {p}
              </p>
            ))}
          </section>
        ))}
      </main>
      <LandingFooter />
    </div>
  );
}
