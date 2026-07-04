"use client";

import { useEffect, useRef, useState } from "react";

/* Número que cuenta hacia su valor. SSR y no-JS muestran el valor final;
   el conteo es un enhancement que solo corre con JS y sin
   prefers-reduced-motion. Si `to` cambia después, anima del valor
   mostrado al nuevo (tick corto). */
export function Count({
  to,
  run = true,
  prefix = "",
  duration = 750,
  delay = 0,
}: {
  to: number;
  run?: boolean;
  prefix?: string;
  duration?: number;
  delay?: number;
}) {
  const [value, setValue] = useState(to);
  const shownRef = useRef(to);
  const firstRef = useRef(true);

  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = to;
      setValue(to);
      return;
    }
    const from = firstRef.current ? 0 : shownRef.current;
    const dur = firstRef.current ? duration : 340;
    const wait = firstRef.current ? delay : 0;
    firstRef.current = false;
    if (from === to) {
      setValue(to);
      return;
    }
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = Math.round(from + (to - from) * eased);
        shownRef.current = v;
        setValue(v);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, wait);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to, run]);

  return (
    <>
      {prefix}
      {value.toLocaleString("es-MX")}
    </>
  );
}
