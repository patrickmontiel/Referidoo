import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { calculateRewardForNextReferral } from "@/lib/rewards";
import { sendNewReferralNotification } from "@/lib/email";

export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const referrals = await db.referral.findMany({
    where: {
      advisorId: session.advisorId,
      ...(status ? { status } : {}),
    },
    include: {
      referrer: { select: { id: true, name: true, referralCode: true, createdAt: true, launchBonusUsed: true, bubblePoints: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(referrals);
}

// Public — no advisor auth needed. Called when a referred friend submits the form.
export async function POST(req: NextRequest) {
  const { referralCode, leadName, leadPhone, leadEmail, leadNotes } = await req.json();

  if (!referralCode || !leadName || !leadPhone) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const include = {
    referrals: { where: { status: { not: "rejected" as const } } },
    advisor: { select: { name: true, email: true } },
  };

  // Los códigos siempre se generan en minúsculas (ver generateReferralCode en
  // lib/utils.ts) — normalizar antes del lookup indexado evita un full-table-scan
  // cuando el código llega con otro casing (típico: WhatsApp auto-capitaliza).
  const normalizedCode = String(referralCode).trim().toLowerCase();
  let referrer = await db.client.findUnique({ where: { referralCode: normalizedCode }, include });

  if (!referrer && normalizedCode !== referralCode) {
    referrer = await db.client.findUnique({ where: { referralCode }, include });
  }

  if (!referrer || !referrer.active) {
    return NextResponse.json({ error: "Código no válido" }, { status: 404 });
  }

  const completedCount = referrer.referrals.length;
  const { amount, tierPosition } = await calculateRewardForNextReferral(
    referrer.advisorId,
    completedCount
  );

  const referral = await db.referral.create({
    data: {
      advisorId: referrer.advisorId,
      referrerId: referrer.id,
      leadName,
      leadPhone,
      leadEmail: leadEmail || null,
      leadNotes: leadNotes || null,
      tierPosition,
      rewardAmount: amount,
    },
  });

  // Fire-and-forget — don't block the response on email delivery
  sendNewReferralNotification({
    advisorName: referrer.advisor.name,
    advisorEmail: referrer.advisor.email,
    referrerName: referrer.name,
    leadName,
    leadPhone,
    leadEmail,
    rewardAmount: amount,
    tierPosition,
  }).catch((err) => console.error("[email] Error enviando notificación:", err));

  return NextResponse.json(referral, { status: 201 });
}
