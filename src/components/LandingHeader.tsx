"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md transition-[border-color] duration-200 ${
        scrolled ? "border-b border-[#ECEDEF]" : "border-b border-transparent"
      }`}
    >
      <div className="max-w-[1180px] mx-auto px-8 h-16 flex items-center justify-between">
        <Logo size="md" />
        <div className="hidden sm:flex items-center gap-3">
          <Link href="/como-funciona" className="text-sm text-[#5A626E] hover:text-[#0B0B0C] transition px-3 py-2">
            Cómo funciona
          </Link>
          <Link href="/login" className="text-sm text-[#5A626E] hover:text-[#0B0B0C] transition px-3 py-2">
            Iniciar sesión
          </Link>
          <Link
            href="/registro"
            className="text-sm font-medium bg-[#0B0B0C] text-white px-4 py-2 rounded-full transition-[background-color,transform] duration-150 hover:bg-[#26262a] active:scale-[0.97] whitespace-nowrap"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </div>
    </header>
  );
}
