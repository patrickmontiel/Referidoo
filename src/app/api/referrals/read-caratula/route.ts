import { NextRequest, NextResponse } from "next/server";
import { getAdvisorSession } from "@/lib/auth";
import { readCaratula } from "@/lib/caratula-ai";
import { onCooldown } from "@/lib/rate-limit";

// Lee la carátula recién subida para PRE-LLENAR el formulario de conversión.
// Devuelve un status para que el cliente sepa qué hacer:
//   "ok"          → leyó producto/monto con confianza → se bloquea, el asesor confirma.
//   "unreadable"  → el servicio respondió pero la foto no se pudo leer → bloquear, pedir foto más clara.
//   "unavailable" → sin key / OpenAI caído / no se pudo bajar el blob → degradar a manual + revisión del dueño (NO bloquear).
export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (onCooldown(`read:${session.advisorId}`, 2500)) {
    return NextResponse.json({ status: "cooldown", error: "Espera un momento e intenta de nuevo." }, { status: 429 });
  }

  const { url } = await req.json();
  if (typeof url !== "string" || !url) {
    return NextResponse.json({ error: "Falta la URL de la carátula" }, { status: 400 });
  }

  try {
    const reading = await readCaratula(url);
    // null = el servicio no respondió / no hay key / no se pudo leer el blob.
    if (!reading) {
      return NextResponse.json({ status: "unavailable", reading: null });
    }
    const confident = reading.confianza !== "baja";
    const producto = confident ? reading.producto : null;
    const prima = confident ? reading.prima : null;
    if (!producto && !prima) {
      // El servicio SÍ respondió, pero no pudo leer con claridad → foto mala.
      return NextResponse.json({ status: "unreadable", reading: null });
    }
    return NextResponse.json({ status: "ok", reading: { producto, prima } });
  } catch (err) {
    console.error("[read-caratula] Error:", err);
    return NextResponse.json({ status: "unavailable", reading: null });
  }
}
