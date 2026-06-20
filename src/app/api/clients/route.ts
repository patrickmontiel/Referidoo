import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { generateReferralCode } from "@/lib/utils";
import { canAdvisorAddClients, gateErrorMessage } from "@/lib/plan";

export async function GET() {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const clients = await db.client.findMany({
    where: { advisorId: session.advisorId },
    include: {
      _count: { select: { referrals: true } },
      referrals: {
        select: { rewardAmount: true, rewardStatus: true, status: true, tierPosition: true },
      },
      bubbleClaims: {
        select: { amount: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { name, email, phone, policyNumber } = await req.json();
  if (!name) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });

  const gate = await canAdvisorAddClients(session.advisorId);
  if (!gate.allowed) {
    return NextResponse.json({ error: gateErrorMessage(gate.reason) }, { status: 403 });
  }

  let referralCode = generateReferralCode(name);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await db.client.findUnique({ where: { referralCode } });
    if (!existing) break;
    referralCode = generateReferralCode(name);
    attempts++;
  }

  const client = await db.client.create({
    data: {
      advisorId: session.advisorId,
      name,
      email: email || null,
      phone: phone || null,
      policyNumber: policyNumber || null,
      referralCode,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
