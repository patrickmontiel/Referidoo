// Posicionamiento del tooltip del recorrido de onboarding.
// Función pura y testeable: dado el rectángulo iluminado (spotlight) y el
// viewport, decide dónde va la tarjeta del tooltip. Regla dura: si CUALQUIER
// lado tiene espacio, la tarjeta va completamente fuera del spotlight en ese
// lado — nunca encima. Solo si el elemento es tan grande que no cabe en
// ningún lado, se ancla al borde con más espacio (overlap mínimo inevitable).

export type Rect = { top: number; left: number; width: number; height: number };
export type Side = "below" | "above" | "right" | "left";
export type TipPlacement = { top: number; left: number; side: Side; fits: boolean };

export function computeTipPosition(params: {
  rect: Rect; // spotlight (padding ya aplicado)
  vw: number;
  vh: number;
  tipW: number;
  tipH: number;
  gap: number;
  margin: number;
  minLeft: number; // borde izquierdo permitido (después del sidebar)
}): TipPlacement {
  const { rect, vw, vh, tipW, tipH, gap, margin, minLeft } = params;

  const sTop = rect.top;
  const sBottom = rect.top + rect.height;
  const sLeft = rect.left;
  const sRight = rect.left + rect.width;

  const spaceBelow = vh - sBottom;
  const spaceAbove = sTop;
  const spaceRight = vw - sRight;
  const spaceLeft = sLeft - minLeft;

  const clampX = (x: number) => Math.max(minLeft, Math.min(x, vw - tipW - margin));
  const clampY = (y: number) => Math.max(margin, Math.min(y, vh - tipH - margin));
  const centerX = clampX(sLeft + rect.width / 2 - tipW / 2);
  const centerY = clampY(sTop + rect.height / 2 - tipH / 2);

  // Orden de preferencia: abajo, arriba, derecha, izquierda.
  if (spaceBelow >= tipH + gap) {
    return { top: sBottom + gap, left: centerX, side: "below", fits: true };
  }
  if (spaceAbove >= tipH + gap) {
    return { top: sTop - gap - tipH, left: centerX, side: "above", fits: true };
  }
  if (spaceRight >= tipW + gap) {
    return { left: sRight + gap, top: centerY, side: "right", fits: true };
  }
  if (spaceLeft >= tipW + gap) {
    return { left: sLeft - gap - tipW, top: centerY, side: "left", fits: true };
  }

  // El elemento no deja lugar en ningún lado (más grande que el viewport menos
  // el tooltip). Anclar al borde con más espacio; el overlap es inevitable
  // pero se minimiza.
  const maxSpace = Math.max(spaceBelow, spaceAbove, spaceRight, spaceLeft);
  if (maxSpace === spaceBelow) return { top: clampY(vh - tipH - margin), left: centerX, side: "below", fits: false };
  if (maxSpace === spaceAbove) return { top: margin, left: centerX, side: "above", fits: false };
  if (maxSpace === spaceRight) return { left: clampX(vw - tipW - margin), top: centerY, side: "right", fits: false };
  return { left: minLeft, top: centerY, side: "left", fits: false };
}

// ¿Se solapan dos rectángulos? (para tests y para validar en runtime)
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}
