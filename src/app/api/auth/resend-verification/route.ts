import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  const session = await getAdvisorSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!advisor) {
    return NextResponse.json({ error: "Asesor no encontrado" }, { status: 404 });
  }

  if (advisor.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verificationToken = randomBytes(32).toString("hex");

  await db.advisor.update({
    where: { id: advisor.id },
    data: { verificationToken },
  });

  sendVerificationEmail({
    advisorEmail: advisor.email,
    advisorName: advisor.name,
    verificationToken,
  }).catch((err) => console.error("[resend-verification] error:", err));

  return NextResponse.json({ ok: true });
}
