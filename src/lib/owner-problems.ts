import { db } from "@/lib/db";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { REWARD_CUTOFF_DAYS } from "@/lib/utils";
import { REAL_ADVISOR_WHERE, REAL_REFERRAL_WHERE } from "@/lib/analytics-scope";

// PRIVACIDAD: este módulo alimenta el UI del owner Y el prompt de la narrativa
// IA. NUNCA debe contener nombres de CLIENTES ni de LEADS — solo nombres de
// ASESORES (que son los clientes de Referidoo) y agregados. Ver 12-OWNER-DATA-TRUTH-REDESIGN.md.

const OPEN_STATUSES = ["pending", "contacted", "in_process"];
const STALE_LEAD_MS = 7 * 24 * 60 * 60 * 1000;
// Alineado con el corte obligatorio del asesor (REWARD_CUTOFF_DAYS): un premio
// se marca vencido/moroso al pasar el mismo umbral que ve el asesor. Los avisos
// de día 7 y 14 (cron) son recordatorios previos, no morosidad.
const OVERDUE_MS = REWARD_CUTOFF_DAYS * 24 * 60 * 60 * 1000;

// HEURÍSTICA DE TRIAGE (no es una métrica publicada): primas anuales mínimas
// plausibles por producto en MX. Sirve para levantar una revisión manual de
// carátula, NO para afirmar fraude. Umbrales estimados, sin fuente externa —
// por eso el texto del problema dice "revisar", nunca acusa.
const MIN_PLAUSIBLE: Record<string, number> = {
  PPR: 15000,
  Vida: 8000,
  GMM: 8000,
  "Daños/Auto": 4000,
};

// Sin `ejemplo`: antes traía el NOMBRE del cliente/referidor (PII) hasta el UI
// del owner y hasta el prompt de OpenAI. Ahora solo agregados.
export type MorosoInfo = { count: number; total: number };

type Advisor = { id: string; name: string; plan: string; createdAt: Date; paymentFailedAt: Date | null };
type Referral = {
  advisorId: string;
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
        // Alcance real: asesor vivo/no-interno Y referido NO borrado.
        ...REAL_REFERRAL_WHERE,
      },
      // Sin nombre del referidor: solo lo necesario para agregar por asesor.
      select: { advisorId: true, rewardAmount: true },
    }),
    db.bubbleClaim.findMany({
      where: { status: "pending", createdAt: { lt: overdueCutoff }, client: { advisor: REAL_ADVISOR_WHERE } },
      select: { amount: true, client: { select: { advisorId: true } } },
    }),
  ]);

  for (const r of overdueEscalera) {
    const prev = morosos.get(r.advisorId) ?? { count: 0, total: 0 };
    morosos.set(r.advisorId, { count: prev.count + 1, total: prev.total + r.rewardAmount });
  }
  for (const c of overdueClaims) {
    const prev = morosos.get(c.client.advisorId) ?? { count: 0, total: 0 };
    morosos.set(c.client.advisorId, { count: prev.count + 1, total: prev.total + c.amount });
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
      title: `Premios vencidos: ${info.count} sin pagar +${REWARD_CUTOFF_DAYS} días ($${info.total.toLocaleString("es-MX")})`,
      detail: `${advisorName.get(advisorId) ?? "Un asesor"} pasó el corte obligatorio de ${REWARD_CUTOFF_DAYS} días sin pagarle a sus clientes — la promesa rota quema el canal. El cron ya le mandó recordatorios (día 7 y 14) antes del corte.`,
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
      // Sin nombre del lead (PII): producto + monto bastan para el triage.
      worst: `${r.productType} por $${r.saleAmount.toLocaleString("es-MX")}`,
    });
  }
  for (const [advisorId, info] of lowByAdvisor) {
    problems.push({
      id: `lowamt-${advisorId}`,
      title: `${info.count} conversión${info.count !== 1 ? "es" : ""} por debajo del umbral de revisión`,
      detail: `${advisorName.get(advisorId) ?? "Un asesor"} reportó ${info.worst} — por debajo de la prima mínima estimada para ese producto. Pedir carátula para validar (umbral heurístico, no es una acusación).`,
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
