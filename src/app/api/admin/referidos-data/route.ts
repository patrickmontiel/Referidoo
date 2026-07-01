import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { DEFAULT_BUBBLE_AUTO_POINTS, DEFAULT_BUBBLE_GMM_POINTS } from "@/lib/rewards";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [referrals, advisor, settings] = await Promise.all([
    db.referral.findMany({
      where: { advisorId: session.advisorId },
      include: {
        referrer: { select: { id: true, name: true, referralCode: true, createdAt: true, launchBonusUsed: true, bubblePoints: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { plan: true },
    }),
    db.advisorSettings.findUnique({ where: { advisorId: session.advisorId } }),
  ]);

  return NextResponse.json({
    referrals,
    plan: advisor?.plan ?? "freemium",
    bubbleAutoPoints: settings?.bubbleAutoPoints ?? DEFAULT_BUBBLE_AUTO_POINTS,
    bubbleGmmPoints: settings?.bubbleGmmPoints ?? DEFAULT_BUBBLE_GMM_POINTS,
  });
}
