import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendConfirmationRequest } from "@/lib/email";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Find referrals paid 10+ minutes ago, not yet confirmed, client has email
  const referrals = await db.referral.findMany({
    where: {
      rewardStatus: "paid",
      confirmedByReferrer: false,
      rewardPaidAt: { lte: tenMinutesAgo },
    },
    include: {
      referrer: { select: { name: true, email: true, accessToken: true } },
      advisor: { select: { name: true, email: true } },
    },
  });

  let sent = 0;
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  for (const r of referrals) {
    const ref = r.referrer as typeof r.referrer & { email?: string | null; accessToken: string };
    if (!ref.email) continue;

    await sendConfirmationRequest({
      referrerName: ref.name,
      referrerEmail: ref.email,
      advisorName: r.advisor.name,
      advisorEmail: r.advisor.email,
      leadName: r.leadName,
      rewardAmount: r.rewardAmount,
      tierPosition: r.tierPosition,
      portalUrl: `${base}/c/${ref.accessToken}`,
      paymentNote: (r as typeof r & { paymentNote?: string | null }).paymentNote,
    }).catch(console.error);

    sent++;
  }

  return NextResponse.json({ processed: referrals.length, sent });
}
