# 08 · Portfolio Activation Campaigns (V1)

> **Tesis de la fase (cambio):** un asesor puede **activar su cartera existente una vez** y convertir una fracción de sus clientes satisfechos en un **canal recurrente de referidos**. La unidad de experimento pasa a ser la **Portfolio Activation Campaign**; cada `Client` sigue siendo la unidad diagnóstica **dentro** de la campaña.
>
> Estado: **construido SOLO en local** (sin push, sin Turso prod). Snapshot 2026-09-10.

## Principio de reuso (REUTILIZAR > DUPLICAR)
No se crea otro importador, otro portal, otro sistema de referidos ni otro tracking. Se **reutiliza** todo lo existente:

| Necesidad | Se reutiliza |
|---|---|
| Importar cartera | `POST /api/clients/import` (CSV, ya existe) |
| Envío por email | `sendClientLinkEmail` + patrón secuencial idempotente de `send-links` |
| Personalización | `renderMessage` (`lib/message-templates.ts`, placeholders `{nombre}{link}{asesor}`) |
| Portal por recipient | `Client.accessToken` → `/c/[token]` (ya único por cliente) |
| Link de referido | `Client.referralCode` → `/r/[code]` |
| Comportamiento | `ProductEvent` + `/api/events` + `lib/track.ts` (whitelist, atribución server-side, dedup) |
| Cockpit dueño | `/owner/activacion` (se extiende, no se duplica) |

**Solo se AÑADE:** dos modelos operativos (`ReferralCampaign`, `CampaignRecipient`), dos campos a `ProductEvent`, y la lógica de atribución de campaña. Nada de lo anterior se reemplaza.

## Data model (V1)
```prisma
model ReferralCampaign {
  id              String   @id @default(cuid())
  advisorId       String
  name            String
  messageTemplate String
  channel         String              // "email" | "whatsapp"
  status          String   @default("draft")   // draft | sending | sent
  createdAt       DateTime @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  @@index([advisorId])
}

model CampaignRecipient {
  id          String   @id @default(cuid())   // ← ID OPACO usado en los links (?cr=)
  campaignId  String
  clientId    String
  advisorId   String                          // denormalizado: validación + query rápida
  status      String   @default("pending")    // pending | contacted | failed
  stage       String   @default("initial")    // initial | reminder_1 | reminder_2 (FUTURO, no se envía)
  channel     String?
  error       String?
  createdAt   DateTime @default(now())
  contactedAt DateTime?
  @@unique([campaignId, clientId])            // un cliente aparece una sola vez por campaña
  @@index([campaignId]) @@index([clientId]) @@index([advisorId])
}

// ADITIVO a ProductEvent:
campaignId          String?
campaignRecipientId String?
@@index([campaignId])
```

**Decisión — SIN relaciones Prisma (solo IDs string + índices):** igual que `ProductEvent`, estos modelos guardan `advisorId/clientId/campaignId` como strings sin `@relation`/FK. Motivo: (1) consistencia con el patrón Turso del repo (migraciones `add-*.ts` con `CREATE TABLE`, sin FKs), (2) robustez ante soft-delete/desactivación de `Client` (un recipient sobrevive aunque el cliente cambie de estado — rastro del experimento), (3) la migración queda estrictamente aditiva y simple. El costo (integridad referencial no forzada por DB) es aceptable a esta escala y se cubre validando en el servidor.

## Atribución de campaña (lo crítico)
**No** se atribuye por `clientId + fechas` (un cliente puede estar en varias campañas). Se usa **atribución explícita por ID opaco**:

1. El link del portal que se envía en la campaña lleva el ID opaco del recipient:
   `/c/[token]?cr=<campaignRecipientId>`
2. Cuando el cliente **comparte** desde su portal, la atribución se **propaga** al link de referido:
   `/r/[code]?cr=<campaignRecipientId>`
3. **El servidor deriva y valida TODO** (nunca confía en un `campaignId` del browser). Cadena:
   `cr → CampaignRecipient → (clientId, campaignId, advisorId)`
   y se exige coherencia: el `clientId` del recipient debe **coincidir** con el `Client` resuelto por el `token` (portal) o el `referralCode` (landing/referral). Si no coinciden, se **ignora** el `cr` y el evento se registra **sin** campaña (jamás se atribuye cruzado).
4. Eventos que se etiquetan con `campaignId`/`campaignRecipientId` cuando el `cr` es válido:
   `client_portal_opened`, `referral_share_clicked`, `referral_landing_viewed`, `referral_form_started`, `referral_created`.
   `portal_link_sent` se etiqueta en el **momento del envío/acción** de la campaña (server-side, con el recipient real).

**Reglas de seguridad (validadas en servidor, cubiertas por tests):**
- No se acepta `campaignId` arbitrario del browser — solo `cr`, que se resuelve server-side.
- Un `cr` de otro cliente (recipient.clientId ≠ client resuelto) → se ignora (no cross-attribution).
- Un `cr` de otro asesor → se ignora.
- `campaignRecipientId` inexistente → se ignora (evento sin campaña, nunca error).

## Transport layer (honestidad técnica)
- **EMAIL — automático real.** Reutiliza Resend (`sendClientLinkEmail`). Idempotente (solo envía a recipients `pending`), secuencial con try/catch por recipient; marca `contactedAt` **solo si Resend responde ok**; si falla → `status=failed` + `error`. Dispara `portal_link_sent` (channel=email, con campaign tags). Esto **sí** es "Enviados".
- **WHATSAPP — ASSISTED (no automático).** **No existe** integración oficial (Meta/Twilio) en el repo — solo `wa.me`. Por lo tanto NO se auto-envía, NO se usa automation/Puppeteer/scraping. La campaña de WhatsApp produce una **cola**: el asesor abre el `wa.me` prellenado de cada recipient; el clic dispara `portal_link_sent` (channel=whatsapp) + marca `contactedAt` como **acción**, no entrega. En analítica se llama **"Acciones de envío"**, nunca "Enviados"/"Entregados"/"Leídos". La arquitectura permite añadir `WhatsAppBusinessTransport` después (ver `07-WHATSAPP-CAMPAIGNS.md`). Detalle de feasibility oficial en ese doc.

