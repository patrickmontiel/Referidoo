import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { calculateRewardForNextReferral } from "@/lib/rewards";
import { sendNewReferralNotification, sendFreemiumLimitEmail } from "@/lib/email";
import { FREEMIUM_LEAD_LIMIT } from "@/lib/plan";
import { normalizePhone } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const referrals = await db.referral.findMany({
    where: {
      advisorId: session.advisorId,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    include: {
      referrer: { select: { id: true, name: true, referralCode: true, createdAt: true, launchBonusUsed: true, bubblePoints: true, clabe: true, clabeBank: true, clabeHolder: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(referrals);
}

// Public — no advisor auth needed. Called when a referred friend submits the form.
export async function POST(req: NextRequest) {
  const { referralCode, leadName, leadPhone, leadEmail, leadNotes, interestProductType, preferredDays, preferredHours } = await req.json();

  if (!referralCode || !leadName || !leadPhone) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const include = {
    referrals: { where: { status: { not: "rejected" as const } } },
    advisor: { select: { name: true, email: true, plan: true } },
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

  // Validar número duplicado: mismo teléfono ya registrado (no rechazado, no
  // borrado) para el mismo asesor. Evita registrar dos veces al mismo lead.
  const normPhone = normalizePhone(leadPhone);
  if (normPhone) {
    const advisorLeads = await db.referral.findMany({
      where: { advisorId: referrer.advisorId, status: { not: "rejected" }, deletedAt: null },
      select: { leadPhone: true },
    });
    if (advisorLeads.some((l) => normalizePhone(l.leadPhone) === normPhone)) {
      return NextResponse.json(
        { error: "Este número ya está registrado como referido." },
        { status: 409 }
      );
    }
  }

  const completedCount = referrer.referrals.length;
  const [{ amount, tierPosition }, advisorLeadCount] = await Promise.all([
    calculateRewardForNextReferral(referrer.advisorId, completedCount),
    db.referral.count({
      where: { advisorId: referrer.advisorId, status: { not: "rejected" } },
    }),
  ]);

  const referral = await db.referral.create({
    data: {
      advisorId: referrer.advisorId,
      referrerId: referrer.id,
      leadName,
      leadPhone,
      leadEmail: leadEmail || null,
      leadNotes: leadNotes || null,
      interestProductType: interestProductType || null,
      preferredDays: preferredDays || null,
      preferredHours: preferredHours || null,
      tierPosition,
      rewardAmount: amount,
    },
  });

  const isFreemiumOverLimit =
    referrer.advisor.plan === "freemium" && advisorLeadCount >= FREEMIUM_LEAD_LIMIT;

  // Fire-and-forget — don't block the response on email delivery
  if (isFreemiumOverLimit) {
    // Asesor ya topó su límite: le mandamos email de upgrade en vez del lead
    // Patrick sigue recibiendo la notificación completa del lead
    sendFreemiumLimitEmail({
      advisorName: referrer.advisor.name,
      advisorEmail: referrer.advisor.email,
      referrerName: referrer.name,
      leadName,
      totalLeads: advisorLeadCount + 1,
    }).catch((err) => console.error("[email] Error enviando email de límite freemium:", err));
    sendNewReferralNotification({
      advisorName: referrer.advisor.name,
      advisorEmail: referrer.advisor.email,
      referrerName: referrer.name,
      leadName,
      leadPhone,
      leadEmail,
      rewardAmount: amount,
      tierPosition,
    }, { skipAdvisor: true }).catch((err) => console.error("[email] Error enviando notificación al creador:", err));
  } else {
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
  }

  return NextResponse.json(referral, { status: 201 });
}
