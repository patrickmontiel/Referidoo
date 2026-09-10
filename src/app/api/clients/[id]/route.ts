import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { normalizeClientPhone, normalizeClientEmail } from "@/lib/client-identity";

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
  const nextEmail = body.email ?? client.email;
  const nextPhone = body.phone ?? client.phone;
  const updated = await db.client.update({
    where: { id },
    data: {
      name: body.name ?? client.name,
      email: nextEmail,
      phone: nextPhone,
      policyNumber: body.policyNumber ?? client.policyNumber,
      // Mantener la identidad de la cartera en sincronía: si cambia el teléfono
      // o el correo, el dedupe de futuros imports debe usar el valor nuevo.
      normalizedPhone: normalizeClientPhone(nextPhone),
      normalizedEmail: normalizeClientEmail(nextEmail),
    },
  });

  return NextResponse.json(updated);
}
