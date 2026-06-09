import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateRewardForNextReferral } from "@/lib/rewards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const client = await db.client.findUnique({
    where: { referralCode: code },
    include: {
      advisor: { include: { settings: true } },
      referrals: { where: { status: { not: "rejected" } } },
    },
  });

  if (!client || !client.active) {
    return NextResponse.json({ error: "Código no válido" }, { status: 404 });
  }

  const completedCount = client.referrals.length;
  const { amount } = await calculateRewardForNextReferral(client.advisorId, completedCount);

  return NextResponse.json({
    referrerName: client.name,
    advisorName: client.advisor.name,
    companyName: client.advisor.companyName,
    welcomeMessage: client.advisor.settings?.welcomeMessage,
    nextReward: amount,
  });
}
