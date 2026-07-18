import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";

// Redacta el PRIMER mensaje de WhatsApp a un referido. El prompt codifica lo que
// de verdad convierte en outreach de referidos (r/InsuranceAgent, r/sales, guías
// de referral text): menciona de una a quién lo refirió, corto, sin venta en el
// primer mensaje, un solo CTA de bajo compromiso, tono humano/informal MX.
// Best-effort: sin OPENAI_API_KEY o si falla → plantilla de respaldo.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const referral = await db.referral.findUnique({
    where: { id },
    include: {
      referrer: { select: { name: true } },
      advisor: { select: { name: true, companyName: true } },
    },
  });
  if (!referral || referral.advisorId !== session.advisorId || referral.deletedAt) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const r = referral as typeof referral & { interestProductType?: string | null; preferredDays?: string | null; preferredHours?: string | null };
  const leadFirst = referral.leadName.split(" ")[0];
  const referrerFirst = referral.referrer.name.split(" ")[0];
  const advisorFirst = referral.advisor.name.split(" ")[0];
  const interes = r.interestProductType ?? "aún no lo sabe";
  const prefiere = [r.preferredDays, r.preferredHours].filter(Boolean).join(", ") || "sin preferencia";

  // Plantilla de respaldo (también útil si la IA no está disponible).
  const fallback = `Hola ${leadFirst}, soy ${advisorFirst}${referral.advisor.companyName ? ` de ${referral.advisor.companyName}` : ""}. ${referrerFirst} me pasó tu contacto porque cree que te podría servir. Sin compromiso ni venta — ¿te late que platiquemos 5 minutos${r.preferredDays || r.preferredHours ? ` (${prefiere})` : ""}?`;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: fallback, ai: false });
  }

  try {
    const prompt = `Eres un asesor de seguros mexicano escribiendo el PRIMER mensaje de WhatsApp a un referido (alguien que un cliente tuyo recomendó). Escribe UN mensaje siguiendo estas reglas probadas de mensajes de referido que sí funcionan:
- Menciona de una a quién lo refirió — da confianza prestada.
- Corto: 2 a 4 líneas, se lee de un vistazo en el celular.
- NADA de venta, cotización ni features en este primer mensaje. Tono humano, cálido, informal (de "tú"), como mexicano real. Sin jerga corporativa ni frases acartonadas.
- Un solo llamado a la acción, fácil y de bajo compromiso: proponer una plática corta (nunca "compra un seguro"). Si hay día/horario de preferencia, ofrécelo con naturalidad.
- Preséntate con tu nombre. Puedes usar 1 emoji como mucho, o ninguno.

Datos:
- Tu nombre: ${advisorFirst}${referral.advisor.companyName ? ` (${referral.advisor.companyName})` : ""}
- Referido: ${leadFirst}
- Quién lo refirió: ${referrerFirst}
- Le interesa: ${interes}
- Horario que prefiere: ${prefiere}

Devuelve SOLO el texto del mensaje, sin comillas ni explicación.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 180,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.error("[suggest-message] OpenAI", res.status, await res.text().catch(() => ""));
      return NextResponse.json({ message: fallback, ai: false });
    }
    const out = await res.json();
    const text = out?.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ message: fallback, ai: false });
    return NextResponse.json({ message: text.replace(/^["']|["']$/g, ""), ai: true });
  } catch (err) {
    console.error("[suggest-message] Error:", err);
    return NextResponse.json({ message: fallback, ai: false });
  }
}
