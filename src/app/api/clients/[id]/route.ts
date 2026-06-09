import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await db.client.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  if (!client || client.advisorId !== session.advisorId) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await db.client.update({
    where: { id },
    data: {
      name: body.name ?? client.name,
      email: body.email ?? client.email,
      phone: body.phone ?? client.phone,
      policyNumber: body.policyNumber ?? client.policyNumber,
    },
  });

  return NextResponse.json(updated);
}
