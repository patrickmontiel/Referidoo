import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { REAL_ADVISOR_WHERE } from "@/lib/analytics-scope";

// Timeline de eventos de activación de UN asesor (drilldown del cockpit).
// Owner-only.
//
// PRIVACIDAD: el owner necesita el PERFORMANCE de la cartera, no la IDENTIDAD
// de los clientes del asesor. Este endpoint NO devuelve nombres: usa una
// referencia anónima y estable derivada del ID interno (ej. "Referidor #A82F")
// para poder seguir un mismo actor a lo largo del timeline sin exponer PII.
function anonRef(prefix: string, id: string): string {
  return `${prefix} #${id.slice(-4).toUpperCase()}`;
}
export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const advisorId = req.nextUrl.searchParams.get("advisorId");
  if (!advisorId) return NextResponse.json({ error: "advisorId requerido" }, { status: 400 });

  // Alcance real: no exponer timeline de cuentas internas/QA ni borradas.
  const advisor = await db.advisor.findFirst({
    where: { id: advisorId, ...REAL_ADVISOR_WHERE },
    select: { id: true },
  });
  if (!advisor) return NextResponse.json({ events: [] });

  const events = await db.productEvent.findMany({
    where: { advisorId },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: { id: true, event: true, channel: true, clientId: true, referralId: true, createdAt: true },
  });

  // Sin lookups de Client/Referral: las referencias se derivan del propio ID
  // del evento, así que ningún nombre sale del API.
  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      event: e.event,
      channel: e.channel,
      createdAt: e.createdAt,
      client: e.clientId ? anonRef("Referidor", e.clientId) : null,
      lead: e.referralId ? anonRef("Lead", e.referralId) : null,
    })),
  });
}
