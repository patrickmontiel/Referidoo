import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [advisor, clients, tiers] = await Promise.all([
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { name: true, companyName: true },
    }),
    db.client.findMany({
      where: { advisorId: session.advisorId },
      include: {
        _count: { select: { referrals: { where: { deletedAt: null } } } },
        referrals: {
          where: { deletedAt: null },
          select: { rewardAmount: true, rewardStatus: true, status: true, tierPosition: true, productType: true, interestProductType: true, rewardApprovedAt: true },
        },
        bubbleClaims: { select: { amount: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.rewardTier.findMany({
      where: { advisorId: session.advisorId },
      orderBy: { position: "asc" },
    }),
  ]);

  return NextResponse.json({ advisor, clients, tiers });
}
