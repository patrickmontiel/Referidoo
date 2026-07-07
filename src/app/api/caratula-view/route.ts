import { NextRequest, NextResponse } from "next/server";
import { getAdvisorSession, isPlatformOwner } from "@/lib/auth";
import { fetchBlobAuthenticated } from "@/lib/blob";

// Visor de carátulas para el dueño: sirve el blob aunque el store sea
// privado. Solo URLs de Vercel Blob.
export async function GET(req: NextRequest) {
  const session = await getAdvisorSession();
  if (!session || !isPlatformOwner(session.email)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const src = req.nextUrl.searchParams.get("u");
  if (!src || !/^https:\/\/[a-z0-9-]+\.(public\.blob\.vercel-storage\.com|private\.blob\.vercel-storage\.com|blob\.vercel-storage\.com)\//.test(src)) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  const res = await fetchBlobAuthenticated(src);
  if (!res || !res.ok) {
    return NextResponse.json({ error: "No se pudo leer la carátula" }, { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
  });
}
