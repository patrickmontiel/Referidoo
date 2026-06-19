import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";
import { signToken } from "../lib/auth";

function requestWithCookie(value: string | undefined) {
  const req = new NextRequest("http://localhost:3050/admin");
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
});
