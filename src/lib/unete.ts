import { db } from "@/lib/db";
import { sendUneteRewardEmail } from "@/lib/email";

// Incentivo del loop asesor→asesor, de doble lado: cuando un asesor que llegó
// vía /unete/{slug} CIERRA su primer cliente (primer referido convertido),
// ganan los dos — el invitado (bono de arranque) y el reclutador. 30 días de
// Pro cada uno: freemium sube a Pro sin suscripción MP (billing-commission lo
// ignora porque filtra mpPreapprovalId != null; billing-downgrade lo regresa a
// freemium al expirar), Pro pagado extiende su vigencia.
// Contabilidad en PlanEvents: "unete:{slug}" = atribución (en el invitado),
// "unete_reward_self" = bono del invitado pagado, "unete_reward:{invitadoId}"
// = premio del reclutador pagado. Los eventos evitan dobles otorgamientos.

const REWARD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function nameToSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

type AdvisorLite = { id: string; name: string; email: string; plan: string; paidUntil: Date | null };

async function grantProMonth(advisor: AdvisorLite): Promise<Date> {
  const now = new Date();
  const base =
    advisor.plan === "paid" && advisor.paidUntil && advisor.paidUntil > now
      ? advisor.paidUntil
      : now;
  const newPaidUntil = new Date(base.getTime() + REWARD_DAYS * DAY_MS);
  await db.advisor.update({
    where: { id: advisor.id },
    data: { plan: "paid", paidUntil: newPaidUntil },
  });
  return newPaidUntil;
}

export async function grantUneteRewardsIfFirstConversion(recruitedAdvisorId: string) {
  try {
    // Solo en la PRIMERA conversión del asesor invitado.
    const convertedCount = await db.referral.count({
      where: { advisorId: recruitedAdvisorId, status: "converted" },
    });
    if (convertedCount !== 1) return;

    const attribution = await db.planEvent.findFirst({
      where: { advisorId: recruitedAdvisorId, event: { startsWith: "unete:" } },
      select: { event: true },
    });
    if (!attribution) return;
    const slug = attribution.event.slice("unete:".length);
    if (!slug) return;

    const advisors = await db.advisor.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, plan: true, paidUntil: true },
    });
    const recruited = advisors.find((a) => a.id === recruitedAdvisorId);
    if (!recruited) return;
    const recruiter = advisors.find(
      (a) => a.id !== recruitedAdvisorId && nameToSlug(a.name) === slug
    );

    // 1. Bono de arranque del invitado (una sola vez).
    const selfAlready = await db.planEvent.findFirst({
      where: { advisorId: recruitedAdvisorId, event: "unete_reward_self" },
      select: { id: true },
    });
    if (!selfAlready) {
      const until = await grantProMonth(recruited);
      await db.planEvent.create({
        data: { advisorId: recruitedAdvisorId, event: "unete_reward_self" },
      });
      console.log(`[unete] Bono de arranque: ${recruited.name} gana ${REWARD_DAYS} días Pro (primer cierre)`);
      await sendUneteRewardEmail({
        to: recruited.email,
        name: recruited.name,
        counterpartName: recruiter?.name ?? "tu colega",
        until,
        side: "recruit",
      });
    }

    // 2. Premio del reclutador (una sola vez por invitado).
    if (recruiter) {
      const rewardEvent = `unete_reward:${recruitedAdvisorId}`;
      const already = await db.planEvent.findFirst({
        where: { advisorId: recruiter.id, event: rewardEvent },
        select: { id: true },
      });
      if (!already) {
        const until = await grantProMonth(recruiter);
        await db.planEvent.create({ data: { advisorId: recruiter.id, event: rewardEvent } });
        console.log(`[unete] Premio de reclutador: ${recruiter.name} gana ${REWARD_DAYS} días Pro por ${recruited.name}`);
        await sendUneteRewardEmail({
          to: recruiter.email,
          name: recruiter.name,
          counterpartName: recruited.name,
          until,
          side: "recruiter",
        });
      }
    }
  } catch (err) {
    console.error("[unete] Error otorgando premios de reclutamiento:", err);
  }
}
