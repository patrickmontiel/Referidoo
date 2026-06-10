export function Logo({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-4xl" : size === "md" ? "text-2xl" : "text-base";
  const dot = size === "lg" ? "w-3 h-3 mb-1.5" : size === "md" ? "w-2 h-2 mb-1" : "w-1.5 h-1.5 mb-0.5";

  return (
    <div className="flex items-end gap-0">
      <span className={`${text} font-bold tracking-tight text-black leading-none`}>referidoo</span>
      <span className={`${dot} rounded-full bg-blue-500 ml-0.5 flex-shrink-0`} />
    </div>
  );
}
