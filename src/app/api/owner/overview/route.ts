import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { MONTHLY_PRICE_MXN } from "@/lib/mercadopago";
import { computeMorosos, computeOwnerProblems } from "@/lib/owner-problems";

// Misma fecha que summary/route.ts: lessioCommission solo existe desde aquí.
const LESSIO_COMMISSION_SINCE = "2026-06-24";

type Period = "month" | "90d" | "all";

function periodStart(period: Period, now: Date): Date | null {
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return null;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (r.getDay() + 6) % 7; // lunes = 0
  r.setDate(r.getDate() - day);
  return r;
}

function monthShort(d: Date): string {
  return d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "");
}

function weekLabel(start: Date, end: Date): string {
  const sm = monthShort(start);
  const em = monthShort(end);
  return sm === em
    ? `${start.getDate()}–${end.getDate()} ${em}`
    : `${start.getDate()} ${sm}–${end.getDate()} ${em}`;
}

export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const raw = req.nextUrl.searchParams.get("period");
  const period: Period = raw === "90d" || raw === "all" ? raw : "month";
  const now = new Date();
  const start = periodStart(period, now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [advisors, referrals, planEvents, bubbleClaims] = await Promise.all([
    db.advisor.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, plan: true, createdAt: true, paymentFailedAt: true },
      orderBy: { createdAt: "asc" },
    }),
    db.referral.findMany({
      where: { advisor: { deletedAt: null } },
      select: {
        advisorId: true,
        leadName: true,
        status: true,
        saleAmount: true,
        productType: true,
        lessioCommission: true,
        createdAt: true,
        updatedAt: true,
        referrer: { select: { name: true } },
      },
    }),
    db.planEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { event: true, createdAt: true, advisor: { select: { name: true, plan: true } } },
    }),
    db.bubbleClaim.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { amount: true, createdAt: true, client: { select: { advisor: { select: { name: true } } } } },
    }),
  ]);

  const advisorName = new Map(advisors.map((a) => [a.id, a.name]));
  const inPeriod = (d: Date) => (start ? d >= start : true);
  const converted = referrals.filter((r) => r.status === "converted");
  const convertedInPeriod = converted.filter((r) => inPeriod(r.updatedAt));

  // ── Stat cards ──
  const proCount = advisors.filter((a) => a.plan === "paid").length;
  const freemiumCount = advisors.length - proCount;
  const mrr = proCount * MONTHLY_PRICE_MXN;
  const newProAdvisors = new Set(
    planEvents
      .filter((e) => e.event === "activated" && e.createdAt >= monthStart && e.advisor.plan === "paid")
      .map((e) => e.advisor.name)
  );
  const mrrNew = newProAdvisors.size * MONTHLY_PRICE_MXN;

  const commissionTotal = convertedInPeriod.reduce((s, r) => s + (r.lessioCommission ?? 0), 0);
  const conversionsCount = convertedInPeriod.length;
  const salesValue = convertedInPeriod.reduce((s, r) => s + (r.saleAmount ?? 0), 0);

  const monthLabel = now
    .toLocaleDateString("es-MX", { month: "short", year: "numeric" })
    .replace(".", "")
    .replace(" de ", " ");
  const periodLabel =
    period === "month"
      ? `en ${now.toLocaleDateString("es-MX", { month: "long" })}`
      : period === "90d"
        ? "últimos 90 días"
        : `desde ${new Date(LESSIO_COMMISSION_SINCE).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }).replace(".", "")}`;

  // ── Buckets para la gráfica ──
  const weekly: { label: string; commission: number; mrr: number }[] = [];
  const bucketCount = period === "90d" ? 13 : 5;
  if (period === "all") {
    for (let i = 11; i >= 0; i--) {
      const bStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const bEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      weekly.push({
        label: `${monthShort(bStart)} ${String(bStart.getFullYear()).slice(2)}`,
        commission: converted
          .filter((r) => r.updatedAt >= bStart && r.updatedAt < bEnd)
          .reduce((s, r) => s + (r.lessioCommission ?? 0), 0),
        mrr:
          planEvents.filter((e) => e.event === "activated" && e.createdAt >= bStart && e.createdAt < bEnd).length *
          MONTHLY_PRICE_MXN,
      });
    }
  } else {
    const thisWeek = startOfWeek(now);
    for (let i = bucketCount - 1; i >= 0; i--) {
      const bStart = new Date(thisWeek);
      bStart.setDate(bStart.getDate() - i * 7);
      const bEnd = new Date(bStart);
      bEnd.setDate(bEnd.getDate() + 7);
      const labelEnd = new Date(bEnd.getTime() - 24 * 60 * 60 * 1000);
      weekly.push({
        label: weekLabel(bStart, labelEnd),
        commission: converted
          .filter((r) => r.updatedAt >= bStart && r.updatedAt < bEnd)
          .reduce((s, r) => s + (r.lessioCommission ?? 0), 0),
        mrr:
          planEvents.filter((e) => e.event === "activated" && e.createdAt >= bStart && e.createdAt < bEnd).length *
          MONTHLY_PRICE_MXN,
      });
    }
  }
  const weeklyHasData = weekly.some((w) => w.commission > 0 || w.mrr > 0);

  // ── Comisión por producto ──
  const productMap = new Map<string, number>();
  for (const r of convertedInPeriod) {
    if (!r.lessioCommission) continue;
    const key = r.productType ?? "Sin clasificar";
    productMap.set(key, (productMap.get(key) ?? 0) + r.lessioCommission);
  }
  const products = Array.from(productMap.entries())
    .map(([type, commission]) => ({
      type,
      commission,
      pct: commissionTotal > 0 ? Math.round((commission / commissionTotal) * 100) : 0,
    }))
    .sort((a, b) => b.commission - a.commission);

  // ── Morosidad: premios con +14 días sin pagar (escalera aprobada o
  //    burbuja reclamada). Alimenta el chip rojo del ranking y el detector. ──
  const morosos = await computeMorosos(now);

  // ── Ranking ──
  const ranking = advisors
    .map((a) => {
      const mine = referrals.filter((r) => r.advisorId === a.id);
      const myConverted = mine.filter((r) => r.status === "converted" && inPeriod(r.updatedAt));
      const closes = mine.filter((r) => r.status === "converted");
      const lastClose = closes.length
        ? closes.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), closes[0].updatedAt)
        : null;
      return {
        id: a.id,
        name: a.name,
        plan: a.plan,
        leads: mine.filter((r) => inPeriod(r.createdAt)).length,
        converted: myConverted.length,
        commission: myConverted.reduce((s, r) => s + (r.lessioCommission ?? 0), 0),
        lastCloseAt: lastClose?.toISOString() ?? null,
        moroso: morosos.has(a.id),
      };
    })
    .sort((a, b) => b.commission - a.commission || b.converted - a.converted || b.leads - a.leads);

  // ── Problemas operativos ──
  const problems = computeOwnerProblems({ advisors, referrals, morosos, now });

  // ── Actividad reciente ──
  type Activity = { type: "conversion" | "payment" | "bubble" | "new" | "alert"; text: string; amount: number | null; date: string };
  const activity: Activity[] = [];

  for (const r of converted) {
    if (r.saleAmount) {
      activity.push({
        type: "conversion",
        text: `${advisorName.get(r.advisorId) ?? "Asesor"} cerró un ${r.productType ?? "contrato"} — cliente referido por ${r.referrer.name}`,
        amount: r.lessioCommission,
        date: r.updatedAt.toISOString(),
      });
    } else {
      activity.push({
        type: "alert",
        text: `${advisorName.get(r.advisorId) ?? "Asesor"} registró una conversión sin monto (${r.leadName})`,
        amount: 0,
        date: r.updatedAt.toISOString(),
      });
    }
  }
  for (const e of planEvents) {
    if (e.event === "activated") {
      activity.push({ type: "payment", text: `Suscripción Pro activada — ${e.advisor.name}`, amount: MONTHLY_PRICE_MXN, date: e.createdAt.toISOString() });
    } else if (e.event === "failed") {
      activity.push({ type: "alert", text: `Cobro de suscripción rechazado — ${e.advisor.name}`, amount: null, date: e.createdAt.toISOString() });
    } else if (e.event === "cancelled") {
      activity.push({ type: "alert", text: `${e.advisor.name} canceló su plan Pro`, amount: null, date: e.createdAt.toISOString() });
    }
  }
  for (const c of bubbleClaims) {
    activity.push({
      type: "bubble",
      text: `Un cliente de ${c.client.advisor.name} reclamó su premio burbuja`,
      amount: c.amount || null,
      date: c.createdAt.toISOString(),
    });
  }
  for (const a of advisors) {
    if (now.getTime() - a.createdAt.getTime() < 30 * 24 * 60 * 60 * 1000) {
      activity.push({
        type: "new",
        text: `${a.name} creó su cuenta (${a.plan === "paid" ? "Pro" : "freemium"})`,
        amount: null,
        date: a.createdAt.toISOString(),
      });
    }
  }
  activity.sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json({
    monthLabel,
    periodLabel,
    mrr,
    mrrNew,
    proCount,
    freemiumCount,
    activeCount: advisors.length,
    commissionTotal,
    commissionSince: LESSIO_COMMISSION_SINCE,
    conversionsCount,
    salesValue,
    weekly,
    weeklyHasData,
    products,
    ranking,
    problems,
    activity: activity.slice(0, 8),
  });
}
