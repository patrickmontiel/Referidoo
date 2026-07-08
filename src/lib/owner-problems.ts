import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";

const OPEN_STATUSES = ["pending", "contacted", "in_process"];
const STALE_LEAD_MS = 7 * 24 * 60 * 60 * 1000;
const OVERDUE_MS = 14 * 24 * 60 * 60 * 1000;

// Umbrales = primas anuales mínimas plausibles por producto en MX — la
// comisión de Referidoo depende del monto que reporta el asesor, así que
// subreportar es el vector de fraude directo.
const MIN_PLAUSIBLE: Record<string, number> = {
  PPR: 15000,
  Vida: 8000,
  GMM: 8000,
  "Daños/Auto": 4000,
};

export type MorosoInfo = { count: number; total: number; ejemplo: string };

type Advisor = { id: string; name: string; plan: string; createdAt: Date; paymentFailedAt: Date | null };
type Referral = {
  advisorId: string;
  leadName: string;
  status: string;
  saleAmount: number | null;
  productType: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Premios con +14 días sin pagar (escalera aprobada o burbuja reclamada) —
// alimenta el chip rojo del ranking y el detector de problemas.
export async function computeMorosos(now: Date): Promise<Map<string, MorosoInfo>> {
  const overdueCutoff = new Date(now.getTime() - OVERDUE_MS);
  const morosos = new Map<string, MorosoInfo>();

  const [overdueEscalera, overdueClaims] = await Promise.all([
    db.referral.findMany({
      where: {
        status: "converted",
        rewardStatus: "approved",
        tierPosition: { gt: 0 },
        updatedAt: { lt: overdueCutoff },
        advisor: { deletedAt: null },
      },
      select: { advisorId: true, rewardAmount: true, referrer: { select: { name: true } } },
    }),
    db.bubbleClaim.findMany({
      where: { status: "pending", createdAt: { lt: overdueCutoff }, client: { advisor: { deletedAt: null } } },
      select: { amount: true, client: { select: { name: true, advisorId: true } } },
    }),
  ]);

  for (const r of overdueEscalera) {
    const prev = morosos.get(r.advisorId) ?? { count: 0, total: 0, ejemplo: "" };
    morosos.set(r.advisorId, { count: prev.count + 1, total: prev.total + r.rewardAmount, ejemplo: r.referrer.name });
  }
  for (const c of overdueClaims) {
    const prev = morosos.get(c.client.advisorId) ?? { count: 0, total: 0, ejemplo: "" };
    morosos.set(c.client.advisorId, { count: prev.count + 1, total: prev.total + c.amount, ejemplo: c.client.name });
  }

  return morosos;
}

export function computeOwnerProblems(params: {
  advisors: Advisor[];
  referrals: Referral[];
  morosos: Map<string, MorosoInfo>;
  now: Date;
}): { id: string; title: string; detail: string }[] {
  const { advisors, referrals, morosos, now } = params;
  const advisorName = new Map(advisors.map((a) => [a.id, a.name]));
  const converted = referrals.filter((r) => r.status === "converted");
  const problems: { id: string; title: string; detail: string }[] = [];

  const nameGroups = new Map<string, Advisor[]>();
  for (const a of advisors) {
    const key = a.name.trim().toLowerCase();
    nameGroups.set(key, [...(nameGroups.get(key) ?? []), a]);
  }
  for (const [, group] of nameGroups) {
    if (group.length > 1) {
      problems.push({
        id: `dup-${group[0].id}`,
        title: `Cuenta duplicada: ${group[0].name}`,
        detail: `Aparece ${group.length} veces en el ranking — fusionar o desactivar la cuenta sin actividad.`,
      });
    }
  }

  const noAmountByAdvisor = new Map<string, number>();
  for (const r of converted) {
    if (!r.saleAmount) {
      noAmountByAdvisor.set(r.advisorId, (noAmountByAdvisor.get(r.advisorId) ?? 0) + 1);
    }
  }
  for (const [advisorId, count] of noAmountByAdvisor) {
    problems.push({
      id: `noamount-${advisorId}`,
      title: `${count} conversión${count !== 1 ? "es" : ""} sin monto capturado`,
      detail: `${advisorName.get(advisorId) ?? "Un asesor"} registró cierres sin valor de póliza — la comisión no se puede calcular.`,
    });
  }

  for (const [advisorId, info] of morosos) {
    problems.push({
      id: `moroso-${advisorId}`,
      title: `Premios vencidos: ${info.count} sin pagar +14 días ($${info.total.toLocaleString("es-MX")})`,
      detail: `${advisorName.get(advisorId) ?? "Un asesor"} debe premios a sus clientes (ej. ${info.ejemplo}) — la promesa rota quema el canal. El cron ya le mandó recordatorio (día 7) y aviso firme (día 14).`,
    });
  }

  const lowByAdvisor = new Map<string, { count: number; worst: string }>();
  for (const r of converted) {
    if (!r.saleAmount || !r.productType) continue;
    const min = MIN_PLAUSIBLE[r.productType];
    if (!min || r.saleAmount >= min) continue;
    const prev = lowByAdvisor.get(r.advisorId) ?? { count: 0, worst: "" };
    lowByAdvisor.set(r.advisorId, {
      count: prev.count + 1,
      worst: `${r.productType} de ${r.leadName} por $${r.saleAmount.toLocaleString("es-MX")}`,
    });
  }
  for (const [advisorId, info] of lowByAdvisor) {
    problems.push({
      id: `lowamt-${advisorId}`,
      title: `${info.count} conversión${info.count !== 1 ? "es" : ""} con monto atípicamente bajo`,
      detail: `${advisorName.get(advisorId) ?? "Un asesor"} reportó ${info.worst} — pedir carátula de póliza para validar el monto y la comisión.`,
    });
  }

  for (const a of advisors) {
    if (a.paymentFailedAt) {
      const date = a.paymentFailedAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" }).replace(".", "");
      problems.push({
        id: `payfail-${a.id}`,
        title: "Cobro de suscripción rechazado",
        detail: `El cargo de $${MONTHLY_PRICE_MXN} a ${a.name} se rechazó el ${date} — Mercado Pago reintenta el cobro.`,
      });
    }
  }

  for (const a of advisors) {
    const open = referrals.filter((r) => r.advisorId === a.id && OPEN_STATUSES.includes(r.status));
    if (open.length === 0) continue;
    const newest = open.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), open[0].updatedAt);
    if (now.getTime() - newest.getTime() > STALE_LEAD_MS) {
      const days = Math.floor((now.getTime() - newest.getTime()) / (24 * 60 * 60 * 1000));
      problems.push({
        id: `stale-${a.id}`,
        title: "Asesor inactivo con leads abiertos",
        detail: `${a.name} tiene ${open.length} lead${open.length !== 1 ? "s" : ""} sin actualizar desde hace ${days} días.`,
      });
    }
  }

  return problems;
}
