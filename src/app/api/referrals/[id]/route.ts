import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendReferralApprovedNotification, sendPaymentSentNotification } from "@/lib/email";

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

  const updated = await db.referral.update({
    where: { id },
    data: {
      status: newStatus,
      rewardStatus: newRewardStatus,
      leadNotes: body.leadNotes ?? referral.leadNotes,
      saleAmount: saleAmount ?? undefined,
      ...(isPaid ? { rewardPaidAt: new Date(), paymentNote: body.paymentNote ?? null } : {}),
    },
  });

  // 1. Notify creator when advisor marks referral as converted (deal closed)
  if (newStatus === "converted" && referral.status !== "converted") {
    sendReferralApprovedNotification({
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      referrerName: r.referrer.name,
      leadName: referral.leadName,
      leadPhone: referral.leadPhone,
      leadEmail: referral.leadEmail,
      rewardAmount: referral.rewardAmount,
      tierPosition: referral.tierPosition,
      saleAmount: saleAmount ?? null,
    }).catch((err) => console.error("[email] Error enviando conversión:", err));
  }

  // 2. Notify referrer (Ana) and creator when payment is sent
  if (isPaid) {
    const client = await db.client.findUnique({ where: { id: referral.referrerId }, select: { accessToken: true, email: true, name: true } });
    const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/c/${client?.accessToken ?? ""}`;
    sendPaymentSentNotification({
      referrerName: r.referrer.name,
      referrerEmail: client?.email ?? "",
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      leadName: referral.leadName,
      rewardAmount: referral.rewardAmount,
      tierPosition: referral.tierPosition,
      portalUrl,
      paymentNote: body.paymentNote ?? null,
    }).catch((err) => console.error("[email] Error enviando pago:", err));
  }

  return NextResponse.json(updated);
}
