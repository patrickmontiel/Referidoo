import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { computeMorosos, computeOwnerProblems } from "@/lib/owner-problems";
import { generateOwnerNarrative, NARRATIVE_REFRESH_MS } from "@/lib/owner-narrative-ai";
import { REAL_ADVISOR_WHERE, REAL_REFERRAL_WHERE } from "@/lib/analytics-scope";

// Independiente del selector de periodo de /owner (mes/90d/todo) — el
// briefing siempre refleja el estado operativo actual, no una ventana de
// tiempo elegida en la UI. Por eso vive en su propio endpoint en vez de
// colgarse de /api/owner/overview.
export async function GET() {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Cacheado — no se regenera en cada carga (ver NARRATIVE_REFRESH_MS).
  const cached = await db.ownerBriefing.findFirst({ orderBy: { generatedAt: "desc" } });
  if (cached && Date.now() - cached.generatedAt.getTime() < NARRATIVE_REFRESH_MS) {
    return NextResponse.json({ narrative: cached.narrative, generatedAt: cached.generatedAt, cached: true });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [advisors, referrals] = await Promise.all([
    db.advisor.findMany({
      where: REAL_ADVISOR_WHERE,
      select: { id: true, name: true, plan: true, mpPreapprovalId: true, createdAt: true, paymentFailedAt: true },
    }),
    db.referral.findMany({
      where: REAL_REFERRAL_WHERE,
      select: {
        advisorId: true,
        // Sin leadName: los nombres de leads NO deben llegar al prompt de OpenAI.
        status: true,
        saleAmount: true,
        productType: true,
        lessioCommission: true,
        createdAt: true,
        updatedAt: true,
        convertedAt: true, // fecha de cierre inmutable
      },
    }),
  ]);

  const morosos = await computeMorosos(now);
  const problems = computeOwnerProblems({ advisors, referrals, morosos, now });

  // MRR real: solo suscripciones MP vivas (paid sin mpPreapprovalId = trial/comp).
  const proCount = advisors.filter((a) => a.plan === "paid" && a.mpPreapprovalId).length;
  const mrr = proCount * MONTHLY_PRICE_MXN;
  // Usa la fecha INMUTABLE: editar un referido ya no lo mueve de mes.
  const convertedThisMonth = referrals.filter((r) => r.status === "converted" && r.convertedAt != null && r.convertedAt >= monthStart);
  const commissionTotal = convertedThisMonth.reduce((s, r) => s + (r.lessioCommission ?? 0), 0);

  const narrative = await generateOwnerNarrative({
    problems,
    proCount,
    activeCount: advisors.length,
    mrr,
    commissionTotal,
    conversionsCount: convertedThisMonth.length,
  });

  if (narrative) {
    await db.ownerBriefing.create({ data: { narrative } });
  }

  // Si falla la generación (sin key, error de OpenAI) mostramos el último
  // briefing conocido aunque esté vencido, en vez de dejar la tarjeta vacía.
  return NextResponse.json({ narrative: narrative ?? cached?.narrative ?? null, problemsCount: problems.length });
}
