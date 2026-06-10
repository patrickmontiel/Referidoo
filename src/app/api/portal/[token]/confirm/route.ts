import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendReferrerConfirmedNotification } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { referralId } = await req.json();

  // Verify the client owns this token
  const client = await db.client.findUnique({
    where: { accessToken: token },
    select: { id: true, name: true },
  });
  if (!client) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  // Verify the referral belongs to this client and was paid
  const referral = await db.referral.findFirst({
    where: { id: referralId, referrerId: client.id, rewardStatus: "paid" },
    include: {
      advisor: { select: { name: true } },
    },
  });
  if (!referral) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if ((referral as typeof referral & { confirmedByReferrer?: boolean }).confirmedByReferrer) {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }

  await db.referral.update({
    where: { id: referralId },
    data: { confirmedByReferrer: true, referrerConfirmedAt: new Date() },
  });

  sendReferrerConfirmedNotification({
    referrerName: client.name,
    advisorName: referral.advisor.name,
    leadName: referral.leadName,
    rewardAmount: referral.rewardAmount,
    saleAmount: (referral as typeof referral & { saleAmount?: number | null }).saleAmount,
  }).catch(console.error);

  return NextResponse.json({ ok: true });
}
