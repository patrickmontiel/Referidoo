import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { perRecipientRollup } from "@/lib/campaign-metrics";

// Drilldown de campaña para el dueño: Campaign → Clients. Owner-gated.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const [recipients, events] = await Promise.all([
    db.campaignRecipient.findMany({ where: { campaignId: id }, orderBy: { createdAt: "asc" } }),
    db.productEvent.findMany({ where: { campaignId: id }, select: { event: true, campaignRecipientId: true } }),
  ]);

  const clients = await db.client.findMany({
    where: { id: { in: recipients.map((r) => r.clientId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(clients.map((c) => [c.id, c.name]));
  const rollup = perRecipientRollup(recipients, events);

  const rows = recipients.map((r) => {
    const roll = rollup.get(r.id)!;
    return { clientName: nameById.get(r.clientId) ?? "—", contacted: roll.contacted, opened: roll.opened, shared: roll.shared, referrals: roll.referrals };
  });

  return NextResponse.json({ rows });
}
