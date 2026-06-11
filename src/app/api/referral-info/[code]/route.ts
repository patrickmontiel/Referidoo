import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateRewardForNextReferral } from "@/lib/rewards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const include = {
    advisor: { include: { settings: true } },
    referrals: { where: { status: { not: "rejected" as const } } },
  };

  let client = await db.client.findUnique({ where: { referralCode: code }, include });

  // Fallback: codes shared via WhatsApp/SMS can get auto-capitalized by phones
  if (!client) {
    const normalized = code.trim().toLowerCase();
    const all = await db.client.findMany({ include });
    client = all.find((c) => c.referralCode.toLowerCase() === normalized) ?? null;
  }

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
