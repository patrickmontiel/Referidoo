/* Wordmark inline: "referidoo" con la bolita azul del logo al pie,
   escalada al tamaño del texto donde se use (em). */
export function BrandWord({ children = "referidoo" }: { children?: string }) {
  return (
    <span className="whitespace-nowrap">
      {children}
      <span
        className="inline-block rounded-full bg-[#3B82F6]"
        style={{ width: "0.24em", height: "0.24em", marginLeft: "0.09em" }}
      />
    </span>
  );
}
