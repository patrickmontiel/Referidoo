import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";

// Timeline de eventos de activación de UN asesor (drilldown del cockpit).
// Owner-only. Resuelve nombres de cliente/referido para contexto legible.
export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const advisorId = req.nextUrl.searchParams.get("advisorId");
  if (!advisorId) return NextResponse.json({ error: "advisorId requerido" }, { status: 400 });

  const events = await db.productEvent.findMany({
    where: { advisorId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: { id: true, event: true, channel: true, clientId: true, referralId: true, createdAt: true },
  });

  // Resolver nombres en lote (contexto legible, sin exponer teléfonos/correos).
  const clientIds = [...new Set(events.map((e) => e.clientId).filter(Boolean) as string[])];
  const referralIds = [...new Set(events.map((e) => e.referralId).filter(Boolean) as string[])];
  const [clients, referrals] = await Promise.all([
    clientIds.length ? db.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    referralIds.length ? db.referral.findMany({ where: { id: { in: referralIds } }, select: { id: true, leadName: true } }) : Promise.resolve([]),
  ]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const leadName = new Map(referrals.map((r) => [r.id, r.leadName]));

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      event: e.event,
      channel: e.channel,
      createdAt: e.createdAt,
      client: e.clientId ? clientName.get(e.clientId) ?? null : null,
      lead: e.referralId ? leadName.get(e.referralId) ?? null : null,
    })),
  });
}
