import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { sendClientLinkEmail } from "@/lib/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

// Función Pro: manda a TODOS los clientes (con correo) su link de portal de una
// vez. Marca los enviados con PlanEvent "linksent:{clientId}" — sin migración.
// Por defecto solo envía a los que no se han mandado; { resendAll: true } reenvía.
export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { plan: true, name: true, companyName: true },
  });
  if (!advisor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (advisor.plan !== "paid") {
    return NextResponse.json({ error: "Enviar el link a todos es una función Pro." }, { status: 403 });
  }

  // Cap por lote: los envíos son secuenciales y el serverless tiene timeout.
  // Se mandan hasta BATCH por llamada; si quedan más sin enviar, el asesor
  // vuelve a tocar (marca los enviados, así el siguiente lote toma los que faltan).
  const BATCH = 100;

  const [clients, sentEvents] = await Promise.all([
    db.client.findMany({
      where: { advisorId: session.advisorId, active: true },
      select: { id: true, name: true, email: true, accessToken: true },
    }),
    db.planEvent.findMany({
      where: { advisorId: session.advisorId, event: { startsWith: "linksent:" } },
      select: { event: true },
    }),
  ]);

  const alreadySentIds = new Set(sentEvents.map((e) => e.event.slice("linksent:".length)));
  const noEmail = clients.filter((c) => !c.email).length;
  const pending = clients.filter((c) => c.email && !alreadySentIds.has(c.id));
  const batch = pending.slice(0, BATCH);
  const remaining = pending.length - batch.length;

  let sent = 0;
  // Secuencial y con captura por cliente — un correo que falle no tumba el resto.
  for (const c of batch) {
    try {
      const r = await sendClientLinkEmail({
        clientName: c.name,
        clientEmail: c.email!,
        portalUrl: `${BASE_URL}/c/${c.accessToken}`,
        advisorName: advisor.name,
        companyName: advisor.companyName,
      });
      if (r.ok) {
        sent++;
        await db.planEvent.create({ data: { advisorId: session.advisorId, event: `linksent:${c.id}` } }).catch(() => {});
      }
    } catch (err) {
      console.error("[send-links] Error con cliente", c.id, err);
    }
  }

  return NextResponse.json({ ok: true, sent, remaining, noEmail, total: clients.length });
}
