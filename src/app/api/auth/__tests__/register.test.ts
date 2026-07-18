import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  db: {
    advisor: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/auth", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return { ...actual, hashPassword: vi.fn().mockResolvedValue("hashed"), signToken: vi.fn().mockReturnValue("token"), setAdvisorCookie: vi.fn() };
});

import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { signToken, setAdvisorCookie } from "@/lib/auth";
import { POST } from "../register/route";

const mockFindUnique = db.advisor.findUnique as unknown as ReturnType<typeof vi.fn>;
const mockCreate = db.advisor.create as unknown as ReturnType<typeof vi.fn>;
const mockSendVerification = sendVerificationEmail as unknown as ReturnType<typeof vi.fn>;
const mockSignToken = signToken as unknown as ReturnType<typeof vi.fn>;
const mockSetAdvisorCookie = setAdvisorCookie as unknown as ReturnType<typeof vi.fn>;

function postRequest(body: unknown) {
  return new NextRequest("http://localhost:3050/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockFindUnique.mockReset();
  mockCreate.mockReset();
  mockSendVerification.mockClear();
  mockSignToken.mockReset();
  mockSignToken.mockReturnValue("token");
  mockSetAdvisorCookie.mockReset();
});

describe("POST /api/auth/register", () => {
  it("returns 400 when required fields are missing", async () => {
    const res = await POST(postRequest({ email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    const res = await POST(postRequest({ name: "Ana", email: "a@b.com", password: "short" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/8 caracteres/);
  });

  it("returns 409 when the email is already registered", async () => {
    mockFindUnique.mockResolvedValue({ id: "adv1", email: "a@b.com" });
    const res = await POST(postRequest({ name: "Ana", email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(409);
  });

  it("creates an advisor on a 30-day Pro trial (plan=paid, paidUntil set) with emailVerified=false and sends a verification email", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      id: "adv1",
      name: "Ana",
      email: "a@b.com",
      emailVerified: false,
      plan: "paid",
      onboardedAt: null,
    });

    const res = await POST(postRequest({ name: "Ana", email: "a@b.com", password: "12345678" }));

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ plan: "paid", paidUntil: expect.any(Date), emailVerified: false }),
      })
    );
    expect(mockSendVerification).toHaveBeenCalledTimes(1);
    expect(mockSignToken).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana", emailVerified: false, plan: "paid", onboardedAt: null })
    );
    expect(mockSetAdvisorCookie).toHaveBeenCalledWith(expect.anything(), "token");
  });

  it("returns a friendly 409 when create() races on the unique email constraint", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error("Unique constraint failed on the fields: (`email`)"));

    const res = await POST(postRequest({ name: "Ana", email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(409);
  });

  it("returns a generic 500 message (no internal details) on unexpected DB errors", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error("connection timeout to turso"));

    const res = await POST(postRequest({ name: "Ana", email: "a@b.com", password: "12345678" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).not.toMatch(/turso/i);
  });
});
