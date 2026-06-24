import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { signToken } from "../lib/auth";

function requestWithCookie(value: string | undefined, path = "/admin") {
  const req = new NextRequest(`http://localhost:3050${path}`);
  if (value !== undefined) {
    req.cookies.set("advisor_token", value);
  }
  return req;
}

describe("proxy", () => {
  it("redirects to /login when the advisor_token cookie is missing", () => {
    const res = proxy(requestWithCookie(undefined));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3050/login");
  });

  it("redirects to /login when the advisor_token cookie is invalid", () => {
    const res = proxy(requestWithCookie("not-a-real-jwt"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3050/login");
  });

  it("passes through when the advisor_token cookie is a valid session", () => {
    const token = signToken({ advisorId: "adv1", email: "eduardo@referidoo.mx" });
    const res = proxy(requestWithCookie(token));
    expect(res.headers.get("location")).toBeNull();
  });

  describe("/owner gate", () => {
    const ORIGINAL_OWNER_EMAIL = process.env.PLATFORM_OWNER_EMAIL;

    beforeEach(() => {
      process.env.PLATFORM_OWNER_EMAIL = "patrick@referidoo.com";
    });

    afterEach(() => {
      process.env.PLATFORM_OWNER_EMAIL = ORIGINAL_OWNER_EMAIL;
    });

    it("redirects a non-owner advisor to /admin instead of serving /owner", () => {
      const token = signToken({ advisorId: "adv1", email: "eduardo@referidoo.mx" });
      const res = proxy(requestWithCookie(token, "/owner"));
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("http://localhost:3050/admin");
    });

    it("passes through for the platform owner", () => {
      const token = signToken({ advisorId: "owner1", email: "patrick@referidoo.com" });
      const res = proxy(requestWithCookie(token, "/owner/asesores"));
      expect(res.headers.get("location")).toBeNull();
    });

    it("does not apply the owner check to /admin paths", () => {
      const token = signToken({ advisorId: "adv1", email: "eduardo@referidoo.mx" });
      const res = proxy(requestWithCookie(token, "/admin"));
      expect(res.headers.get("location")).toBeNull();
    });
  });
});
