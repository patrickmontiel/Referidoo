import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvisorSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    title: "Seguimiento de referidos",
    body: "Cada referido que llega por el link de un cliente aparece en tu pipeline — quién lo mandó, cuándo, y en qué etapa está.",
    icon: "M3 4H21L14 12.5V19L10 21V12.5L3 4Z",
  },
  {
    title: "Premios automáticos",
    body: "Escalera de premios para Vida y PPR, premios burbuja para Auto y GMM. Tú configuras los montos, Referidoo hace las cuentas.",
    icon: "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z",
  },
  {
    title: "Portal para tus clientes",
    body: "Cada cliente recibe su propio link de referidos y un portal donde ve su progreso y reclama premios — sin que tú tengas que estar checando WhatsApp.",
    icon: "M17 21V19C17 17.9 16.1 17 15 17H9C7.9 17 7 17.9 7 19V21M12 13C14.2 13 16 11.2 16 9C16 6.8 14.2 5 12 5C9.8 5 8 6.8 8 9C8 11.2 9.8 13 12 13Z",
  },
  {
    title: "Cobros y planes seguros",
    body: "Suscripción mensual cobrada automáticamente vía Mercado Pago. Sin transferencias manuales, sin recordatorios de pago.",
    icon: "M12 8a4 4 0 100 8 4 4 0 000-8zM19.4 13a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33 1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82 1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  },
];

const COMPARISON = [
  { antes: "Cuentas referidos a mano en WhatsApp o una hoja de Excel", despues: "Cada referido se registra solo, con su estatus siempre a la vista" },
  { antes: "Se te olvida quién te refirió a quién, o cuánto le debes", despues: "El premio se calcula solo según tus reglas — sin hacer cuentas" },
  { antes: "Persigues pagos de tu suscripción manualmente cada mes", despues: "Cobro automático, sin que tengas que acordarte" },
];

export default async function Home() {
  const session = await getAdvisorSession();
  if (session) redirect("/admin");

  return (
    <div className="bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-black transition px-3 py-2">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="text-sm font-medium bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-900 transition">
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-16 pb-12 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight mb-5">
            Tus referidos, organizados.
            <br />
            Tus premios, automáticos.
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
            Referidoo es el panel de referidos para asesores de seguros en México —
            reemplaza el WhatsApp y el Excel con un sistema que cuenta, calcula y
            paga por ti.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/registro" className="text-sm font-medium bg-black text-white px-5 py-3 rounded-xl hover:bg-gray-900 transition">
              Crear cuenta gratis
            </Link>
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-black px-5 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition">
              Ya tengo cuenta
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-4">Gratis hasta 2 clientes. Sin tarjeta para empezar.</p>
        </div>

        <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Así se ve tu panel</p>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3">
            <p className="text-xs text-gray-400 mb-1">Premios pagados</p>
            <p className="text-2xl font-semibold">$2,500</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className="text-xl font-semibold">4</p>
              <p className="text-xs text-gray-400 mt-1">Clientes activos</p>
            </div>
            <div className="bg-black text-white rounded-2xl p-4">
              <p className="text-xl font-semibold">8</p>
              <p className="text-xs text-gray-400 mt-1">Convertidos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature highlight */}
      <section className="max-w-5xl mx-auto px-5 py-16 border-t border-gray-100">
        <div className="max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-4">
            Cobra automático, sin perseguir pagos
          </h2>
          <p className="text-gray-500 leading-relaxed">
            Tu suscripción se cobra sola cada mes vía Mercado Pago. Y cuando un
            cliente te refiere a alguien que cierra, el premio se calcula con tus
            propias reglas — escalera para Vida y PPR, premios burbuja para Auto
            y Gastos Médicos Mayores. Tú decides los montos, Referidoo hace las cuentas.
          </p>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-5xl mx-auto px-5 py-16 border-t border-gray-100">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 max-w-xl">
          Todo lo que necesitas para no perder ni un referido
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d={f.icon} stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="font-medium mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-5xl mx-auto px-5 py-16 border-t border-gray-100">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 text-center">
          Antes vs. con Referidoo
        </h2>
        <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-2 text-xs font-medium uppercase tracking-wider text-gray-400 px-6 py-3 border-b border-gray-100">
            <span>Antes</span>
            <span>Con Referidoo</span>
          </div>
          {COMPARISON.map((row, i) => (
            <div key={i} className={`grid grid-cols-2 px-6 py-4 text-sm ${i > 0 ? "border-t border-gray-100" : ""}`}>
              <p className="text-gray-500 pr-4">{row.antes}</p>
              <p className="font-medium pr-4">{row.despues}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-5 py-16 border-t border-gray-100">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-10 text-center">
          Simple y transparente
        </h2>
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-gray-100 p-7">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Freemium</p>
            <p className="text-3xl font-semibold mb-1">Gratis</p>
            <p className="text-sm text-gray-400 mb-6">Hasta 2 clientes</p>
            <ul className="text-sm text-gray-500 space-y-2 mb-7">
              <li>Seguimiento de referidos</li>
              <li>Premios automáticos</li>
              <li>Portal para tus clientes</li>
            </ul>
            <Link href="/registro" className="block text-center text-sm font-medium border border-gray-200 px-4 py-3 rounded-xl hover:bg-gray-50 transition">
              Crear cuenta gratis
            </Link>
          </div>
          <div className="rounded-2xl border-2 border-black p-7">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Pagado</p>
            <p className="text-3xl font-semibold mb-1">$539 MXN<span className="text-base font-normal text-gray-400">/mes</span></p>
            <p className="text-sm text-gray-400 mb-6">Clientes ilimitados</p>
            <ul className="text-sm text-gray-500 space-y-2 mb-7">
              <li>Todo lo del plan freemium</li>
              <li>Clientes ilimitados</li>
              <li>Cobro automático vía Mercado Pago</li>
            </ul>
            <Link href="/registro" className="block text-center text-sm font-medium bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-900 transition">
              Empezar
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-8 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-5 text-sm text-gray-400">
            <Link href="/login" className="hover:text-black transition">Iniciar sesión</Link>
            <Link href="/registro" className="hover:text-black transition">Crear cuenta</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
