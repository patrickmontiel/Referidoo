import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { advisorId } = await req.json();
  if (!advisorId) {
    return NextResponse.json({ error: "advisorId requerido" }, { status: 400 });
  }

  const advisor = await db.advisor.findUnique({
    where: { id: advisorId },
    select: { id: true, name: true, email: true, emailVerified: true, deletedAt: true },
  });

  if (!advisor || advisor.deletedAt) {
    return NextResponse.json({ error: "Asesor no encontrado" }, { status: 404 });
  }

  if (advisor.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verificationToken = randomBytes(32).toString("hex");
  await db.advisor.update({ where: { id: advisor.id }, data: { verificationToken } });

  await sendVerificationEmail({
    advisorEmail: advisor.email,
    advisorName: advisor.name,
    verificationToken,
  });

  return NextResponse.json({ ok: true });
}
