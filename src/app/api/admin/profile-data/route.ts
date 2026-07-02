import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [advisor, pendingCommissions, clientCount, leadCount] = await Promise.all([
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { id: true, name: true, email: true, phone: true, companyName: true, createdAt: true, emailVerified: true, plan: true, paidUntil: true, onboardedAt: true },
    }),
    db.referral.findMany({
      where: { advisorId: session.advisorId, billedAt: null, lessioCommission: { not: null } },
      select: { id: true, leadName: true, productType: true, saleAmount: true, lessioCommission: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.client.count({ where: { advisorId: session.advisorId, active: true } }),
    db.referral.count({ where: { advisorId: session.advisorId } }),
  ]);

  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const pendingCommissionTotal = pendingCommissions.reduce((sum, r) => sum + (r.lessioCommission ?? 0), 0);

  return NextResponse.json({ ...advisor, monthlyPriceMxn: MONTHLY_PRICE_MXN, pendingCommissionTotal, pendingCommissions, clientCount, leadCount });
}
