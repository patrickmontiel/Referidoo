import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendReferralApprovedNotification, sendPaymentSentNotification, type PaymentPayload } from "@/lib/email";
import { getAdvisorTiers, calculateLessioCommission, BUBBLE_POINTS_BY_PRODUCT } from "@/lib/rewards";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const referral = await db.referral.findUnique({
    where: { id },
    include: {
      referrer: { select: { name: true } },
      advisor: { select: { name: true, email: true } },
    },
  });
  if (!referral || referral.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const newStatus = body.status ?? referral.status;
  const newRewardStatus = body.rewardStatus ?? referral.rewardStatus;
  const r = referral as typeof referral & { saleAmount?: number | null; referrer: { name: string; email?: string | null } };
  const saleAmount = body.saleAmount != null ? Number(body.saleAmount) : r.saleAmount;
  const isPaid = newRewardStatus === "paid" && referral.rewardStatus !== "paid";
  const isConverting = newStatus === "converted" && referral.status !== "converted";
  const productTypeForConversion: string | null = body.productType !== undefined ? body.productType : referral.productType ?? null;

  // Check launch bonus at conversion (3+ referrals in first 7 days → bonus on first prize only)
  let finalRewardAmount = referral.rewardAmount;
  let launchBonusApplied = false;
  if (isConverting && referral.tierPosition === 1) {
    const refClient = await db.client.findUnique({
      where: { id: referral.referrerId },
      select: { createdAt: true, launchBonusUsed: true },
    });
    if (refClient && !refClient.launchBonusUsed) {
      const windowEnd = new Date(refClient.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      if (new Date() <= windowEnd) {
        const countInWindow = await db.referral.count({
          where: { referrerId: referral.referrerId, createdAt: { lte: windowEnd } },
        });
        if (countInWindow >= 3) {
          finalRewardAmount = referral.rewardAmount + 1000;
          launchBonusApplied = true;
        }
      }
    }
  }

  const updated = await db.referral.update({
    where: { id },
    data: {
      status: newStatus,
      rewardStatus: newRewardStatus,
      leadNotes: body.leadNotes ?? referral.leadNotes,
      saleAmount: saleAmount ?? undefined,
      ...(body.productType !== undefined ? { productType: body.productType } : {}),
      ...(finalRewardAmount !== referral.rewardAmount ? { rewardAmount: finalRewardAmount } : {}),
      ...(isPaid ? { rewardPaidAt: new Date(), paymentNote: body.paymentNote ?? null } : {}),
    },
  });

  if (launchBonusApplied) {
    await db.client.update({ where: { id: referral.referrerId }, data: { launchBonusUsed: true } });
  }

  // 1. Notify creator when advisor marks referral as converted (deal closed)
  if (isConverting) {
    const lessioCommission = calculateLessioCommission(productTypeForConversion, saleAmount);

    sendReferralApprovedNotification({
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      referrerName: r.referrer.name,
      leadName: referral.leadName,
      leadPhone: referral.leadPhone,
      leadEmail: referral.leadEmail,
      rewardAmount: finalRewardAmount,
      tierPosition: referral.tierPosition,
      saleAmount: saleAmount ?? null,
      launchBonusApplied,
      productType: productTypeForConversion,
      lessioCommission,
    }).catch((err) => console.error("[email] Error enviando conversión:", err));

    // Premios burbuja: Auto y GMM acumulan a un mismo fondo reclamable
    const bubblePoints = productTypeForConversion ? BUBBLE_POINTS_BY_PRODUCT[productTypeForConversion] : undefined;
    if (bubblePoints) {
      await db.client.update({
        where: { id: referral.referrerId },
        data: { bubblePoints: { increment: bubblePoints } },
      });
    }
  }

  // 2. Notify referrer (Ana) and creator when payment is sent
  if (isPaid) {
    const [client, tiers, settings] = await Promise.all([
      db.client.findUnique({ where: { id: referral.referrerId }, select: { accessToken: true, email: true, name: true } }),
      getAdvisorTiers(referral.advisorId),
      db.advisorSettings.findUnique({ where: { advisorId: referral.advisorId } }),
    ]);
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const portalUrl = `${base}/c/${client?.accessToken ?? ""}`;

    // Calculate next tier for incentive copy
    const nextPos = referral.tierPosition + 1;
    const afterLastTier = settings?.afterLastTier ?? "cycle";
    let nextTierAmount: number | null = null;
    let nextTierPosition: number | null = null;
    if (tiers.length > 0 && afterLastTier !== "stop") {
      const exact = tiers.find((t) => t.position === nextPos);
      if (exact) {
        nextTierAmount = exact.amount;
        nextTierPosition = nextPos;
      } else if (afterLastTier === "cycle") {
        const cyclePos = ((nextPos - 1) % tiers.length) + 1;
        const cycleTier = tiers.find((t) => t.position === cyclePos);
        nextTierAmount = cycleTier?.amount ?? tiers[0].amount;
        nextTierPosition = nextPos;
      } else if (afterLastTier === "flat") {
        nextTierAmount = settings?.flatAmount ?? 1500;
        nextTierPosition = nextPos;
      }
    }

    const emailPayload: PaymentPayload = {
      referrerName: r.referrer.name,
      referrerEmail: client?.email ?? "",
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      leadName: referral.leadName,
      rewardAmount: referral.rewardAmount,
      tierPosition: referral.tierPosition,
      portalUrl,
      paymentNote: body.paymentNote ?? null,
      nextTierPosition,
      nextTierAmount,
    };

    // Schedule with 5-min delay via QStash if configured, otherwise send immediately
    const qstashToken = process.env.QSTASH_TOKEN;
    if (qstashToken && client?.email) {
      const webhookUrl = `${base}/api/webhooks/send-confirmation`;
      fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(webhookUrl)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${qstashToken}`,
          "Upstash-Delay": "300s",
          "Upstash-Forward-X-Webhook-Secret": process.env.CRON_SECRET ?? "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      }).catch((err) => console.error("[qstash] Error agendando email:", err));
    } else {
      sendPaymentSentNotification(emailPayload).catch((err) => console.error("[email] Error enviando pago:", err));
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const referral = await db.referral.findUnique({ where: { id } });
  if (!referral || referral.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.referral.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
