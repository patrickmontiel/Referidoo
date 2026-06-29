export function ChartSkeleton({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-end gap-2 px-1" style={{ height }}>
      {[40, 65, 50, 80, 60, 90, 55, 75, 45].map((h, i) => (
        <div key={i} className="flex-1 bg-brand-border-1 rounded animate-pulse" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between animate-pulse">
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 bg-brand-border-1 rounded" />
            <div className="h-3 w-36 bg-brand-border-1 rounded" />
          </div>
          <div className="h-5 w-20 bg-brand-border-1 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DonutSkeleton({ size = 220 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center gap-6" style={{ height: size }}>
      <div className="w-28 h-28 rounded-full border-[16px] border-brand-border-1 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 w-20 bg-brand-border-1 rounded animate-pulse" />
        <div className="h-3 w-24 bg-brand-border-1 rounded animate-pulse" />
        <div className="h-3 w-16 bg-brand-border-1 rounded animate-pulse" />
      </div>
    </div>
  );
}
