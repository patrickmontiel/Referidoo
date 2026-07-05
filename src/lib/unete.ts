import { Resend } from "resend";
import { db } from "@/lib/db";

// Incentivo del loop asesor→asesor: cuando un asesor reclutado vía
// /unete/{slug} registra su PRIMER referido, el reclutador gana 30 días de
// Pro. Freemium → sube a Pro por 30 días (sin suscripción MP: el cron de
// billing-commission lo ignora porque filtra mpPreapprovalId != null, y
// billing-downgrade lo regresa a freemium solo cuando expira). Pro pagado →
// se extiende su vigencia 30 días.
// La atribución vive como PlanEvent "unete:{slug}" en el reclutado, y el
// pago del premio como "unete_reward:{reclutadoId}" en el reclutador — ese
// evento evita otorgar dos veces por el mismo reclutado.

const REWARD_DAYS = 30;

function nameToSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function grantUneteRewardIfFirstReferral(recruitedAdvisorId: string) {
  try {
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
    const recruiter = advisors.find((a) => a.id !== recruitedAdvisorId && nameToSlug(a.name) === slug);
    if (!recruiter) return;

    const rewardEvent = `unete_reward:${recruitedAdvisorId}`;
    const already = await db.planEvent.findFirst({
      where: { advisorId: recruiter.id, event: rewardEvent },
      select: { id: true },
    });
    if (already) return;

    const now = new Date();
    const base = recruiter.plan === "paid" && recruiter.paidUntil && recruiter.paidUntil > now
      ? recruiter.paidUntil
      : now;
    const newPaidUntil = new Date(base.getTime() + REWARD_DAYS * 24 * 60 * 60 * 1000);

    await db.advisor.update({
      where: { id: recruiter.id },
      data: { plan: "paid", paidUntil: newPaidUntil },
    });
    await db.planEvent.create({ data: { advisorId: recruiter.id, event: rewardEvent } });

    const recruited = advisors.find((a) => a.id === recruitedAdvisorId);
    console.log(`[unete] Premio otorgado: ${recruiter.name} gana ${REWARD_DAYS} días Pro por reclutar a ${recruited?.name ?? recruitedAdvisorId}`);

    // Aviso al reclutador — mejor esfuerzo, nunca truena el flujo del lead.
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || "Referidoo Team <noreply@referidoo.com>",
        to: recruiter.email,
        subject: "Te ganaste 1 mes de Referidoo Pro 🎉",
        text: `${recruiter.name.split(" ")[0]}, el colega que invitaste con tu link ya registró su primer referido — y eso te gana ${REWARD_DAYS} días de Referidoo Pro.\n\nTu Pro está activo hasta el ${newPaidUntil.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}: leads ilimitados, premios burbuja y comisiones reducidas.\n\n¿Conoces a otro colega que deba estar en Referidoo? Tu link sigue activo en tu panel — cada asesor que actives es otro mes gratis.\n\n— Patrick, Referidoo`,
      }).catch((err) => console.error("[unete] Error enviando aviso de premio:", err));
    }
  } catch (err) {
    console.error("[unete] Error otorgando premio de reclutamiento:", err);
  }
}
