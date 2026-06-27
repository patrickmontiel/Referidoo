import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const baseUrl = req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/admin?verify=missing", baseUrl));
  }

  const advisor = await db.advisor.findUnique({ where: { verificationToken: token } });
  if (!advisor) {
    return NextResponse.redirect(new URL("/admin?verify=invalid", baseUrl));
  }

  await db.advisor.update({
    where: { id: advisor.id },
    data: { emailVerified: true, verificationToken: null },
  });

  // El link de verificación ya prueba identidad (token de un solo uso) — auto-
  // inicia sesión en vez de mandar a /login, para que quien dé clic llegue
  // directo a /admin ya autenticado, sin pedir contraseña otra vez.
  const sessionToken = signToken({ advisorId: advisor.id, email: advisor.email });
  const res = NextResponse.redirect(new URL("/admin?verify=success", baseUrl));
  res.cookies.set("advisor_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
