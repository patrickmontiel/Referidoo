import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import {
  DEFAULT_BUBBLE_AUTO_POINTS,
  DEFAULT_BUBBLE_GMM_POINTS,
  DEFAULT_BUBBLE_CLAIM_THRESHOLD,
} from "@/lib/rewards";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const settings = await db.advisorSettings.findUnique({ where: { advisorId: session.advisorId } });

  return NextResponse.json({
    bubbleAutoPoints: settings?.bubbleAutoPoints ?? DEFAULT_BUBBLE_AUTO_POINTS,
    bubbleGmmPoints: settings?.bubbleGmmPoints ?? DEFAULT_BUBBLE_GMM_POINTS,
    bubbleClaimThreshold: settings?.bubbleClaimThreshold ?? DEFAULT_BUBBLE_CLAIM_THRESHOLD,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { bubbleAutoPoints, bubbleGmmPoints, bubbleClaimThreshold } = await req.json();

  const data = {
    bubbleAutoPoints: Number(bubbleAutoPoints) || DEFAULT_BUBBLE_AUTO_POINTS,
    bubbleGmmPoints: Number(bubbleGmmPoints) || DEFAULT_BUBBLE_GMM_POINTS,
    bubbleClaimThreshold: Number(bubbleClaimThreshold) || DEFAULT_BUBBLE_CLAIM_THRESHOLD,
  };

  await db.advisorSettings.upsert({
    where: { advisorId: session.advisorId },
    create: { advisorId: session.advisorId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true, ...data });
}
