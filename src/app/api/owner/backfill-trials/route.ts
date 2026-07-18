import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

const TRIAL_MS = 30 * 24 * 60 * 60 * 1000;

// Backfill único: a los asesores que quedaron en "paid" a mano (sin
// suscripción de Mercado Pago y sin fecha de corte) se les fija un trial de
// 30 días DESDE HOY. Runway limpio: nadie se bloquea de un día para otro
// (no rompe demos activas), y al vencer el cron los baja a freemium.
// Idempotente: una vez con fecha, ya no entran al WHERE.
export async function POST() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const affected = await db.advisor.findMany({
    where: { plan: "paid", mpPreapprovalId: null, paidUntil: null },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const newPaidUntil = new Date(Date.now() + TRIAL_MS);
  const result = await db.advisor.updateMany({
    where: { plan: "paid", mpPreapprovalId: null, paidUntil: null },
    data: { paidUntil: newPaidUntil },
  });

  return NextResponse.json({
    ok: true,
    updated: result.count,
    trialEndsAt: newPaidUntil.toISOString(),
    advisors: affected.map((a) => ({ name: a.name, email: a.email })),
  });
}
