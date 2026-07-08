import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import PerfilClient from "./PerfilClient";

const COMMISSION_RATES: Record<string, { freemium: number; paid: number }> = {
  PPR:          { freemium: 0.0025, paid: 0.0015 },
  Vida:         { freemium: 0.0025, paid: 0.0015 },
  "Daños/Auto": { freemium: 0.015,  paid: 0.008  },
  GMM:          { freemium: 0.015,  paid: 0.008  },
  Otro:         { freemium: 0.015,  paid: 0.008  },
};
const MEMBERSHIP_COST = 539;

export default async function PerfilPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const [advisor, pendingCommissions, clientCount, leadCount, allConverted] = await Promise.all([
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { id: true, name: true, email: true, phone: true, companyName: true, createdAt: true, emailVerified: true, plan: true, paidUntil: true, onboardedAt: true },
    }),
    db.referral.findMany({
      where: { advisorId: session.advisorId, billedAt: null, lessioCommission: { not: null } },
      select: { id: true, leadName: true, productType: true, saleAmount: true, lessioCommission: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.client.count({ where: { advisorId: session.advisorId, active: true } }),
    db.referral.count({ where: { advisorId: session.advisorId, deletedAt: null } }),
    db.referral.findMany({
      where: {
        advisorId: session.advisorId,
        deletedAt: null,
        status: "converted",
        saleAmount: { not: null },
      },
      select: { saleAmount: true, productType: true },
    }),
  ]);

  if (!advisor) redirect("/login");

  const pendingCommissionTotal = pendingCommissions.reduce((sum, r) => sum + (r.lessioCommission ?? 0), 0);

  const freemiumCommission = allConverted.reduce((sum, r) => {
    const rate = COMMISSION_RATES[r.productType ?? "Otro"];
    return sum + (rate ? Math.round(r.saleAmount! * rate.freemium) : 0);
  }, 0);
  const proCommission = allConverted.reduce((sum, r) => {
    const rate = COMMISSION_RATES[r.productType ?? "Otro"];
    return sum + (rate ? Math.round(r.saleAmount! * rate.paid) : 0);
  }, 0);
  const commissionDiff = freemiumCommission - proCommission;
  const netWithPro = commissionDiff - MEMBERSHIP_COST;

  const serializedAdvisor = {
    ...advisor,
    createdAt: advisor.createdAt.toISOString(),
    paidUntil: advisor.paidUntil?.toISOString() ?? null,
    onboardedAt: advisor.onboardedAt?.toISOString() ?? null,
    monthlyPriceMxn: MONTHLY_PRICE_MXN,
    pendingCommissionTotal,
    pendingCommissions: pendingCommissions.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  };

  return (
    <PerfilClient
      initialAdvisor={serializedAdvisor}
      initialClientCount={clientCount}
      initialLeadCount={leadCount}
      freemiumCommission={freemiumCommission}
      proCommission={proCommission}
      commissionDiff={commissionDiff}
      netWithPro={netWithPro}
      convertedCount={allConverted.length}
    />
  );
}