## Métricas (fórmulas — hipótesis, NO targets demostrados)
> Hipótesis de trabajo: ~10% de los contactados podrían volverse **productive referrers** (cliente que genera ≥1 referral real). **10% NO es un umbral de éxito demostrado.**

- **Productive Referrer Rate** = `unique recipients con ≥1 referral_created / recipients contactados`
- **Lead Yield** = `total referral_created (de la campaña) / recipients contactados`
- **Referral Multiplier** = `total referral_created / productive referrers` (guard ÷0 → 0)

Semántica honesta en toda la UI:
- **Contacted** solo si hubo envío automático aceptado por el provider (email). En WhatsApp assisted = **"acciones de envío"**.
- **Share action** = clic en compartir (NO entrega comprobada).
- **Landing views** = visitas (NO personas únicas).
- Opens/shares/productive referrers se cuentan **únicos por recipient**; landing views y form starts son conteos brutos.

## UX — "Activar mi cartera"
Se siente simple (no "Campaign Manager"). CTA **"Activar mi cartera"** en `/admin/clientes` → wizard `/admin/campanas/nueva`:
1. Seleccionar clientes (Todos / manual). Si hace falta, importar CSV primero (reusa el importador existente).
2. "N clientes seleccionados".
3. Elegir canal disponible (Email si el asesor tiene remitente; WhatsApp assisted siempre).
4. Escribir mensaje común (vars `{nombre}{link}{asesor}`).
5. **Preview personalizado** (obligatorio, con el 1er recipient).
6. Confirmación.
7. Ejecutar (email → envío real; whatsapp → cola de acciones).
8. Ver resultados (`/admin/campanas/[id]`).

Sin scheduling, sin secuencias, sin segmentación avanzada, sin IA, sin A/B.

## Analítica (advisor + owner)
- **Advisor** (`/admin/campanas/[id]`): audience, contacted/acciones, opens únicos, clientes con share, landing views, form starts, referrals, productive referrers + las 3 tasas.
- **Owner** (`/owner/activacion`, sección nueva): tabla de campañas (Campaign · Advisor · Audience · Contacted/acciones · Opens · Shares · Productive referrers · Referrals · Referrer Rate · Lead Yield) + drilldown Campaign → Clients (Ana: action ✅ open ✅ share ✅ 3 referrals / Luis: action ✅ open ✅ share ❌ 0).

## Import de cartera
Se reutiliza `POST /api/clients/import` (CSV). **Limitación documentada:** el importador acepta `email` opcional, pero el **canal Email** solo puede contactar a clientes **con email**; los clientes sin email quedan disponibles solo para **WhatsApp assisted** (que además necesita `phone`). No se cambia el schema de `Client` por esto.

## Recordatorios (FUTURO, no se construye)
`CampaignRecipient.stage` (`initial|reminder_1|reminder_2`) deja lugar para reintentos, pero **no hay reminders automáticos** en V1. No es un workflow engine.

## Pricing (NO se decide)
No se toca `$539`/Free/Pro/comisiones/cap de 5 leads. **No se decide** si Campaigns es Pro. Durante Ceci se valida valor; el pricing viene después. En V1 el envío de campaña **no** se gatea por Pro (para poder validar) — decisión de gating diferida.

## Migración (local, aditiva)
`prisma/add-referral-campaigns.ts` — `CREATE TABLE IF NOT EXISTS ReferralCampaign` + `CampaignRecipient` (con unique `(campaignId, clientId)` + índices) y `ALTER TABLE ProductEvent ADD COLUMN campaignId/campaignRecipientId` + índice. **Estrictamente aditivo** (no DROP/DELETE/recreación). Aplicada SOLO a `dev.db` local. Para Turso prod: la corre Patrick (mismo patrón que `add-product-event.ts`).

## Verificación
- **Tests (vitest):** `campaign-metrics.test.ts` (fórmulas — incluye el ejemplo 40/5/11 → 12.5% / 0.275 / 2.2; uniqueness opens/shares; ÷0 → null), `campaign.test.ts` (atribución `resolveCampaignAttribution`: válida / cross-cliente ignorada / inexistente; `createCampaign`: ownership + dedupe), y en `events/route.test.ts` (cr válido adjunta campaña / cr de otro cliente se ignora). Suite completa verde.
- **E2E local (endpoints reales, sin seedear métricas):** asesor QA → 10 clients → campaña WhatsApp → 7 acciones (action endpoint) → 5 opens + 3 shares (`/api/events` con `cr`) → 4 referrals de 2 recipients (`/api/referrals` con `cr`). El endpoint real `/api/campaigns/[id]` devolvió: audience 10, contacted 7, opens 5, shares 3, referrals 4, productive referrers 2, **Productive Referrer Rate 28.6%**, **Lead Yield 0.571**, **Referral Multiplier 2** — los 9 asserts en verde.
- **Screenshots** (`screenshots-campaigns/`): 01-activar-cartera, 02-seleccionar-clientes, 03-mensaje-preview, 04-campana-resultados (métricas reales del E2E), 05-owner-campaign (tabla de campañas del dueño), 06-owner-client-drilldown (Campaign → Clients, action/open/share/refs por cliente).
- **Build:** `npm run build` verde; `tsc --noEmit` sin errores nuevos (solo los 2 archivos de test preexistentes ajenos a este scope).
