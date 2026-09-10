import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import AdminOverviewClient from "./AdminOverviewClient";
import { RecoveryCard } from "./RecoveryCard";
import { deriveAdvisorState, shouldShowRecovery, computeSetupProgress, suggestedFirstActivationSize } from "@/lib/advisor-state";

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

  // ── ESTADO DEL ASESOR (derivado, no persistido) ──
  // Un asesor con cartera y sin activaciones entra a RECOVERY, no al
  // onboarding de cuenta nueva. Ver src/lib/advisor-state.ts.
  const [activationCount, settings, tierCount, contactableCount] = await Promise.all([
    db.referralCampaign.count({ where: { advisorId: session.advisorId } }),
    db.advisorSettings.findUnique({
      where: { advisorId: session.advisorId },
      select: { products: true, defaultChannel: true },
    }),
    db.rewardTier.count({ where: { advisorId: session.advisorId } }),
    db.client.count({
      where: { advisorId: session.advisorId, active: true, OR: [{ phone: { not: null } }, { email: { not: null } }] },
    }),
  ]);

  const advisorState = deriveAdvisorState({
    clientCount,
    activationCount,
    referralCount: referrals.length,
  });
  const showRecovery = shouldShowRecovery(advisorState);
  const setupProgress = computeSetupProgress({
    clientCount,
    hasProducts: !!settings?.products,
    hasTiers: tierCount > 0,
    hasChannel: !!settings?.defaultChannel,
    activationCount,
  });

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
    <>
      {showRecovery && (
        <RecoveryCard
          clientCount={clientCount}
          contactableCount={contactableCount}
          progress={setupProgress}
          needsProfile={!settings?.products || !settings?.defaultChannel}
          suggestedSize={suggestedFirstActivationSize(clientCount)}
        />
      )}
      <AdminOverviewClient
      advisor={{ ...advisor, monthlyPriceMxn: MONTHLY_PRICE_MXN, onboardedAt: advisor.onboardedAt?.toISOString() ?? null }}
      referrals={serializedReferrals}
      clientCount={clientCount}
      hideSetupChecklist={showRecovery}
    />
    </>
  );
}
