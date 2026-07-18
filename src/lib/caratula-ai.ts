import { db } from "@/lib/db";
import { fetchBlobAuthenticated } from "@/lib/blob";

// Lectura de carátulas con visión de OpenAI. Se usa en dos lugares:
//   1) analyzeCaratula (post-conversión, antifraude): compara lo leído contra
//      lo que reportó el asesor → validada / discrepancia / pendiente.
//   2) readCaratula (al subir, pre-llenado): devuelve producto + prima para que
//      el asesor no teclee nada, solo confirme.
// Ilegible / PDF / sin API key → devuelve null (no truena nada).
const TOLERANCE = 0.25;

export type CaratulaReading = {
  prima: number | null;
  producto: string | null; // canónico: PPR / Vida / GMM / Daños/Auto / Otro
  moneda: string | null;
  confianza: "alta" | "baja" | null;
};

// Familias de producto tratadas como equivalentes — el asesor usa el vocabulario
// PPR/Vida/GMM/Daños-Auto/Otro; "Otro" no se valida.
export function productFamily(p: string | null | undefined): string | null {
  if (!p) return null;
  const s = p.toLowerCase();
  if (s.includes("gmm") || s.includes("médic") || s.includes("medic") || s.includes("salud")) return "GMM";
  if (s.includes("ppr") || s.includes("retiro") || s.includes("ahorro")) return "PPR";
  if (s.includes("vida")) return "Vida";
  if (s.includes("auto") || s.includes("daño") || s.includes("dano") || s.includes("hogar") || s.includes("casa")) return "Daños/Auto";
  if (s.includes("otro")) return "Otro";
  return null;
}

async function fetchBlobAsDataUrl(url: string): Promise<string | null> {
  const res = await fetchBlobAuthenticated(url);
  if (!res || !res.ok) return null;
  const type = res.headers.get("content-type") ?? "image/jpeg";
  if (!type.startsWith("image/")) return null; // PDF: validación manual
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 15 * 1024 * 1024) return null;
  return `data:${type};base64,${buf.toString("base64")}`;
}

// Núcleo reutilizable: lee la carátula con OpenAI Vision. Devuelve la prima y el
// ramo canónico, o null si no hay key / no es imagen / no se puede leer.
export async function readCaratula(caratulaUrl: string): Promise<CaratulaReading | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const dataUrl = await fetchBlobAsDataUrl(caratulaUrl);
  if (!dataUrl) return null;

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
              text: `Eres lector de carátulas de pólizas de seguros mexicanas. De la imagen extrae DOS cosas:
1) La PRIMA TOTAL ANUAL (o prima total del recibo si es la única visible), como número en la moneda indicada.
2) El RAMO/PRODUCTO de la póliza, clasificándolo EXACTAMENTE en una de: "GMM" (gastos médicos mayores/salud), "Vida" (seguro de vida, incluye vida con inversión/dotal), "PPR" (plan personal de retiro/ahorro/retiro), "Daños/Auto" (auto, hogar, daños), "Otro".
Responde SOLO JSON: {"prima": number | null, "moneda": "MXN" | "USD" | null, "producto": "GMM" | "Vida" | "PPR" | "Daños/Auto" | "Otro" | null, "confianza": "alta" | "baja"}. Si no puedes leer algo con claridad, usa null en ese campo.`,
            },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    console.error("[caratula-ai] OpenAI respondió", res.status, await res.text().catch(() => ""));
    return null;
  }
  const out = await res.json();
  const parsed = JSON.parse(out?.choices?.[0]?.message?.content ?? "{}");
  const prima = typeof parsed.prima === "number" && parsed.prima > 0 ? parsed.prima : null;
  return {
    prima,
    producto: productFamily(parsed.producto),
    moneda: typeof parsed.moneda === "string" ? parsed.moneda : null,
    confianza: parsed.confianza === "alta" || parsed.confianza === "baja" ? parsed.confianza : null,
  };
}

// Verificación antifraude post-conversión: lee la carátula y la compara contra
// lo que reportó el asesor. Nunca truena la conversión (corre en after()).
export async function analyzeCaratula(params: {
  referralId: string;
  caratulaUrl: string;
  saleAmount: number;
  productType: string | null;
  reading?: CaratulaReading | null; // A2: si ya se leyó al pre-llenar, se reusa (no re-llama a OpenAI)
}) {
  try {
    const reading = params.reading ?? (await readCaratula(params.caratulaUrl));
    if (!reading) return; // sin key / ilegible / PDF → queda "pendiente"

    // Verificación de PRODUCTO: si la IA leyó un ramo con claridad y NO cuadra
    // con el reportado, es discrepancia aunque el monto cuadre. "Otro"/ilegible
    // no se penaliza (demasiado ambiguo).
    const expectedFam = productFamily(params.productType);
    const readFam = reading.producto;
    const productMismatch =
      reading.confianza !== "baja" &&
      !!expectedFam && expectedFam !== "Otro" &&
      !!readFam && readFam !== "Otro" &&
      expectedFam !== readFam;

    if (productMismatch) {
      await db.referral.update({ where: { id: params.referralId }, data: { caratulaStatus: "discrepancia" } });
      console.log(`[caratula-ai] ${params.referralId}: PRODUCTO no coincide — reportó "${params.productType}" pero la póliza es "${readFam}" → DISCREPANCIA`);
      return;
    }

    if (!reading.prima || reading.confianza === "baja" || (reading.moneda && reading.moneda !== "MXN")) {
      console.log(`[caratula-ai] ${params.referralId}: sin lectura confiable de prima — queda pendiente (manual)`);
      return;
    }

    const ratio = params.saleAmount / reading.prima;
    const amountMatch = ratio >= 1 - TOLERANCE && ratio <= 1 + TOLERANCE;
    await db.referral.update({
      where: { id: params.referralId },
      data: { caratulaStatus: amountMatch ? "validada" : "discrepancia" },
    });
    console.log(
      `[caratula-ai] ${params.referralId}: prima leída $${reading.prima.toLocaleString("es-MX")} vs reportado $${params.saleAmount.toLocaleString("es-MX")} · producto ${readFam ?? "?"}/${expectedFam ?? "?"} → ${amountMatch ? "validada" : "DISCREPANCIA (monto)"}`
    );
  } catch (err) {
    console.error("[caratula-ai] Error analizando carátula:", err);
  }
}
