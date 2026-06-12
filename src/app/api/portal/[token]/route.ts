import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getAdvisorTiers,
  DEFAULT_BUBBLE_AUTO_POINTS,
  DEFAULT_BUBBLE_GMM_POINTS,
  DEFAULT_BUBBLE_CLAIM_THRESHOLD,
} from "@/lib/rewards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const client = await db.client.findUnique({
    where: { accessToken: token },
    include: {
      advisor: {
        include: { settings: true },
      },
      referrals: {
        orderBy: { createdAt: "desc" },
      },
      bubbleClaims: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!client || !client.active) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const tiers = await getAdvisorTiers(client.advisorId);
  const settings = client.advisor.settings;

  const totalEarned = client.referrals
    .filter((r) => r.rewardStatus === "paid")
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const pendingEarnings = client.referrals
    .filter((r) => r.rewardStatus === "approved")
    .reduce((sum, r) => sum + r.rewardAmount, 0);

  const convertedCount = client.referrals.filter((r) => r.status === "converted").length;

  return NextResponse.json({
    client: {
      id: client.id,
      name: client.name,
      email: client.email,
      referralCode: client.referralCode,
      createdAt: client.createdAt,
      launchBonusUsed: (client as typeof client & { launchBonusUsed?: boolean }).launchBonusUsed ?? false,
      bubblePoints: client.bubblePoints,
    },
    bubbleClaims: client.bubbleClaims,
    advisor: {
      name: client.advisor.name,
      phone: client.advisor.phone,
      companyName: client.advisor.companyName,
      welcomeMessage: settings?.welcomeMessage,
      whatsappMessage: settings?.whatsappMessage,
    },
    tiers,
    settings: {
      afterLastTier: settings?.afterLastTier ?? "cycle",
      flatAmount: settings?.flatAmount ?? 1500,
      bubbleAutoPoints: settings?.bubbleAutoPoints ?? DEFAULT_BUBBLE_AUTO_POINTS,
      bubbleGmmPoints: settings?.bubbleGmmPoints ?? DEFAULT_BUBBLE_GMM_POINTS,
      bubbleClaimThreshold: settings?.bubbleClaimThreshold ?? DEFAULT_BUBBLE_CLAIM_THRESHOLD,
    },
    referrals: client.referrals,
    stats: {
      totalReferrals: client.referrals.length,
      convertedCount,
      totalEarned,
      pendingEarnings,
    },
  });
}
