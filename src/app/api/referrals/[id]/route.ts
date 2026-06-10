import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendReferralApprovedNotification } from "@/lib/email";

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
  const saleAmount = body.saleAmount != null ? Number(body.saleAmount) : (referral as typeof referral & { saleAmount?: number | null }).saleAmount;

  const updated = await db.referral.update({
    where: { id },
    data: {
      status: newStatus,
      rewardStatus: body.rewardStatus ?? referral.rewardStatus,
      leadNotes: body.leadNotes ?? referral.leadNotes,
      saleAmount: saleAmount ?? undefined,
    },
  });

  // Notify creator when advisor marks referral as converted (deal closed)
  if (newStatus === "converted" && referral.status !== "converted") {
    sendReferralApprovedNotification({
      advisorName: referral.advisor.name,
      advisorEmail: referral.advisor.email,
      referrerName: referral.referrer.name,
      leadName: referral.leadName,
      leadPhone: referral.leadPhone,
      leadEmail: referral.leadEmail,
      rewardAmount: referral.rewardAmount,
      tierPosition: referral.tierPosition,
      saleAmount: saleAmount ?? null,
    }).catch((err) => console.error("[email] Error enviando conversión:", err));
  }

  return NextResponse.json(updated);
}
