import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t border-[#EFEFF1] overflow-hidden">
      {/* Navegación + tagline */}
      <div className="max-w-[1180px] mx-auto px-8 py-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
        <div>
          <Link href="/" aria-label="Ir al inicio" className="inline-block mb-3">
            <Logo size="md" />
          </Link>
          <p className="text-sm text-[#8A8F98] max-w-[320px] leading-relaxed">
            El sistema de referidos para asesores de seguros y planes
            financieros en México.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/como-funciona" className="text-sm text-[#5A626E] hover:text-[#0B0B0C] transition-colors">
            Cómo funciona
          </Link>
          <Link href="/login" className="text-sm text-[#5A626E] hover:text-[#0B0B0C] transition-colors">
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="text-sm font-medium bg-[#0B0B0C] text-white px-5 py-2.5 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97]"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>

      {/* Marca gigante — la palabra completa entra en pantalla y el círculo
         azul revela las "oo" en blanco vía mask */}
      <div className="relative" style={{ height: "18vw", minHeight: 120 }}>
        <div className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-8">
          <span className="font-bold text-[#0B0B0C]" style={{ fontSize: "19.5vw", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
        <div
          className="absolute rounded-full bg-[#2563EB]"
          style={{ width: "30vw", height: "30vw", right: "-6vw", bottom: "-9vw" }}
        />
        <div
          className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-8"
          style={{
            WebkitMaskImage: "radial-gradient(15vw 15vw at calc(100% - 9vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
            maskImage: "radial-gradient(15vw 15vw at calc(100% - 9vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: "19.5vw", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
      </div>

      {/* Legal */}
      <div className="relative z-10 bg-white border-t border-[#EFEFF1]">
        <div className="max-w-[1180px] mx-auto px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#8A8F98]">
          <p>© 2026 Referidoo. Todos los derechos reservados.</p>
          <p>Hecho en México para asesores de seguros.</p>
        </div>
      </div>
    </footer>
  );
}
