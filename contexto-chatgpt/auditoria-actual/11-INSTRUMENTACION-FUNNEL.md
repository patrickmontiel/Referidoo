# 11 · Instrumentación del funnel de activación

> Implementado en el scope acotado de sep-2026. Antes el funnel viral era **100% ciego** (ver `03`); ahora es observable. Este doc es la fuente de verdad de la instrumentación. `[CV]` = verificado en código/tests.

## El funnel que ahora se observa
```
client_created → portal_link_sent → client_portal_opened →
referral_share_clicked → referral_landing_viewed → referral_form_started → referral_created
```
Estrella polar de activación: **el asesor recibe su primer referido real proveniente de un cliente.**

## Modelo de datos — `ProductEvent` (`prisma/schema.prisma`)
```
id           String  @id @default(cuid())
event        String            // uno de los 7 nombres del funnel
advisorId    String?           // a qué asesor pertenece el paso
clientId     String?           // qué cliente (referidor) está involucrado
referralId   String?           // qué referral (solo en referral_created)
referralCode String?           // contexto de la landing (referral_landing_viewed/form_started)
channel      String?           // metadata: whatsapp | copy | email
createdAt    DateTime @default(now())
@@index([event]) @@index([advisorId]) @@index([clientId]) @@index([createdAt])
```
**Sin relaciones** a propósito: los eventos sobreviven a soft-deletes de Client/Referral (rastro del funnel). **Solo IDs internos** — nunca PII (nombres/teléfonos/correos ya viven en sus tablas), nunca `accessToken`, nunca contenido de formularios. Migración: `prisma/add-product-event.ts` (patrón Turso, no `migrate dev`).

## Los 7 eventos: semántica exacta
| Evento | Se dispara cuando… | Dónde (archivo) | Lado | Qué NO significa |
|---|---|---|---|---|
| **client_created** | el asesor crea un cliente (create exitoso) | `api/clients/route.ts` (server) | server | que se le haya enviado el link |
| **portal_link_sent** | el asesor **acciona** enviar/copiar el link del portal | WhatsApp/Copiar en `ClientesClient.tsx` (channel whatsapp/copy) + envío masivo Pro en `api/clients/send-links` (channel email) | mixto | que el cliente lo haya recibido/abierto |
| **client_portal_opened** | primera apertura del portal `/c/[token]` | `ClientPortalPage.tsx` → `/api/events` | client | cada visita (deduplicado a la 1ª) |
| **referral_share_clicked** | el cliente **pulsa** compartir en su portal | `ClientPortalPage.tsx` (copyLink/shareWhatsApp) → `/api/events` | client | que lo haya enviado efectivamente |
| **referral_landing_viewed** | alguien abre `/r/[code]` (code válido) | `ReferralLandingPage.tsx` mount → `/api/events` | client | un lead único (puede haber varias vistas por share) |
| **referral_form_started** | el visitante escribe el 1er carácter en un campo | `ReferralLandingPage.tsx` onChange → `/api/events` | client | que haya enviado el formulario |
| **referral_created** | `POST /api/referrals` crea el Referral | `api/referrals/route.ts` (server) | server | — (ligado a `referralId`) |

**Nombres honestos:** `*_sent`/`*_share_clicked` reflejan **intención de envío/click**, no entrega. No hay forma de saber si un mensaje se envió de verdad desde WhatsApp — por eso no se llama "shared successfully".

## API / helpers
- **`src/lib/track.ts` (server):** `trackProductEvent(event, ctx)` — best-effort, nunca lanza (try/catch). `trackProductEventOnce(event, unique, ctx)` — inserta solo si no existe ya (para "primera vez"). Exporta `CLIENT_REPORTABLE_EVENTS` (whitelist) y `normalizeChannel`.
- **`src/lib/track-client.ts` (browser):** `trackEvent(event, payload)` (fetch keepalive, nunca lanza) y `trackEventOnce(dedupeKey, event, payload)` (dedup por sesión vía sessionStorage).
- **`POST /api/events` (`api/events/route.ts`):** endpoint para eventos del navegador. **Whitelist estricta** (solo los 5 client-side; `client_created`/`referral_created` son server-only → 400 si se intentan). **Deriva asesor/cliente en el SERVIDOR** desde el `token` del portal, el `referralCode`, o la sesión autenticada — **nunca confía en un advisorId del browser**. Rate limit 120/min por IP. Responde 204.
  - `portal_link_sent`: requiere sesión de asesor + `clientId` (valida ownership → 404 si es ajeno).
  - `client_portal_opened` / `referral_share_clicked`: por `token` (accessToken) → resuelve Client.
  - `referral_landing_viewed` / `referral_form_started`: por `code` (referralCode) → resuelve Client.
