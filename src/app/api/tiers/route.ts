import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { invalidateAdvisorConfigCache } from "@/lib/rewards";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [tiers, settings] = await Promise.all([
    db.rewardTier.findMany({
      where: { advisorId: session.advisorId },
      orderBy: { position: "asc" },
    }),
    db.advisorSettings.findUnique({ where: { advisorId: session.advisorId } }),
  ]);

  return NextResponse.json({ tiers, settings });
}

export async function PUT(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { tiers, afterLastTier, flatAmount, whatsappMessage, welcomeMessage, schedulingUrl } = await req.json();

  // Normaliza el link de agenda: acepta "calendly.com/x" sin esquema y le
  // antepone https:// para que el botón del formulario abra bien.
  const cleanSchedulingUrl = (() => {
    const s = typeof schedulingUrl === "string" ? schedulingUrl.trim() : "";
    if (!s) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  })();

  await db.rewardTier.deleteMany({ where: { advisorId: session.advisorId } });

  if (Array.isArray(tiers) && tiers.length > 0) {
    await db.rewardTier.createMany({
      data: tiers.map((t: { amount: number; label?: string }, i: number) => ({
        advisorId: session.advisorId,
        position: i + 1,
        amount: Number(t.amount),
        label: t.label || null,
      })),
    });
  }

  await db.advisorSettings.upsert({
    where: { advisorId: session.advisorId },
    create: {
      advisorId: session.advisorId,
      afterLastTier: afterLastTier ?? "cycle",
      flatAmount: Number(flatAmount) || 1500,
      whatsappMessage: whatsappMessage || null,
      welcomeMessage: welcomeMessage || null,
      schedulingUrl: cleanSchedulingUrl,
    },
    update: {
      afterLastTier: afterLastTier ?? "cycle",
      flatAmount: Number(flatAmount) || 1500,
      whatsappMessage: whatsappMessage || null,
      welcomeMessage: welcomeMessage || null,
      schedulingUrl: cleanSchedulingUrl,
    },
  });
  invalidateAdvisorConfigCache(session.advisorId);

  return NextResponse.json({ ok: true });
}
