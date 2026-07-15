import { describe, it, expect } from "vitest";
import { computeTipPosition, rectsOverlap, type Rect } from "../tour-position";

const TW = 320, TH = 200, G = 16, M = 12;

function place(rect: Rect, vw: number, vh: number, minLeft = M) {
  return computeTipPosition({ rect, vw, vh, tipW: TW, tipH: TH, gap: G, margin: M, minLeft });
}

function tipRect(p: { top: number; left: number }): Rect {
  return { top: p.top, left: p.left, width: TW, height: TH };
}

describe("computeTipPosition", () => {
  it("coloca el tooltip debajo cuando hay espacio, sin encimarse", () => {
    const rect = { top: 100, left: 500, width: 300, height: 120 };
    const p = place(rect, 1440, 900);
    expect(p.side).toBe("below");
    expect(p.fits).toBe(true);
    expect(rectsOverlap(tipRect(p), rect)).toBe(false);
  });

  it("coloca arriba cuando abajo no cabe", () => {
    const rect = { top: 400, left: 500, width: 300, height: 460 };
    const p = place(rect, 1440, 900);
    expect(p.side).toBe("above");
    expect(rectsOverlap(tipRect(p), rect)).toBe(false);
  });

  it("coloca a la derecha del sidebar (target alto y angosto tipo nav)", () => {
    const rect = { top: 60, left: 0, width: 208, height: 820 };
    const p = place(rect, 1440, 900, 208 + G);
    expect(p.side).toBe("right");
    expect(rectsOverlap(tipRect(p), rect)).toBe(false);
    expect(p.left).toBeGreaterThanOrEqual(208 + G);
  });

  it("nunca se encima cuando algún lado tiene espacio — barrido de tamaños y posiciones", () => {
    const viewports = [
      [1440, 900], [1280, 800], [1024, 768], [1366, 768], [1536, 864],
    ];
    let checked = 0;
    for (const [vw, vh] of viewports) {
      for (let w = 120; w <= vw - 100; w += 180) {
        for (let h = 60; h <= vh - 80; h += 140) {
          for (let x = M; x + w <= vw - M; x += 220) {
            for (let y = M; y + h <= vh - M; y += 180) {
              const rect = { top: y, left: x, width: w, height: h };
              const p = place(rect, vw, vh);
              if (p.fits) {
                checked++;
                expect(
                  rectsOverlap(tipRect(p), rect),
                  `overlap en vw=${vw} vh=${vh} rect=${JSON.stringify(rect)} tip=${JSON.stringify(p)}`
                ).toBe(false);
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("el tooltip siempre queda dentro del viewport (con margen)", () => {
    const cases: Array<[Rect, number, number]> = [
      [{ top: 10, left: 10, width: 200, height: 100 }, 1280, 800],
      [{ top: 700, left: 1000, width: 200, height: 80 }, 1280, 800],
      [{ top: 300, left: 600, width: 100, height: 100 }, 1024, 768],
    ];
    for (const [rect, vw, vh] of cases) {
      const p = place(rect, vw, vh);
      expect(p.left).toBeGreaterThanOrEqual(M - 1);
      expect(p.left + TW).toBeLessThanOrEqual(vw - M + 1);
      expect(p.top).toBeGreaterThanOrEqual(M - 1);
      expect(p.top + TH).toBeLessThanOrEqual(vh - M + 1);
    }
  });

  it("target gigante que llena la pantalla: fits=false, se ancla sin salirse", () => {
    const rect = { top: 20, left: 20, width: 1400, height: 850 };
    const p = place(rect, 1440, 900);
    expect(p.fits).toBe(false);
    // aún dentro del viewport
    expect(p.left).toBeGreaterThanOrEqual(M - 1);
    expect(p.top + TH).toBeLessThanOrEqual(900 - M + 1);
  });
});
