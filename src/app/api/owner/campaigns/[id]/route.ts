import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { perRecipientRollup } from "@/lib/campaign-metrics";
import { REAL_ADVISOR_WHERE } from "@/lib/analytics-scope";

// Drilldown de campaña para el dueño: Campaign → Clients. Owner-gated.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  // Alcance real: no exponer campañas de cuentas internas/QA ni borradas.
  const campaign = await db.referralCampaign.findUnique({ where: { id }, select: { advisorId: true } });
  if (!campaign) return NextResponse.json({ rows: [] });
  const advisor = await db.advisor.findFirst({
    where: { id: campaign.advisorId, ...REAL_ADVISOR_WHERE },
    select: { id: true },
  });
  if (!advisor) return NextResponse.json({ rows: [] });

  const [recipients, events] = await Promise.all([
    db.campaignRecipient.findMany({ where: { campaignId: id }, orderBy: { createdAt: "asc" } }),
    db.productEvent.findMany({ where: { campaignId: id }, select: { event: true, campaignRecipientId: true } }),
  ]);

  // PRIVACIDAD: el owner ve performance por recipient, NO identidad del cliente.
  // Referencia anónima estable derivada del ID interno (ej. "Referidor #A82F").
  const rollup = perRecipientRollup(recipients, events);

  const rows = recipients.map((r) => {
    const roll = rollup.get(r.id)!;
    return {
      ref: `Referidor #${r.clientId.slice(-4).toUpperCase()}`,
      contacted: roll.contacted,
      opened: roll.opened,
      shared: roll.shared,
      referrals: roll.referrals,
    };
  });

  return NextResponse.json({ rows });
}
