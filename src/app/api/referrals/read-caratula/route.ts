import { NextRequest, NextResponse } from "next/server";
import { getAdvisorSession } from "@/lib/auth";
import { readCaratula } from "@/lib/caratula-ai";

// Lee la carátula recién subida y devuelve producto + prima para PRE-LLENAR el
// formulario de conversión. El asesor solo confirma. Si la IA no puede leerla
// (sin key, PDF, foto ilegible), devuelve reading:null y el asesor teclea a mano.
export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { url } = await req.json();
  if (typeof url !== "string" || !url) {
    return NextResponse.json({ error: "Falta la URL de la carátula" }, { status: 400 });
  }

  try {
    const reading = await readCaratula(url);
    if (!reading || (!reading.prima && !reading.producto)) {
      return NextResponse.json({ reading: null });
    }
    return NextResponse.json({
      reading: {
        producto: reading.producto,
        prima: reading.confianza === "baja" ? null : reading.prima,
        confianza: reading.confianza,
      },
    });
  } catch (err) {
    console.error("[read-caratula] Error:", err);
    return NextResponse.json({ reading: null });
  }
}
