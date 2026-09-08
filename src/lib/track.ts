import { db } from "./db";

// Instrumentación del funnel de activación de dos lados. Un solo helper para no
// duplicar lógica. NUNCA guarda PII (nombres/teléfonos/correos ya viven en sus
// tablas), ni accessToken, ni contenido de formularios — solo IDs internos +
// un `channel` opcional (whatsapp | copy | email). Es best-effort: si falla,
// loguea y sigue, jamás rompe el flujo de negocio.

export const PRODUCT_EVENTS = [
  "client_created",
  "portal_link_sent",
  "client_portal_opened",
  "referral_share_clicked",
  "referral_landing_viewed",
  "referral_form_started",
  "referral_created",
] as const;

export type ProductEventName = (typeof PRODUCT_EVENTS)[number];

// Eventos que un cliente (browser) puede reportar vía POST /api/events. Los
// demás (client_created, referral_created) son solo server-side.
export const CLIENT_REPORTABLE_EVENTS: ReadonlySet<string> = new Set([
  "portal_link_sent",
  "client_portal_opened",
  "referral_share_clicked",
  "referral_landing_viewed",
  "referral_form_started",
]);

const ALLOWED_CHANNELS = new Set(["whatsapp", "copy", "email"]);
export function normalizeChannel(v: unknown): string | null {
  return typeof v === "string" && ALLOWED_CHANNELS.has(v) ? v : null;
}

type EventCtx = {
  advisorId?: string | null;
  clientId?: string | null;
  referralId?: string | null;
  referralCode?: string | null;
  channel?: string | null;
};

export async function trackProductEvent(event: ProductEventName, ctx: EventCtx = {}): Promise<void> {
  try {
    await db.productEvent.create({
      data: {
        event,
        advisorId: ctx.advisorId ?? null,
        clientId: ctx.clientId ?? null,
        referralId: ctx.referralId ?? null,
        referralCode: ctx.referralCode ?? null,
        channel: ctx.channel ?? null,
      },
    });
  } catch (err) {
    console.error("[track] no se pudo registrar", event, (err as Error)?.message);
  }
}

// Registra el evento SOLO si aún no existe uno igual para la entidad dada.
// Para eventos "primera vez" (p. ej. client_portal_opened: una apertura por
// cliente). No es atómico (findFirst + create): a esta escala una carrera solo
// produciría 2 filas y el Owner usa el primer evento (min createdAt), así que
// el impacto es nulo. Devuelve true si registró, false si ya existía.
export async function trackProductEventOnce(
  event: ProductEventName,
  unique: { clientId?: string; referralId?: string; advisorId?: string },
  ctx: EventCtx = {}
): Promise<boolean> {
  try {
    const existing = await db.productEvent.findFirst({
      where: { event, ...unique },
      select: { id: true },
    });
    if (existing) return false;
    await trackProductEvent(event, ctx);
    return true;
  } catch (err) {
    console.error("[track] once falló", event, (err as Error)?.message);
    return false;
  }
}
