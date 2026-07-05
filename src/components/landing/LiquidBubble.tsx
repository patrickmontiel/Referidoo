/* Burbuja de premio con líquido animado — réplica exacta de la burbuja del
   portal del cliente (mismos colores y capas de agua). Las olas wave-a/wave-b
   se mecen en contrafase (globals.css) y respetan reduced-motion; la altura
   del agua se controla con `fill` (%) y sube al revelar (.bubble-fill). */
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
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: "#eef1f9",
        ["--bubble-fill" as string]: `${fill}%`,
      } as React.CSSProperties}
    >
      <span
        className="bubble-fill wave-a absolute block"
        style={{
          bottom: 0,
          left: "-8%",
          width: "116%",
          background: "linear-gradient(180deg, #5B86F7 0%, #2B57F0 100%)",
          borderRadius: "42% 38% 0 0",
        }}
      />
      <span
        className="bubble-fill wave-b absolute block"
        style={{
          bottom: 0,
          left: "-8%",
          width: "116%",
          background: "linear-gradient(180deg, rgba(91,134,247,.5) 0%, rgba(43,87,240,.3) 100%)",
          borderRadius: "38% 42% 0 0",
        }}
      />
    </div>
  );
}
