import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const advisor = await db.advisor.findUnique({ where: { email } });
  if (!advisor) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const valid = await verifyPassword(password, advisor.password);
  if (!valid) {
    return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
  }

  const token = signToken({ advisorId: advisor.id, email: advisor.email });

  const res = NextResponse.json({ ok: true, advisorId: advisor.id });
  res.cookies.set("advisor_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
