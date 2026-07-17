import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

// Estado de las tareas de "Primeros Pasos" — todo derivado de datos reales, así
// que se auto-marca solo y nunca se desincroniza. Lo consumen el chip de la
// barra superior y la tarjeta del Resumen.
export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisorId = session.advisorId;
  const [advisor, clientCount, referralCount, tierCount, settings] = await Promise.all([
    db.advisor.findUnique({ where: { id: advisorId }, select: { emailVerified: true } }),
    db.client.count({ where: { advisorId } }),
    db.referral.count({ where: { advisorId, deletedAt: null } }),
    db.rewardTier.count({ where: { advisorId } }),
    db.advisorSettings.findUnique({ where: { advisorId }, select: { schedulingUrl: true } }),
  ]);

  return NextResponse.json({
    emailVerified: !!advisor?.emailVerified,
    hasClient: clientCount > 0,
    hasTiers: tierCount > 0,
    hasReferral: referralCount > 0,
    hasScheduling: !!settings?.schedulingUrl,
  });
}
