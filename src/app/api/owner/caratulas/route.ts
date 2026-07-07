import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// Validación de carátulas por el dueño: marca la evidencia como validada o
// con discrepancia (el detector de /owner la mantiene visible hasta resolverse).
export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { referralId, status } = await req.json();
  if (!referralId || !["validada", "discrepancia"].includes(status)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const referral = await db.referral.findUnique({
    where: { id: referralId },
    select: { id: true, caratulaUrl: true },
  });
  if (!referral || !referral.caratulaUrl) {
    return NextResponse.json({ error: "Referido sin carátula" }, { status: 404 });
  }

  await db.referral.update({ where: { id: referralId }, data: { caratulaStatus: status } });
  return NextResponse.json({ ok: true });
}
