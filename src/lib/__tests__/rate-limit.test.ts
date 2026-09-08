import { describe, it, expect, beforeEach } from "vitest";
import { isRateLimited, clientIp, __resetRateLimit } from "@/lib/rate-limit";

beforeEach(() => __resetRateLimit());

describe("isRateLimited", () => {
  it("permite hasta `max` llamadas y bloquea la siguiente (429)", () => {
    const key = "k1";
    for (let i = 0; i < 3; i++) expect(isRateLimited(key, 3, 10_000)).toBe(false);
    expect(isRateLimited(key, 3, 10_000)).toBe(true); // la 4ª excede
    expect(isRateLimited(key, 3, 10_000)).toBe(true); // sigue bloqueada dentro de la ventana
  });

  it("claves distintas no se afectan entre sí", () => {
    expect(isRateLimited("a", 1, 10_000)).toBe(false);
    expect(isRateLimited("b", 1, 10_000)).toBe(false);
    expect(isRateLimited("a", 1, 10_000)).toBe(true);
    expect(isRateLimited("b", 1, 10_000)).toBe(true);
  });
});

describe("clientIp", () => {
  it("toma la primera IP de x-forwarded-for", () => {
    const req = { headers: { get: (n: string) => (n === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null) } };
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("cae a 'unknown' sin headers de IP", () => {
    expect(clientIp({ headers: { get: () => null } })).toBe("unknown");
  });
});
