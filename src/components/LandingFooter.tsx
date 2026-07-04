export function LandingFooter() {
  return (
    <footer className="border-t border-[#EFEFF1] overflow-hidden">
      <div className="relative" style={{ height: "21.8vw", minHeight: 130 }}>
        <div className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-8">
          <span className="font-bold text-[#0B0B0C]" style={{ fontSize: "24.2vw", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
        <div
          className="absolute rounded-full bg-[#2563EB]"
          style={{ width: "34vw", height: "34vw", right: "-7vw", bottom: "-11vw" }}
        />
        <div
          className="absolute inset-0 flex items-end overflow-hidden whitespace-nowrap pl-8"
          style={{
            WebkitMaskImage: "radial-gradient(17vw 17vw at calc(100% - 10vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
            maskImage: "radial-gradient(17vw 17vw at calc(100% - 10vw) calc(100% - 6vw), #000 99.5%, transparent 100%)",
          }}
        >
          <span className="font-bold text-white" style={{ fontSize: "24.2vw", lineHeight: 0.9 }}>
            referidoo
          </span>
        </div>
      </div>
      <div className="max-w-[1180px] mx-auto px-8 py-6 border-t border-[#EFEFF1] text-xs text-[#8A8F98] text-center">
        <p>
          © 2026 Referidoo — hecho en México para asesores de seguros.
          Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
