import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { id: true, name: true, email: true, phone: true, companyName: true, createdAt: true, emailVerified: true, plan: true, paidUntil: true },
  });

  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  // Desglose de la comisión de Referidoo (no la recompensa que el asesor le
  // paga a sus referidores) que ya se acumuló y se sumará al próximo cobro
  // de la mensualidad — para que el asesor vea exactamente qué se le cobra.
  const pendingCommissions = await db.referral.findMany({
    where: { advisorId: advisor.id, billedAt: null, lessioCommission: { not: null } },
    select: { id: true, leadName: true, productType: true, saleAmount: true, lessioCommission: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const pendingCommissionTotal = pendingCommissions.reduce((sum, r) => sum + (r.lessioCommission ?? 0), 0);

  return NextResponse.json({ ...advisor, monthlyPriceMxn: MONTHLY_PRICE_MXN, pendingCommissionTotal, pendingCommissions });
}
