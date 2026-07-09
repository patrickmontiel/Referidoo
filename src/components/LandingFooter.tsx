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
      {/* Columnas: producto + contacto */}
      <div className="max-w-[1180px] mx-auto px-6 md:px-8 py-8 md:py-16 grid grid-cols-2 gap-x-6 md:gap-x-10 gap-y-6 md:gap-y-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A8F98] mb-3 md:mb-5">Producto</p>
          <ul className="space-y-2.5 md:space-y-3.5">
            {PRODUCT_LINKS.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-[14px] md:text-[15px] text-[#3F4651] hover:text-[#0B0B0C] transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#8A8F98] mb-3 md:mb-5">Contacto</p>
          <ul className="space-y-2.5 md:space-y-3.5">
            <li>
              <a href="mailto:hola@referidoo.com" className="text-[14px] md:text-[15px] text-[#3F4651] hover:text-[#0B0B0C] transition-colors">
                hola@referidoo.com
              </a>
            </li>
            <li>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-[14px] md:text-[15px] text-[#3F4651] hover:text-[#0B0B0C] transition-colors">
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Marca gigante — el círculo azul revela las "oo" en blanco vía mask.
          Sin piso de altura fijo: en celular escala solo con vw (antes un
          minHeight:120 dejaba una franja de aire muerto arriba del texto). */}
      <div className="relative" style={{ height: "clamp(56px, 18vw, 260px)" }}>
        <div className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-6 md:pl-8">
          <span className="font-bold text-[#0B0B0C]" style={{ fontSize: "clamp(42px, 19.5vw, 290px)", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
        <div
          className="absolute rounded-full bg-[#2563EB]"
          style={{ width: "36vw", height: "36vw", right: "-5vw", bottom: "-12vw" }}
        />
        <div
          className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-6 md:pl-8"
          style={{
            WebkitMaskImage: "radial-gradient(18vw 18vw at calc(100% - 13vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
            maskImage: "radial-gradient(18vw 18vw at calc(100% - 13vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: "clamp(42px, 19.5vw, 290px)", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
      </div>

      {/* Legal */}
      <div className="relative z-10 bg-white border-t border-[#EFEFF1]">
        <div className="max-w-[1180px] mx-auto px-6 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[13px] text-[#8A8F98]">
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
