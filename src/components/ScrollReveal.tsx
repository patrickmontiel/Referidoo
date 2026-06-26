"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades + lifts children into view on scroll. Server-rendered output (and the
 * brief pre-hydration moment) has no inline style at all, so content is fully
 * visible by default — JS only ever adds the entrance animation as an
 * enhancement, never hides content a crawler or slow client might miss.
 */
export function ScrollReveal({
  children,
  className,
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setArmed(true);
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={
        armed
          ? {
              opacity: shown ? 1 : 0,
              transform: shown ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 600ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms, transform 600ms cubic-bezier(0.22,1,0.36,1) ${delayMs}ms`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
