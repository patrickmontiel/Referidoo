import { db } from "@/lib/db";
import { calculateRewardForNextReferral } from "@/lib/rewards";

// Datos públicos que ve el referido en /r/[code]. Compartido entre la página
// (Server Component, render instantáneo sin spinner) y /api/referral-info.
export type ReferralInfo = {
  referrerName: string;
  advisorName: string;
  advisorPhone: string | null;
  companyName: string | null;
  welcomeMessage: string | null;
  schedulingUrl: string | null;
  credential: string | null;
  yearsExperience: number | null;
  peopleServed: number | null;
  nextReward: number;
};

export async function getReferralInfo(code: string): Promise<ReferralInfo | null> {
  const include = {
    advisor: { include: { settings: true } },
    referrals: { where: { status: { not: "rejected" as const } } },
  };

  // Los códigos se generan en minúsculas (ver generateReferralCode) — normalizar
  // antes del lookup indexado evita un full-table-scan cuando el código llega con
  // otro casing (típico: WhatsApp auto-capitaliza).
  const normalized = code.trim().toLowerCase();
  let client = await db.client.findUnique({ where: { referralCode: normalized }, include });
  if (!client && normalized !== code) {
    client = await db.client.findUnique({ where: { referralCode: code }, include });
  }

  if (!client || !client.active) return null;

  const completedCount = client.referrals.length;
  const { amount } = await calculateRewardForNextReferral(client.advisorId, completedCount);

  return {
    referrerName: client.name,
    advisorName: client.advisor.name,
    advisorPhone: client.advisor.phone ?? null,
    companyName: client.advisor.companyName,
    welcomeMessage: client.advisor.settings?.welcomeMessage ?? null,
    schedulingUrl: client.advisor.settings?.schedulingUrl ?? null,
    credential: client.advisor.settings?.credential ?? null,
    yearsExperience: client.advisor.settings?.yearsExperience ?? null,
    peopleServed: client.advisor.settings?.peopleServed ?? null,
    nextReward: amount,
  };
}
