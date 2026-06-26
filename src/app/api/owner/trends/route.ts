import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { LESSIO_COMMISSION_SINCE } from "@/app/api/owner/summary/route";

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Serie de tiempo desde PlanEvent (asesores activos/MRR) + comisión por fecha
// de conversión. PlanEvent solo existe desde que se construyó este feature —
// no hay backfill del pasado, la serie empieza vacía y se llena hacia adelante.
export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [planEvents, convertedReferrals] = await Promise.all([
    db.planEvent.findMany({ orderBy: { createdAt: "asc" } }),
    db.referral.findMany({
      where: { status: "converted", lessioCommission: { not: null } },
      select: { updatedAt: true, lessioCommission: true },
    }),
  ]);

  if (planEvents.length === 0) {
    return NextResponse.json({ points: [], hasData: false });
  }

  const commissionByDay = new Map<string, number>();
  for (const r of convertedReferrals) {
    const key = dayKey(r.updatedAt);
    commissionByDay.set(key, (commissionByDay.get(key) ?? 0) + (r.lessioCommission ?? 0));
  }

  // Conteo acumulado de asesores activos día por día a partir de los eventos.
  let activeAdvisors = 0;
  const activeAdvisorsByDay = new Map<string, number>();
  for (const event of planEvents) {
    if (event.event === "activated") activeAdvisors += 1;
    if (event.event === "cancelled") activeAdvisors = Math.max(0, activeAdvisors - 1);
    activeAdvisorsByDay.set(dayKey(event.createdAt), activeAdvisors);
  }

  const firstDay = dayKey(planEvents[0].createdAt);
  const today = dayKey(new Date());
  const days: string[] = [];
  for (let d = new Date(firstDay); dayKey(d) <= today; d.setDate(d.getDate() + 1)) {
    days.push(dayKey(d));
  }

  let lastKnownActive = 0;
  const points = days.map((day) => {
    if (activeAdvisorsByDay.has(day)) lastKnownActive = activeAdvisorsByDay.get(day)!;
    return {
      date: day,
      activeAdvisors: lastKnownActive,
      mrr: lastKnownActive * MONTHLY_PRICE_MXN,
      commission: commissionByDay.get(day) ?? 0,
    };
  });

  return NextResponse.json({ points, hasData: true, lessioCommissionSince: LESSIO_COMMISSION_SINCE });
}
