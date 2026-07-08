// Briefing en texto plano para el dueño de la plataforma: sintetiza los
// "problemas operativos" ya calculados (morosidad, fraude, cobros
// rechazados, leads sin seguimiento) en 2-4 oraciones priorizadas, en vez de
// solo mostrar la lista cruda. Nunca bloquea la carga de /owner: si falla o
// no hay API key, regresa null y la tarjeta simplemente no se muestra.

// Decisión explícita de Patrick (jul 2026): con pocos asesores no vale la
// pena regenerar en cada carga de página — cada 2 semanas por ahora.
// Bajar este intervalo conforme crezca la base de asesores reales, hasta
// llegar a "cada carga" cuando haya suficiente volumen para que valga la
// pena leer un briefing siempre fresco.
export const NARRATIVE_REFRESH_MS = 14 * 24 * 60 * 60 * 1000;

type Problem = { id: string; title: string; detail: string };

export async function generateOwnerNarrative(params: {
  problems: Problem[];
  proCount: number;
  activeCount: number;
  mrr: number;
  commissionTotal: number;
  conversionsCount: number;
}): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const { problems, proCount, activeCount, mrr, commissionTotal, conversionsCount } = params;
    const problemsText = problems.length
      ? problems.map((p) => `- ${p.title}: ${p.detail}`).join("\n")
      : "Sin problemas operativos detectados.";

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 220,
        messages: [
          {
            role: "user",
            content: `Eres el analista de operaciones de Referidoo, una plataforma de referidos para asesores de seguros independientes en México. Con los datos de abajo, escribe un briefing de 2 a 4 oraciones en español de México, en segunda persona, dirigido al dueño de la plataforma.

Prioriza lo más urgente primero (dinero o reputación en riesgo: morosidad, fraude, cobros rechazados) antes que lo cosmético (cuentas duplicadas, leads inactivos). Sé concreto — usa nombres y montos si aparecen en los datos. Nunca inventes urgencia si no hay problemas reales; en ese caso sé breve y directo, sin relleno. No uses saludos, no cierres con frases tipo "espero que esto ayude" — ve directo al punto, como un socio que te está poniendo al tanto, no un reporte corporativo.

Estado actual:
- ${activeCount} asesores activos (${proCount} en plan Pro)
- MRR: $${mrr.toLocaleString("es-MX")} MXN
- Este mes: ${conversionsCount} conversión${conversionsCount !== 1 ? "es" : ""}, $${commissionTotal.toLocaleString("es-MX")} MXN de comisión

Problemas operativos detectados:
${problemsText}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[owner-narrative] OpenAI respondió", res.status, await res.text().catch(() => ""));
      return null;
    }

    const out = await res.json();
    const text = out?.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (err) {
    console.error("[owner-narrative] Error generando briefing:", err);
    return null;
  }
}
