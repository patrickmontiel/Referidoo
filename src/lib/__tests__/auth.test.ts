import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isPlatformOwner } from "../auth";

describe("isPlatformOwner", () => {
  const ORIGINAL_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL;

  beforeEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
  });

  afterEach(() => {
    process.env.PLATFORM_OWNER_EMAIL = ORIGINAL_OWNER_EMAIL;
  });

  it("returns true when the email matches PLATFORM_OWNER_EMAIL", () => {
    expect(isPlatformOwner("patrick@referidoo.com")).toBe(true);
  });

  it("returns false when the email does not match", () => {
    expect(isPlatformOwner("eduardo@referidoo.mx")).toBe(false);
  });

  it("returns false when PLATFORM_OWNER_EMAIL is not configured", () => {
    delete process.env.PLATFORM_OWNER_EMAIL;
    expect(isPlatformOwner("anyone@x.com")).toBe(false);
  });
});