- **`src/lib/activation-funnel.ts`:** agregación pura (`aggregateFunnel`, `perAdvisorFunnel`) usada por el owner y testeada.

## Deduplicación (cómo se evita el ruido)
| Evento | Estrategia |
|---|---|
| client_created / referral_created | server-side, una vez por acción de create (ligados a la entidad) |
| client_portal_opened | `trackProductEventOnce` por `clientId` (1ª apertura de por vida) + ref-guard cliente por carga; el **polling de 30s NO re-monta** → no repite |
| referral_landing_viewed / referral_form_started | `trackEventOnce` por sesión de pestaña (sessionStorage) + `useRef` → StrictMode/refresh no inflan |
| portal_link_sent / referral_share_clicked | por click (intención) — se permite repetir; el `channel` distingue whatsapp/copy/email |

## Owner — cockpit de activación (`/owner/activacion`)
Página server owner-only. Selector de periodo (30/90/todo). Muestra:
- **Funnel agregado**: conteo por paso + conversión desde el paso anterior **solo donde el denominador aplica limpio** (apertura/cliente, forma/vista, referido/forma); en los demás muestra conteo (una acción de envío puede repetirse por cliente; una vista de landing puede venir de varios shares).
- **Por asesor**: tabla con el conteo de cada paso por asesor (detecta "creó 4 clientes, mandó 3 links, 0 abrieron").
- **Drilldown/timeline**: al abrir una fila, `GET /api/owner/activation/timeline?advisorId=` lista la actividad reciente con nombres de cliente/lead, canal y hora.

## Métricas derivadas disponibles (con los datos nuevos)
% clientes con portal abierto, % share/portal, % landing→form, % form→referido, y con timestamps: time client_created→1ª apertura, apertura→1er share, share→1ª landing, landing→referido. (Cohortes de retención: NO todavía, fuera de scope.)

## Privacidad de la instrumentación
- No IP, no user-agent, no fingerprinting, no cookies de terceros, no contenido de formularios en `ProductEvent`.
- Solo IDs internos ya existentes; el `channel` es un enum corto.
- El endpoint deriva la identidad server-side (no expone ni confía en tokens/IDs del browser); el `accessToken` se usa para resolver, nunca se guarda.

## Limitaciones conocidas
- **Dedup no atómico** (`findFirst`+`create` en `trackProductEventOnce`): a esta escala una carrera solo produciría 2 filas y el owner usa el primer evento; impacto nulo. Sin unique constraint porque la tabla mezcla eventos "una vez" con eventos "por click".
- **Rate limit en memoria** (mismo caveat que el resto: no distribuido; a escala requiere Upstash/DB).
- **portal_link_sent = intención**, no entrega; `referral_share_clicked` = click, no envío efectivo.
- La instrumentación es **best-effort**: si un evento falla, se loguea y el flujo de negocio sigue intacto.

## Verificación
- **196 tests verdes** (33 archivos). Nuevos: `events/route.test.ts` (whitelist + atribución derivada en servidor + dedupe), `activation-funnel.test.ts` (agregación + segregación por asesor), `rate-limit.test.ts`, `limits.test.ts`, `login-rate-limit.test.ts` (429), `login/page.test.tsx` (password no viene de query).
- **Visual**: `screenshots-post-funnel/` — funnel agregado, tabla por asesor, timeline (drilldown), perfil corregido (/5), aviso de privacidad corregido. (El funnel del screenshot se pobló con eventos sembrados en dev.db por flakiness del walk headless; la instrumentación en sí queda verificada por los tests y el wiring, y la página owner renderiza contra el cliente Prisma vivo.)
