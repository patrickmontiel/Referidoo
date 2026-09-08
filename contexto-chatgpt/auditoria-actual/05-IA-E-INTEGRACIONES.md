# 05 · IA e Integraciones externas

> `[CV]` = código verificado, `[INF]` = inferencia.

## PARTE A — Features de IA (todo OpenAI, modelo `gpt-4o-mini`)

### 1. Lectura de carátula + antifraude — `src/lib/caratula-ai.ts` `[CV]` `[ACTIVO]`
- **Modelo/proveedor:** OpenAI `gpt-4o-mini` (visión), `POST https://api.openai.com/v1/chat/completions`, `response_format: json_object`, `max_tokens:150`, imagen `detail:"high"`. Env: `OPENAI_API_KEY`.
- **Input:** URL de la carátula (Vercel Blob) → `fetchBlobAsDataUrl` baja el blob autenticado; **solo `image/*`** (PDF → null, "validación manual"), rechaza >15MB, la pasa como data URL base64.
- **Output:** `{ prima, producto, moneda, confianza }`. Pide **prima total anual** + ramo canónico (GMM/Vida/PPR/Daños-Auto/Otro); `productFamily()` normaliza sinónimos.
- **Dos usos:**
  1. `readCaratula` — al subir, pre-llena producto+prima para que el asesor solo confirme. Endpoint `POST /api/referrals/read-caratula` (rate-limit 2500ms).
  2. `analyzeCaratula` — antifraude post-conversión, corre en `after()` (no bloquea):
     - **Mismatch de producto** (confianza≠baja, ninguno "Otro") → `caratulaStatus:"discrepancia"`.
     - **Sin lectura confiable** (sin prima / confianza baja / moneda≠MXN) → **pendiente** (revisión manual del owner).
     - **Match de monto**: `ratio = saleAmount / prima`; válido si `1±0.25` (**±25%**) → `"validada"`, si no `"discrepancia"`.
- **Bloqueo de entrada:** si Vercel Blob está configurado, la carátula es **obligatoria** para convertir, y si la IA leyó `prima`, el monto se **bloquea** (readOnly). Cierra el subreporte.
- **Fallback:** ilegible / PDF / sin API key / error → devuelve `null` y **nunca truena** la conversión.
- **Coste `[INF]`:** gpt-4o-mini con 1 imagen `detail:high` ≈ fracción de centavo de USD por conversión; volumen bajo (solo al convertir) → coste operativo trivial hoy.
- **Riesgo/dependencia:** el antifraude depende de OpenAI; si cae, las conversiones siguen (fallback null → cola manual). El **valor estratégico** (moat) es acumular qué se convierte, no el modelo en sí.

### 2. Mensaje sugerido al referido `[CV]` `[ACTIVO]`
- `POST /api/referrals/[id]/suggest-message` — genera el primer WhatsApp personalizado y editable (menciona quién refirió, corto, un CTA). Rate-limit in-memory. Output editable por el asesor (validación humana implícita).

### 3. Briefing del owner — `src/lib/owner-narrative-ai.ts` `[CV]` `[ACTIVO]`
- `gpt-4o-mini` vía OpenAI REST. Genera narrativa priorizada de "qué necesita tu atención" para `/owner`. **Cacheada `NARRATIVE_REFRESH_MS = 14 días`** → puede estar hasta 2 semanas desactualizada (la cola de problemas sí es en vivo, el resumen no). Se guarda en `OwnerBriefing`.
- **Riesgo:** `owner-narrative-ai.ts:61` puede loguear la respuesta de OpenAI (ver `08` — PII/logs).

## DISEÑADO / PENSADO PERO NO CONSTRUIDO `[CV]` (según docs, no en código)
- **Moat de "IA de conversión"** (aprender qué mensaje/timing/producto convierte, efecto de red de datos) — descrito en `PRODUCT.md` y `TODOS.md` como Fase 2; **NO existe en código** (no hay pipeline de aprendizaje ni modelo entrenado; la IA actual solo lee carátulas y sugiere mensajes). `[DOC — NO VERIFICADO como construido]`

---

