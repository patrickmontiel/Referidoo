import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: { advisor: { findUnique: vi.fn().mockResolvedValue(null) } },
}));

import { __resetRateLimit } from "@/lib/rate-limit";
import { POST } from "../login/route";

function post(ip = "7.7.7.7") {
  return new NextRequest("http://localhost:3050/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
    body: JSON.stringify({ email: "x@y.com", password: "whatever" }),
  });
}

beforeEach(() => __resetRateLimit());

describe("rate limit de /api/auth/login", () => {
  it("responde 429 tras exceder 10 intentos por IP (los primeros 10 pasan al 401)", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await POST(post());
      expect(res.status).toBe(401); // usuario inexistente → credenciales incorrectas
    }
    const blocked = await POST(post());
    expect(blocked.status).toBe(429);
  });

  it("una IP distinta no queda bloqueada por otra", async () => {
    for (let i = 0; i < 11; i++) await POST(post("1.1.1.1"));
    const other = await POST(post("2.2.2.2"));
    expect(other.status).toBe(401); // fresca para otra IP
  });
});
