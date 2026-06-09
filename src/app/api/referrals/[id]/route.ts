import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const referral = await db.referral.findUnique({ where: { id } });
  if (!referral || referral.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await db.referral.update({
    where: { id },
    data: {
      status: body.status ?? referral.status,
      rewardStatus: body.rewardStatus ?? referral.rewardStatus,
      leadNotes: body.leadNotes ?? referral.leadNotes,
    },
  });

  return NextResponse.json(updated);
}