## PARTE B — Integraciones externas

| Servicio | Para qué | Env (nombres) | Estado |
|---|---|---|---|
| **Turso (libSQL)** | Base de datos (Prisma adapter) | `DATABASE_URL`, `TURSO_AUTH_TOKEN` (este último lo usa `/api/migrate` para DDL en prod) | `[ACTIVO]` |
| **Mercado Pago** | Suscripciones Pro + cobro de comisión (PUT amount) | `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_PLAN_ID`, `NEXT_PUBLIC_MP_PUBLIC_KEY` | `[ACTIVO]` (ver `04`) |
| **OpenAI** | Carátula (visión) + mensaje sugerido + briefing owner | `OPENAI_API_KEY` | `[ACTIVO]` |
| **Resend** | 14 emails transaccionales | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_CREATOR` | `[ACTIVO]` (ver inventario abajo) |
| **Vercel Blob** | Almacenar carátulas de póliza | (token de Blob) | `[ACTIVO]`; si no configurado, la carátula deja de ser obligatoria |
| **Vercel Cron** | 8 jobs programados (`vercel.json`) | `CRON_SECRET` | `[ACTIVO]` |
| **Vercel Web Analytics** | Pageviews (sin eventos custom) | — | `[ACTIVO]` |
| **QStash** | (webhook diferido) | `QSTASH_TOKEN` (nombrado en README) | **NO integrado en código `[INF]`** — no hay cliente QStash; `send-confirmation` está gated por `x-webhook-secret=CRON_SECRET` pero ningún cron lo llama con QStash. Todo el scheduling es Vercel Cron nativo. |

### Inventario de emails (Resend) — 14 salientes `[CV]`
`FROM = EMAIL_FROM` (default `noreply@referidoo.com`); copia interna a `EMAIL_NOTIFY_CREATOR`. Si falta `RESEND_API_KEY` → no-op + `console.log` (algunos con PII, ver `08`).

| Email | Trigger | Destinatario | Cron/Trigger |
|---|---|---|---|
| Nuevo referido | `POST /api/referrals` (form público) | asesor + creador | Trigger |
| Límite freemium (upgrade) | `/api/referrals` al topar 5 leads | asesor | Trigger |
| Referido cerrado (con comisión) | PATCH conversión | asesor + creador | Trigger |
| Premio en camino | asesor marca pagado / `send-confirmation` | referente + creador | Trigger |
| Pide confirmación de premio | **cron `confirmations`** (16:00) | referente | Cron |
| Cliente confirmó premio | portal confirm | creador | Trigger |
| Verificación de correo | register / resend | asesor | Trigger |
| Fin de prueba (≤3d) | **cron `trial-ending`** (15:00) | asesor trial | Cron |
| Downgrade ("tu prueba terminó") | **cron `billing-downgrade`** (17:00) | asesor (trial sin MP) | Cron |
| Link al cliente (masivo Pro) | `send-links` (botón Pro) | cliente | Trigger |
| Burbuja reclamada / pagada | portal claim / bubble-claims | creador/asesor/referente | Trigger (hoy latente) |
| Premio unete (1er cierre invitado) | `lib/unete.ts` | invitado + reclutador | Trigger |
| Burbuja lista / progreso mensual | **cron `client-nudges`** | cliente | Cron — **APAGADO** salvo `CLIENT_NUDGES_ENABLED=true` |
| Recordatorio/morosidad de premio (d7/d14) | **cron `reward-reminders`** (14:00) | asesor | Cron |

### Crons (`vercel.json`) — auth `Bearer CRON_SECRET` `[CV]`
`confirmations` 16:00 · `billing-downgrade` 17:00 · `billing-commission` 12:00 · `backup` 11:00 (dump JSON por email) · `client-nudges` (mar 16:00 / día-1 mensual, **apagado**) · `reward-reminders` 14:00 · `trial-ending` 15:00.

### Webhooks
- `mercadopago` — firma HMAC validada (fail-closed).
- `send-confirmation` — `x-webhook-secret=CRON_SECRET`; reenvía "premio en camino". `[INF]` pensado para diferido, sin QStash real.
