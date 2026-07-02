import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [advisor, referrals, clientCount] = await Promise.all([
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { id: true, name: true, companyName: true, plan: true, onboardedAt: true },
    }),
    db.referral.findMany({
      where: { advisorId: session.advisorId },
      include: {
        referrer: { select: { id: true, name: true, referralCode: true, createdAt: true, launchBonusUsed: true, bubblePoints: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.count({ where: { advisorId: session.advisorId, active: true } }),
  ]);

  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  return NextResponse.json({ advisor: { ...advisor, monthlyPriceMxn: MONTHLY_PRICE_MXN }, referrals, clientCount });
}
