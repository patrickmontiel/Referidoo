import { redirect } from "next/navigation";
import Link from "next/link";
import { Hanken_Grotesk } from "next/font/google";
import { db } from "@/lib/db";
import { LandingHeader } from "@/components/LandingHeader";
import { LandingFooter } from "@/components/LandingFooter";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Misma normalización que genera el link en el dashboard del asesor.
function nameToSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const BULLETS = [
  {
    title: "Tus clientes te consiguen clientes",
    body: "Cada cliente tuyo recibe su link de referidos y un portal donde ve sus premios — y su red trabaja para ti.",
  },
  {
    title: "Cero cuentas a mano",
    body: "Los referidos caen a tu pipeline solos y el premio de cada cliente se calcula solo, con tus propias reglas.",
  },
  {
    title: "Gratis para empezar",
    body: "Cartera ilimitada y hasta 12 leads sin pagar nada. Sin tarjeta.",
  },
];

export default async function UnetePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const advisors = await db.advisor.findMany({
    where: { deletedAt: null },
    select: { name: true },
  });
  const inviter = advisors.find((a) => nameToSlug(a.name) === slug);
  if (!inviter) redirect("/registro");

  const firstName = inviter.name.split(" ")[0];

  return (
    <div className={`bg-white min-h-screen flex flex-col ${hankenGrotesk.className}`}>
      <LandingHeader />
      <main className="flex-1 max-w-[720px] mx-auto px-8 pt-16 pb-20 text-center">
        <p className="inline-block text-xs font-bold text-[#2563EB] bg-[#EEF3FE] rounded-full px-4 py-1.5 mb-6">
          Invitación de {inviter.name}
        </p>
        <h1
          className="font-extrabold tracking-[-0.03em] leading-[1.08] mb-5 text-[#0B0B0C] text-balance"
          style={{ fontSize: "clamp(2rem, 5vw, 52px)" }}
        >
          {firstName} ya deja que su cartera le traiga las ventas. ¿Y tú?
        </h1>
        <p className="text-[#5A626E] leading-[1.6] max-w-[520px] mx-auto mb-10" style={{ fontSize: 18 }}>
          Referidoo es el sistema de referidos para asesores de seguros y planes
          financieros en México — cada recomendación se registra sola y su
          premio se calcula solo.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 text-left mb-10">
          {BULLETS.map((b) => (
            <div key={b.title} className="bg-[#F4F5F7] rounded-[18px] border border-[#ECEDEF] p-5">
              <h3 className="font-bold text-[15px] text-[#0B0B0C] mb-1.5">{b.title}</h3>
              <p className="text-[13.5px] text-[#5A626E] leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={`/registro?ref=${encodeURIComponent(slug)}`}
            className="text-sm font-medium bg-[#0B0B0C] text-white px-7 py-3.5 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]"
          >
            Crear mi cuenta gratis
          </Link>
          <Link
            href="/como-funciona"
            className="text-sm font-medium text-[#3F4651] hover:text-[#0B0B0C] px-6 py-3.5 rounded-full border border-[#DADCE0] hover:border-[#0B0B0C] transition-colors"
          >
            Ver cómo funciona
          </Link>
        </div>
        <p className="text-xs text-[#8A8F98] mt-5">
          Plan gratis — clientes ilimitados. Sin tarjeta para empezar.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
