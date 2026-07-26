import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { calculateRewardForNextReferral } from "@/lib/rewards";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const include = {
    advisor: { include: { settings: true } },
    referrals: { where: { status: { not: "rejected" as const } } },
  };

  // Los códigos siempre se generan en minúsculas (ver generateReferralCode en
  // lib/utils.ts) — normalizar antes del lookup indexado evita un full-table-scan
  // cuando el código llega con otro casing (típico: WhatsApp auto-capitaliza).
  const normalized = code.trim().toLowerCase();
  let client = await db.client.findUnique({ where: { referralCode: normalized }, include });

  if (!client && normalized !== code) {
    client = await db.client.findUnique({ where: { referralCode: code }, include });
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
    schedulingUrl: client.advisor.settings?.schedulingUrl ?? null,
    credential: client.advisor.settings?.credential ?? null,
    yearsExperience: client.advisor.settings?.yearsExperience ?? null,
    peopleServed: client.advisor.settings?.peopleServed ?? null,
    nextReward: amount,
  });
}
