import { db } from "@/lib/db";
import { fetchBlobAuthenticated } from "@/lib/blob";

// Análisis automático de carátulas: lee la imagen con visión de OpenAI y
// verifica DOS cosas contra lo que reportó el asesor:
//   1) Monto — extrae la prima anual, coincide ±25%.
//   2) Producto — clasifica el ramo de la póliza (GMM/Vida/PPR/Daños-Auto) y
//      lo compara con el que el asesor dijo haber vendido.
// Ambos coinciden → "validada". Cualquiera falla → "discrepancia" (cola del
// dueño). Ilegible/PDF/sin API key → "pendiente" (revisión manual de Patrick).
// Nunca truena la conversión: corre post-respuesta vía after() y atrapa errores.
const TOLERANCE = 0.25;

// Familias de producto tratadas como equivalentes para el match de ramo — el
// asesor usa el vocabulario PPR/Vida/GMM/Daños-Auto/Otro; "Otro" no se valida.
function productFamily(p: string | null | undefined): string | null {
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
                text: `Eres validador de carátulas de pólizas de seguros mexicanas. De la imagen extrae DOS cosas:
1) La PRIMA TOTAL ANUAL (o prima total del recibo si es la única visible), como número en la moneda indicada.
2) El RAMO/PRODUCTO de la póliza, clasificándolo EXACTAMENTE en una de: "GMM" (gastos médicos mayores/salud), "Vida" (seguro de vida, incluye vida con inversión/dotal), "PPR" (plan personal de retiro/ahorro/retiro), "Daños/Auto" (auto, hogar, daños), "Otro".
El asesor reportó que vendió: ${params.productType ?? "desconocido"}.
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
      return;
    }
    const out = await res.json();
    const parsed = JSON.parse(out?.choices?.[0]?.message?.content ?? "{}");
    const prima = typeof parsed.prima === "number" && parsed.prima > 0 ? parsed.prima : null;

    // Verificación de PRODUCTO: si la IA leyó un ramo con claridad y NO cuadra
    // con el que el asesor reportó, es discrepancia aunque el monto cuadre — un
    // seguro de auto no puede pasar como un plan de retiro. "Otro"/ilegible no
    // se penaliza (demasiado ambiguo).
    const expectedFam = productFamily(params.productType);
    const readFam = productFamily(parsed.producto);
    const productMismatch =
      parsed.confianza !== "baja" &&
      !!expectedFam && expectedFam !== "Otro" &&
      !!readFam && readFam !== "Otro" &&
      expectedFam !== readFam;

    // Si el producto claramente no coincide, es discrepancia de inmediato
    // (sin depender de poder leer la prima).
    if (productMismatch) {
      await db.referral.update({ where: { id: params.referralId }, data: { caratulaStatus: "discrepancia" } });
      console.log(`[caratula-ai] ${params.referralId}: PRODUCTO no coincide — reportó "${params.productType}" pero la póliza es "${parsed.producto}" → DISCREPANCIA`);
      return;
    }

    if (!prima || parsed.confianza === "baja" || (parsed.moneda && parsed.moneda !== "MXN")) {
      console.log(`[caratula-ai] ${params.referralId}: sin lectura confiable de prima — queda pendiente (manual)`);
      return;
    }

    const ratio = params.saleAmount / prima;
    const amountMatch = ratio >= 1 - TOLERANCE && ratio <= 1 + TOLERANCE;
    await db.referral.update({
      where: { id: params.referralId },
      data: { caratulaStatus: amountMatch ? "validada" : "discrepancia" },
    });
    console.log(
      `[caratula-ai] ${params.referralId}: prima leída $${prima.toLocaleString("es-MX")} vs reportado $${params.saleAmount.toLocaleString("es-MX")} · producto ${readFam ?? "?"}/${expectedFam ?? "?"} → ${amountMatch ? "validada" : "DISCREPANCIA (monto)"}`
    );
  } catch (err) {
    console.error("[caratula-ai] Error analizando carátula:", err);
  }
}
