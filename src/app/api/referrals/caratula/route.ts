import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getAdvisorSession } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob";

// Sube la carátula de la póliza a Vercel Blob y devuelve la URL. La URL es
// pública pero no adivinable (sufijo aleatorio) — mismo modelo de seguridad
// que los tokens del portal.
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

export async function POST(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "Almacenamiento de carátulas no configurado" },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo de la carátula" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La carátula pesa más de 8 MB — comprime la foto" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Formato no soportado — usa foto (JPG/PNG) o PDF" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "caratula";
  const path = `caratulas/${session.advisorId}/${safeName}`;

  // El store puede ser público o privado (el de Patrick es privado): se
  // intenta público y se cae a privado — el visor /api/caratula-view y el
  // análisis IA saben leer ambos.
  let blob;
  try {
    blob = await put(path, file, { access: "public", addRandomSuffix: true });
  } catch {
    blob = await put(path, file, { access: "private", addRandomSuffix: true });
  }

  return NextResponse.json({ url: blob.url });
}
