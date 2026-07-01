import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/admin?verify=missing", BASE_URL));
  }

  const advisor = await db.advisor.findUnique({ where: { verificationToken: token } });
  if (!advisor) {
    return NextResponse.redirect(new URL("/admin?verify=invalid", BASE_URL));
  }

  await db.advisor.update({
    where: { id: advisor.id },
    data: { emailVerified: true, verificationToken: null },
  });

  const sessionToken = signToken({
    advisorId: advisor.id,
    email: advisor.email,
    name: advisor.name,
    emailVerified: true,
    plan: advisor.plan,
    onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
  });
  const res = NextResponse.redirect(new URL("/admin?verify=success", BASE_URL));
  res.cookies.set("advisor_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
