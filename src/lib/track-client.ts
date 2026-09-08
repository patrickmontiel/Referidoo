"use client";

// Helper de tracking para el navegador. Reporta eventos del funnel a
// POST /api/events (el servidor deriva asesor/cliente desde el token o el
// referralCode, no confía en IDs del browser). Fire-and-forget, nunca lanza.
//
// Deduplicación por sesión: `once` guarda una marca en sessionStorage para no
// repetir el mismo evento en la misma pestaña (StrictMode, re-render, refresh).
// La usan referral_landing_viewed y referral_form_started (por carga de página).

type EventPayload = {
  token?: string;        // accessToken del portal /c/[token]
  code?: string;         // referralCode de /r/[code]
  clientId?: string;     // solo para portal_link_sent (asesor autenticado)
  channel?: "whatsapp" | "copy" | "email";
};

export function trackEvent(event: string, payload: EventPayload = {}): void {
  try {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload }),
      keepalive: true, // sobrevive a navegación (compartir abre WhatsApp/otra pestaña)
    }).catch(() => {});
  } catch {
    /* noop */
  }
}

// Como trackEvent pero solo una vez por sesión de pestaña, por `dedupeKey`.
export function trackEventOnce(dedupeKey: string, event: string, payload: EventPayload = {}): void {
  try {
    const k = `rf_evt_${dedupeKey}`;
    if (sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, "1");
  } catch {
    /* si sessionStorage no está disponible, igual mandamos una vez */
  }
  trackEvent(event, payload);
}
