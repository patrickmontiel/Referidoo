import { db } from "@/lib/db";

// Análisis automático de carátulas: lee la imagen con visión de OpenAI,
// extrae la prima anual y la compara contra el monto reportado por el asesor.
// Coincide (±25%) → "validada"; no coincide → "discrepancia" (cola del dueño).
// Si no puede leerla (PDF, foto ilegible, sin API key) queda "pendiente" y la
// valida Patrick a ojo. Nunca truena el flujo de conversión: corre post-
// respuesta vía after() y atrapa todos sus errores.
const TOLERANCE = 0.25;

async function fetchBlobAsDataUrl(url: string): Promise<string | null> {
  // Store público responde directo; store privado requiere el token RW.
  let res = await fetch(url).catch(() => null);
  if (!res || !res.ok) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
    res = await fetch(url, {
      headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    }).catch(() => null);
  }
  if (!res || !res.ok) return null;
  const type = res.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) return null; // PDF: validación manual
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) return null;
  return `data:${type};base64,${buf.toString("base64")}`;
}

export async function analyzeCaratula(params: {
  referralId: string;
  caratulaUrl: string;
  saleAmount: number;
  productType: string | null;
}) {
  try {
    if (!process.env.OPENAI_API_KEY) return;

    const dataUrl = await fetchBlobAsDataUrl(params.caratulaUrl);
    if (!dataUrl) return; // queda "pendiente" para revisión manual

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Eres validador de carátulas de pólizas de seguros mexicanas. Extrae de la imagen la PRIMA TOTAL ANUAL (o prima total del recibo si es la única visible), como número en la moneda indicada. Producto esperado: ${params.productType ?? "desconocido"}. Responde SOLO JSON: {"prima": number | null, "moneda": "MXN" | "USD" | null, "confianza": "alta" | "baja"}. Si no puedes leer una prima con claridad, prima=null.`,
              },
              { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      console.error("[caratula-ai] OpenAI respondió", res.status, await res.text().catch(() => ""));
      return;
    }
    const out = await res.json();
    const parsed = JSON.parse(out?.choices?.[0]?.message?.content ?? "{}");
    const prima = typeof parsed.prima === "number" && parsed.prima > 0 ? parsed.prima : null;
    if (!prima || parsed.confianza === "baja" || (parsed.moneda && parsed.moneda !== "MXN")) {
      console.log(`[caratula-ai] ${params.referralId}: sin lectura confiable — queda pendiente (manual)`);
      return;
    }

    const ratio = params.saleAmount / prima;
    const match = ratio >= 1 - TOLERANCE && ratio <= 1 + TOLERANCE;
    await db.referral.update({
      where: { id: params.referralId },
      data: { caratulaStatus: match ? "validada" : "discrepancia" },
    });
    console.log(
      `[caratula-ai] ${params.referralId}: prima leída $${prima.toLocaleString("es-MX")} vs reportado $${params.saleAmount.toLocaleString("es-MX")} → ${match ? "validada" : "DISCREPANCIA"}`
    );
  } catch (err) {
    console.error("[caratula-ai] Error analizando carátula:", err);
  }
}
