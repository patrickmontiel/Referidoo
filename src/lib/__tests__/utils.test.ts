import { describe, it, expect } from "vitest";
import { generateReferralCode } from "../utils";

describe("generateReferralCode", () => {
  it("lowercases and strips spaces/punctuation from the name", () => {
    const code = generateReferralCode("Juan Pérez!! 99");
    // Accented letters fall outside [a-z0-9] and are stripped too, not transliterated
    expect(code).toMatch(/^juanpr[23456789abcdefghjkmnpqrstuvwxyz]{4}$/);
  });

  it("truncates the name portion to 6 characters", () => {
    const code = generateReferralCode("Establishment Industries");
    expect(code.slice(0, 6)).toBe("establ".slice(0, 6));
    expect(code).toHaveLength(10);
  });

  it("produces a 4-character random suffix from the allowed charset", () => {
    const code = generateReferralCode("Ana");
    const suffix = code.slice(-4);
    expect(suffix).toMatch(/^[23456789abcdefghjkmnpqrstuvwxyz]{4}$/);
  });

  it("generates different codes on repeated calls (random suffix varies)", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateReferralCode("Ana")));
    // Astronomically unlikely all 20 collide with a 4-char base-32 suffix
    expect(codes.size).toBeGreaterThan(1);
  });
});
