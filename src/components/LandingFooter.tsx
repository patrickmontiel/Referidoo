import Link from "next/link";

const WHATSAPP_URL =
  "https://wa.me/527351209009?text=" +
  encodeURIComponent("Hola Patrick, vi Referidoo y tengo una duda");

const PRODUCT_LINKS = [
  { label: "Cómo funciona", href: "/como-funciona" },
  { label: "Premios escalera y burbuja", href: "/como-funciona#paso-3" },
  { label: "Precios", href: "/#precios" },
  { label: "Portal del cliente", href: "/como-funciona#paso-4" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-[#EFEFF1] overflow-hidden">
      {/* Columnas: CTA + producto + contacto */}
      <div className="max-w-[1180px] mx-auto px-8 py-16 grid md:grid-cols-[1.3fr_1fr_1fr] gap-x-10 gap-y-12">
        <div>
          <p className="font-extrabold tracking-[-0.028em] text-[#0B0B0C] leading-[1.15] mb-7 text-balance" style={{ fontSize: "clamp(1.6rem, 2.6vw, 34px)" }}>
            Deja de contar referidos a mano.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/registro"
              className="text-sm font-medium bg-[#0B0B0C] text-white px-5 py-3 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[#3F4651] hover:text-[#0B0B0C] px-5 py-3 rounded-full border border-[#DADCE0] hover:border-[#0B0B0C] transition-[border-color,color,transform] duration-150 active:scale-[0.97]"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A8F98] mb-5">Producto</p>
          <ul className="space-y-3.5">
            {PRODUCT_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-[15px] text-[#3F4651] hover:text-[#0B0B0C] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A8F98] mb-5">Contacto</p>
          <ul className="space-y-3.5">
            <li>
              <a href="mailto:hola@referidoo.com" className="text-[15px] text-[#3F4651] hover:text-[#0B0B0C] transition-colors">
                hola@referidoo.com
              </a>
            </li>
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[15px] text-[#3F4651] hover:text-[#0B0B0C] transition-colors">
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Marca gigante — el círculo azul revela las "oo" en blanco vía mask */}
      <div className="relative" style={{ height: "18vw", minHeight: 120 }}>
        <div className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-8">
          <span className="font-bold text-[#0B0B0C]" style={{ fontSize: "19.5vw", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
        <div
          className="absolute rounded-full bg-[#2563EB]"
          style={{ width: "36vw", height: "36vw", right: "-5vw", bottom: "-12vw" }}
        />
        <div
          className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-8"
          style={{
            WebkitMaskImage: "radial-gradient(18vw 18vw at calc(100% - 13vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
            maskImage: "radial-gradient(18vw 18vw at calc(100% - 13vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: "19.5vw", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
      </div>

      {/* Legal */}
      <div className="relative z-10 bg-white border-t border-[#EFEFF1]">
        <div className="max-w-[1180px] mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#8A8F98]">
          <p>© 2026 Referidoo. Todos los derechos reservados.</p>
          <div className="flex items-center gap-7">
            <Link href="/aviso-de-privacidad" className="hover:text-[#0B0B0C] transition-colors">
              Aviso de privacidad
            </Link>
            <Link href="/terminos" className="hover:text-[#0B0B0C] transition-colors">
              Términos y condiciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
