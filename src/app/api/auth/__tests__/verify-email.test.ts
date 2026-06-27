import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    advisor: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { GET } from "../verify-email/route";

const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = db.advisor.update as unknown as ReturnType<typeof vi.fn>;

function getRequest(token?: string) {
  const url = token
    ? `http://localhost:3050/api/auth/verify-email?token=${token}`
    : "http://localhost:3050/api/auth/verify-email";
  return new NextRequest(url);
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockUpdate.mockReset();
});

describe("GET /api/auth/verify-email", () => {
  it("redirects with verify=missing when no token is provided", async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("verify=missing");
  });

  it("redirects with verify=invalid when the token doesn't match any advisor", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(getRequest("bad-token"));
    expect(res.headers.get("location")).toContain("verify=invalid");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("marks the advisor verified and clears the token on a valid token", async () => {
    mockFindUnique.mockResolvedValue({ id: "adv1", email: "a@x.com", verificationToken: "good-token" });
    const res = await GET(getRequest("good-token"));

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "adv1" },
      data: { emailVerified: true, verificationToken: null },
    });
    expect(res.headers.get("location")).toContain("verify=success");
  });

  // Regresión: el link de verificación redirigía a /admin sin iniciar sesión,
  // así que proxy.ts mandaba al usuario a /login en vez de dejarlo ya
  // autenticado — un paso extra innecesario para un link de un solo uso que
  // ya prueba identidad.
  it("logs the advisor in by setting the session cookie on success", async () => {
    mockFindUnique.mockResolvedValue({ id: "adv1", email: "a@x.com", verificationToken: "good-token" });
    const res = await GET(getRequest("good-token"));

    const cookie = res.cookies.get("advisor_token");
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBeTruthy();
  });
});
