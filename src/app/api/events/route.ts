import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdvisorSession } from "@/lib/auth";
import { isRateLimited, clientIp } from "@/lib/rate-limit";
import {
  CLIENT_REPORTABLE_EVENTS,
  normalizeChannel,
  trackProductEvent,
  trackProductEventOnce,
  type ProductEventName,
} from "@/lib/track";

// Endpoint de instrumentación para eventos disparados en el navegador.
// Whitelist ESTRICTA de eventos. El asesor/cliente se derivan en el servidor
// desde el token del portal, el referralCode, o la sesión autenticada — nunca
// se confía en un advisorId enviado por el browser. Payload pequeño; responde
// 204 (sin cuerpo) en éxito o no-op.
export async function POST(req: NextRequest) {
  // Rate limit generoso por IP (evita que se abuse del endpoint sin frenar el
  // uso legítimo del funnel).
  if (isRateLimited(`events:${clientIp(req)}`, 120, 60_000)) {
    return new NextResponse(null, { status: 429 });
  }

  let body: { event?: string; token?: string; code?: string; clientId?: string; channel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const event = body.event;
  if (!event || !CLIENT_REPORTABLE_EVENTS.has(event)) {
    return NextResponse.json({ error: "Evento no permitido" }, { status: 400 });
  }
  const channel = normalizeChannel(body.channel);

  try {
    // ── portal_link_sent: lo dispara el ASESOR autenticado desde su panel ──
    if (event === "portal_link_sent") {
      const session = await getAdvisorSession();
      if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      if (!body.clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 });
      // Validar que el cliente pertenece al asesor (no confiar en el browser).
      const client = await db.client.findFirst({
        where: { id: body.clientId, advisorId: session.advisorId },
        select: { id: true },
      });
      if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
      await trackProductEvent("portal_link_sent", { advisorId: session.advisorId, clientId: client.id, channel });
      return new NextResponse(null, { status: 204 });
    }

    // ── Eventos del PORTAL del cliente: se resuelven por el accessToken ──
    if (event === "client_portal_opened" || event === "referral_share_clicked") {
      if (!body.token) return NextResponse.json({ error: "token requerido" }, { status: 400 });
      const client = await db.client.findUnique({
        where: { accessToken: body.token },
        select: { id: true, advisorId: true },
      });
      if (!client) return new NextResponse(null, { status: 204 }); // token inválido → no-op silencioso
      if (event === "client_portal_opened") {
        // Solo la primera apertura por cliente (evita inflar por polling/refresh).
        await trackProductEventOnce("client_portal_opened", { clientId: client.id }, { advisorId: client.advisorId, clientId: client.id });
      } else {
        await trackProductEvent("referral_share_clicked", { advisorId: client.advisorId, clientId: client.id, channel });
      }
      return new NextResponse(null, { status: 204 });
    }

    // ── Eventos de la LANDING del referido: se resuelven por el referralCode ──
    if (event === "referral_landing_viewed" || event === "referral_form_started") {
      const code = body.code;
      if (!code) return NextResponse.json({ error: "code requerido" }, { status: 400 });
      const client = await db.client.findFirst({
        where: { OR: [{ referralCode: code }, { referralCode: code.toLowerCase() }] },
        select: { id: true, advisorId: true, referralCode: true },
      });
      if (!client) return new NextResponse(null, { status: 204 }); // code inválido → no-op silencioso
      await trackProductEvent(event as ProductEventName, {
        advisorId: client.advisorId,
        clientId: client.id,
        referralCode: client.referralCode,
      });
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json({ error: "Evento no permitido" }, { status: 400 });
  } catch (err) {
    console.error("[api/events] error", (err as Error)?.message);
    // Nunca romper por instrumentación.
    return new NextResponse(null, { status: 204 });
  }
}
