import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

// Perfil de negocio MÍNIMO: solo las dos preguntas que cambian el producto.
//   products       → "PPR" | "Vida" | "Ambos"
//   defaultChannel → "whatsapp" | "email" | "ambos"
// No se pregunta tamaño de cartera (se deriva), ni años de experiencia, ni CRM,
// ni cómo consigue referidos hoy: nada de eso altera este flujo.
const PRODUCTS = ["PPR", "Vida", "Ambos"];
const CHANNELS = ["whatsapp", "email", "ambos"];

export async function PUT(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { products, defaultChannel } = await req.json();
  if (products !== undefined && !PRODUCTS.includes(products)) {
    return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
  }
  if (defaultChannel !== undefined && !CHANNELS.includes(defaultChannel)) {
    return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
  }

  const data = {
    ...(products !== undefined ? { products } : {}),
    ...(defaultChannel !== undefined ? { defaultChannel } : {}),
  };

  // AdvisorSettings es 1:1 y puede no existir todavía.
  await db.advisorSettings.upsert({
    where: { advisorId: session.advisorId },
    update: data,
    create: { advisorId: session.advisorId, ...data },
  });

  return NextResponse.json({ ok: true, ...data });
}
