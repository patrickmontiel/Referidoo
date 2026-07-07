import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// El cliente guarda sus datos para recibir premios desde su portal. El asesor
// los ve al momento de pagar (modal de pago) con botones de copiar.
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await db.client.findUnique({ where: { accessToken: token }, select: { id: true, active: true } });
  if (!client || !client.active) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const { clabe, bank, holder } = await req.json();
  const cleanClabe = String(clabe ?? "").replace(/\s/g, "");
  if (!/^\d{18}$/.test(cleanClabe)) {
    return NextResponse.json({ error: "La CLABE debe tener 18 dígitos" }, { status: 400 });
  }
  const cleanBank = String(bank ?? "").trim().slice(0, 40);
  const cleanHolder = String(holder ?? "").trim().slice(0, 80);

  await db.client.update({
    where: { id: client.id },
    data: { clabe: cleanClabe, clabeBank: cleanBank || null, clabeHolder: cleanHolder || null },
  });

  return NextResponse.json({ ok: true });
}
