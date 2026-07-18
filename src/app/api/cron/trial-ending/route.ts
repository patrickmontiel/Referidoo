import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTrialEndingEmail } from "@/lib/email";

const WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

// Aviso por correo a los asesores en prueba (plan=paid sin suscripción de MP)
// a quienes les faltan ≤3 días para bajar a freemium. Se manda UNA sola vez
// por asesor (marca un PlanEvent "trial_ending_notified"), aunque el cron
// corra a diario mientras la fecha cae dentro de la ventana.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_MS);

  const candidates = await db.advisor.findMany({
    where: {
      plan: "paid",
      mpPreapprovalId: null, // en prueba, sin suscripción real
      emailVerified: true,
      deletedAt: null,
      paidUntil: { gt: now, lte: windowEnd },
    },
    select: { id: true, name: true, email: true, paidUntil: true },
  });

  // Evita reenviar: descarta a quien ya recibió el aviso.
  const notified = await db.planEvent.findMany({
    where: { advisorId: { in: candidates.map((c) => c.id) }, event: "trial_ending_notified" },
    select: { advisorId: true },
  });
  const notifiedSet = new Set(notified.map((n) => n.advisorId));
  const toSend = candidates.filter((c) => !notifiedSet.has(c.id));

  let sent = 0;
  for (const a of toSend) {
    try {
      const daysLeft = Math.max(0, Math.ceil((a.paidUntil!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      await sendTrialEndingEmail({ advisorEmail: a.email, advisorName: a.name, daysLeft });
      await db.planEvent.create({ data: { advisorId: a.id, event: "trial_ending_notified" } });
      sent++;
    } catch (err) {
      console.error("[cron/trial-ending] Error avisando a", a.email, err);
    }
  }

  return NextResponse.json({ candidates: candidates.length, sent });
}
