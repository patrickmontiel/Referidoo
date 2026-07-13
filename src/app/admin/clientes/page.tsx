import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const [advisor, clients, tiers] = await Promise.all([
    db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { name: true, companyName: true },
    }),
    db.client.findMany({
      where: { advisorId: session.advisorId },
      include: {
        _count: { select: { referrals: { where: { deletedAt: null } } } },
        referrals: {
          where: { deletedAt: null },
          select: { rewardAmount: true, rewardStatus: true, status: true, tierPosition: true, productType: true, interestProductType: true, rewardApprovedAt: true },
        },
        bubbleClaims: { select: { amount: true, status: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.rewardTier.findMany({
      where: { advisorId: session.advisorId },
      orderBy: { position: "asc" },
    }),
  ]);

  const maxTierAmount = tiers.length ? Math.max(...tiers.map((t) => t.amount)) : 3500;

  const serializedClients = clients.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    referrals: c.referrals.map((r) => ({
      ...r,
      rewardApprovedAt: r.rewardApprovedAt ? r.rewardApprovedAt.toISOString() : null,
    })),
    bubbleClaims: c.bubbleClaims.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
    })),
  }));

  return (
    <ClientesClient
      initialClients={serializedClients}
      initialAdvisor={advisor}
      initialMaxTierAmount={maxTierAmount}
    />
  );
}
