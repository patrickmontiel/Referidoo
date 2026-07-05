import { Hanken_Grotesk } from "next/font/google";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Aviso de privacidad — Referidoo",
};

const SECTIONS = [
  {
    title: "Quiénes somos",
    body: [
      "Referidoo es una plataforma de gestión de referidos para asesores de seguros y planes financieros en México. Para cualquier tema relacionado con este aviso puedes escribirnos a hola@referidoo.com.",
    ],
  },
  {
    title: "Qué datos recopilamos",
    body: [
      "De los asesores que crean una cuenta: nombre, correo electrónico, teléfono y, opcionalmente, nombre de su empresa.",
      "De los clientes y referidos que un asesor registra en su cuenta: nombre, teléfono y, opcionalmente, correo electrónico. Nunca pedimos RFC, cuentas bancarias ni datos de pólizas.",
    ],
  },
  {
    title: "Para qué los usamos",
    body: [
      "Exclusivamente para operar el servicio: mostrar el pipeline de referidos del asesor, generar los portales de cliente, calcular premios y enviar correos transaccionales (verificación de cuenta, notificaciones del servicio).",
      "No vendemos ni rentamos datos personales a terceros, y no los compartimos con otros asesores.",
    ],
  },
  {
    title: "Pagos",
    body: [
      "Los cobros de suscripción se procesan a través de Mercado Pago, que tokeniza la tarjeta del asesor. Referidoo nunca ve ni almacena números completos de tarjeta.",
    ],
  },
  {
    title: "Con quién compartimos datos",
    body: [
      "Solo con los proveedores estrictamente necesarios para operar la plataforma: procesamiento de pagos (Mercado Pago), infraestructura y hosting, y base de datos. Todos bajo sus propias políticas de seguridad. También podríamos compartir información si una autoridad competente lo requiere conforme a la ley.",
    ],
  },
  {
    title: "Seguridad",
    body: [
      "Toda la comunicación con la plataforma viaja cifrada (HTTPS). Las contraseñas se almacenan cifradas con bcrypt — ni nosotros podemos ver tu contraseña real.",
    ],
  },
  {
    title: "Métricas del sitio",
    body: [
      "Usamos métricas agregadas y anónimas de visitas (Vercel Analytics) para entender el uso del sitio. No construimos ni vendemos perfiles publicitarios.",
    ],
  },
  {
    title: "Tus derechos",
    body: [
      "Puedes solicitar el acceso, rectificación, cancelación u oposición sobre tus datos personales (derechos ARCO) escribiendo a hola@referidoo.com. Si cancelas tu cuenta, tus datos dejan de usarse para operar el servicio.",
    ],
  },
  {
    title: "Cambios a este aviso",
    body: [
      "Si este aviso cambia, publicaremos la versión actualizada en esta misma página con su fecha de actualización.",
    ],
  },
];

export default function AvisoPrivacidadPage() {
  return (
    <div className={`bg-white ${hankenGrotesk.className}`}>
      <LandingHeader />
      <main className="max-w-[680px] mx-auto px-8 pt-16 pb-20">
        <h1 className="font-extrabold tracking-[-0.03em] text-[#0B0B0C] mb-3" style={{ fontSize: "clamp(1.8rem, 4vw, 40px)" }}>
          Aviso de privacidad
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
