import { get } from "@vercel/blob";

// El SDK acepta dos formas de credenciales: el token estático
// BLOB_READ_WRITE_TOKEN, o (si no está) autenticación OIDC automática usando
// BLOB_STORE_ID + el token que Vercel inyecta en runtime. Cualquiera de los
// dos basta para que las carátulas funcionen.
export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

// Lee un blob por URL: fetch directo (store público) y si falla, el SDK con
// access:"private" — que resuelve token estático u OIDC internamente sin que
// tengamos que saber cuál está disponible.
export async function fetchBlobAuthenticated(url: string): Promise<Response | null> {
  const direct = await fetch(url).catch(() => null);
  if (direct?.ok) return direct;

  try {
    const result = await get(url, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream, {
      headers: { "content-type": result.blob.contentType },
    });
  } catch {
    return null;
  }
}
