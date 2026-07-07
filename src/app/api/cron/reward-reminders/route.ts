import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendRewardOverdueEmail } from "@/lib/email";

// Política de premios (whitepaper cap. 11): un premio prometido y no pagado
// rompe la promesa que sostiene todo el ciclo — y la marca vive en el portal.
// Tiempos: día 7 → recordatorio amable; día 14 → aviso firme + morosidad
// (visible en /owner: detector + chip en el ranking).
// Cron diario; ventanas [7,8) y [14,15) días para enviar exactamente una vez
// cada aviso sin guardar estado extra.
const DAY_MS = 24 * 60 * 60 * 1000;

function windowFor(since: Date, now: Date): "recordatorio" | "firme" | null {
  const days = Math.floor((now.getTime() - since.getTime()) / DAY_MS);
  if (days === 7) return "recordatorio";
  if (days === 14) return "firme";
  return null;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;

  // Escalera: premio aprobado (conversión hecha) sin marcar pagado.
  // Ancla: updatedAt del referral (≈ momento de aprobación).
  const escalera = await db.referral.findMany({
    where: {
      status: "converted",
      rewardStatus: "approved",
      tierPosition: { gt: 0 },
      advisor: { deletedAt: null },
    },
    select: {
      rewardAmount: true,
      updatedAt: true,
      advisor: { select: { name: true, email: true } },
      referrer: { select: { name: true } },
    },
  });
  for (const r of escalera) {
    const level = windowFor(r.updatedAt, now);
    if (!level) continue;
    await sendRewardOverdueEmail({
      advisorName: r.advisor.name,
      advisorEmail: r.advisor.email,
      referrerName: r.referrer.name,
      amount: r.rewardAmount,
      kind: "escalera",
      level,
      daysOverdue: Math.floor((now.getTime() - r.updatedAt.getTime()) / DAY_MS),
    });
    sent++;
  }

  // Burbuja: reclamo pendiente de pago. Ancla: createdAt del claim.
  const claims = await db.bubbleClaim.findMany({
    where: { status: "pending", client: { advisor: { deletedAt: null } } },
    select: {
      amount: true,
      createdAt: true,
      client: { select: { name: true, advisor: { select: { name: true, email: true } } } },
    },
  });
  for (const c of claims) {
    const level = windowFor(c.createdAt, now);
    if (!level) continue;
    await sendRewardOverdueEmail({
      advisorName: c.client.advisor.name,
      advisorEmail: c.client.advisor.email,
      referrerName: c.client.name,
      amount: c.amount,
      kind: "burbuja",
      level,
      daysOverdue: Math.floor((now.getTime() - c.createdAt.getTime()) / DAY_MS),
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, escalera: escalera.length, claims: claims.length });
}
