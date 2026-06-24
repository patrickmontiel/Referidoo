import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";

// Fecha desde la que se persiste lessioCommission — referidos convertidos
// antes de esta fecha quedan con el campo en null (backfill diferido, ver
// TODOS.md). El total de comisión de este endpoint es "desde esta fecha",
// nunca un histórico completo — por eso el caveat se manda también al cliente.
export const LESSIO_COMMISSION_SINCE = "2026-06-24";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [paidAdvisorsCount, commissionAgg] = await Promise.all([
    db.advisor.count({ where: { plan: "paid" } }),
    db.referral.aggregate({
      _sum: { lessioCommission: true },
      where: { lessioCommission: { not: null } },
    }),
  ]);

  return NextResponse.json({
    mrr: paidAdvisorsCount * MONTHLY_PRICE_MXN,
    paidAdvisorsCount,
    lessioCommissionTotal: commissionAgg._sum.lessioCommission ?? 0,
    lessioCommissionSince: LESSIO_COMMISSION_SINCE,
  });
}
