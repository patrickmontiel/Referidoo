/* Burbuja de premio con líquido animado — la misma que ve el cliente en su
   portal. El nivel se controla con `fill` (%); las olas y el brillo vienen
   de globals.css (.liquid-wave / .bubble-shine) y respetan reduced-motion. */
export function LiquidBubble({
  size = 64,
  fill = 70,
  className = "",
}: {
  size?: number;
  fill?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-full border-2 overflow-hidden bg-[#EEF3FE] ${className}`}
      style={{
        width: size,
        height: size,
        borderColor: "#2563EB",
        boxShadow: "0 3px 10px rgba(37,99,235,.25)",
      }}
    >
      <div
        className="bubble-fill absolute bottom-0 left-0 right-0"
        style={{
          background: "linear-gradient(to top, #2563EB, #6EA1F5)",
          ["--bubble-fill" as string]: `${fill}%`,
        } as React.CSSProperties}
      >
        <span className="liquid-wave" />
        <span className="liquid-wave liquid-wave-2" />
      </div>
      <div className="bubble-shine absolute inset-0 rounded-full" />
    </div>
  );
}
