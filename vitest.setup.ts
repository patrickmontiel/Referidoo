import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// next/font/google relies on a Next.js build-time SWC/webpack transform that
// doesn't run under Vitest — calling the real export throws. Stub every font
// loader used in app code with a shape close enough for tests (className +
// variable), so pages can import fonts at module scope without a test-only
// branch in production code.
vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "", variable: "--font-geist-sans" }),
  Hanken_Grotesk: () => ({ className: "", variable: "--font-hanken-grotesk" }),
}));

// jsdom doesn't implement these; components using prefers-reduced-motion or
// scroll-triggered reveals (ScrollReveal) need them to mount without throwing.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

global.IntersectionObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver;
