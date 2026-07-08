import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import AdminOverviewClient from "./AdminOverviewClient";

export default async function AdminOverviewPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const [advisor, referrals, clientCount] = await Promise.all([
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { id: true, name: true, companyName: true, plan: true, onboardedAt: true },
    }),
    db.referral.findMany({
      where: { advisorId: session.advisorId, deletedAt: null },
      include: {
        referrer: { select: { id: true, name: true, referralCode: true, createdAt: true, launchBonusUsed: true, bubblePoints: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.client.count({ where: { advisorId: session.advisorId, active: true } }),
  ]);

  if (!advisor) redirect("/login");

  const serializedReferrals = referrals.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    referrer: {
      ...r.referrer,
      createdAt: r.referrer.createdAt.toISOString(),
    },
  }));

  return (
    <AdminOverviewClient
      advisor={{ ...advisor, monthlyPriceMxn: MONTHLY_PRICE_MXN, onboardedAt: advisor.onboardedAt?.toISOString() ?? null }}
      referrals={serializedReferrals}
      clientCount={clientCount}
    />
  );
}
