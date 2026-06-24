import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN, updateSubscriptionAmount } from "@/lib/mercadopago";

// Mercado Pago cobra cada suscripción en su propio ciclo (anclado a la fecha
// en que ese asesor se suscribió, no al día 1 del mes calendario). Este cron
// corre una vez al día y atiende a cada asesor cuando su `paidUntil` cae
// dentro de las próximas 24h — es decir, el día antes de que Mercado Pago
// intente cobrarle de nuevo.
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

// Suma la comisión de Referidoo acumulada (conversiones con `billedAt: null`)
// y la agrega al monto mensual fijo antes de que llegue el próximo cobro.
// Solo marca `billedAt` si el PUT a Mercado Pago respondió bien — si falla,
// la comisión queda pendiente y se reintenta en la corrida del día siguiente
// (rueda al próximo ciclo de cobro, no se pierde ni se duplica).
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const lookaheadCutoff = new Date(now.getTime() + LOOKAHEAD_MS);

  const dueAdvisors = await db.advisor.findMany({
    where: {
      plan: "paid",
      mpPreapprovalId: { not: null },
      paidUntil: { gte: now, lte: lookaheadCutoff },
    },
    select: { id: true, mpPreapprovalId: true },
  });

  let billed = 0;
  let skippedNoCommission = 0;
  let failed = 0;

  for (const advisor of dueAdvisors) {
    const pending = await db.referral.findMany({
      where: { advisorId: advisor.id, billedAt: null, lessioCommission: { not: null } },
      select: { id: true, lessioCommission: true },
    });

    const commissionTotal = pending.reduce((sum, r) => sum + (r.lessioCommission ?? 0), 0);
    if (commissionTotal <= 0) {
      skippedNoCommission++;
      continue;
    }

    try {
      await updateSubscriptionAmount(advisor.mpPreapprovalId!, MONTHLY_PRICE_MXN + commissionTotal);
      await db.referral.updateMany({
        where: { id: { in: pending.map((r) => r.id) } },
        data: { billedAt: now },
      });
      billed++;
    } catch (err) {
      failed++;
      console.error(`[cron/billing-commission] Error actualizando monto para asesor ${advisor.id}:`, err);
    }
  }

  return NextResponse.json({ dueAdvisors: dueAdvisors.length, billed, skippedNoCommission, failed });
}
