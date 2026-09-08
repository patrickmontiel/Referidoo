# 00 · Resumen Ejecutivo — Referidoo (auditoría del producto real)

> **Léeme primero.** Este documento y sus 10 hermanos (`01`–`10`) son una **representación fiel y verificada contra código** del Referidoo que existe HOY (snapshot 2026-09-08). Se contrastó SIEMPRE la documentación vieja contra el código; cuando hay conflicto, **manda el código actual**. Etiquetas usadas en todos los docs: `[CÓDIGO VERIFICADO]`, `[INFERENCIA]`, `[DOC — NO VERIFICADO]`, `[ACTIVO]` (encendido por flags/routing hoy).

---

## 1. Qué es Referidoo
Un **SaaS vertical** que convierte a los **clientes felices de un asesor de seguros** en un canal de referidos. Cada cliente del asesor recibe un link propio; cuando comparte y un conocido deja sus datos, ese prospecto tibio cae en el pipeline del asesor. Al cerrar la venta, el sistema calcula el **premio del cliente** (que el asesor paga por fuera) y la **comisión de Referidoo** (que se cobra al asesor). `[CÓDIGO VERIFICADO]`

- **En producción:** referidoo.com (Vercel). One-liner: *"Deja de perseguir clientes. Los que ya tienes te los traen."*
- **Posición:** no hay competidor directo de referral-tracking para asesores individuales de seguros en México; compite contra Excel y WhatsApp.

## 2. Usuarios (4 tipos)
1. **Asesor** — el que paga y adopta. Dashboard `/admin/*`. ICP: asesor de **vida/PPR**, con cartera, digital. `[CÓDIGO VERIFICADO]`
2. **Cliente referidor** — portal `/c/[token]` **sin login** (acceso = poseer el token). Ve su premio, comparte su link. `[CÓDIGO VERIFICADO]`
3. **Lead referido** — landing pública `/r/[code]`; deja sus datos. `[CÓDIGO VERIFICADO]`
4. **Dueño de plataforma (Patrick)** — `/owner/*`, gated por `PLATFORM_OWNER_EMAIL`. Métricas, cola de carátulas, problemas. `[CÓDIGO VERIFICADO]`

## 3. El loop (mecanismo central)
```
Asesor agrega cliente → (asesor MANDA el link manual) → cliente abre portal /c/[token]
 → cliente comparte /r/[referralCode] → conocido llena formulario → Referral en pipeline
 → asesor contacta → convierte (sube carátula, IA lee monto) → premio al cliente + comisión a Referidoo
 → asesor paga premio (por fuera, con CLABE) → cliente confirma
```
Además existe un **loop asesor→asesor** (`/unete/[slug]`): al cerrar el invitado su 1er cliente, invitado y reclutador ganan 30 días Pro (idempotente vía PlanEvents). `[CÓDIGO VERIFICADO]`

## 4. Cómo está construido (stack)
Next.js 16 (App Router, Turbopack) + React 19 + TS · Tailwind v4 · **Prisma 7 sobre Turso (libSQL/SQLite)** · Auth propia (JWT HS256 + bcrypt, cookie `advisor_token` 30d) · **Mercado Pago** (suscripción con Plan + tarjeta tokenizada, webhooks firmados) · **Resend** (emails) · **OpenAI gpt-4o-mini** (visión de carátula + narrativa owner) · **Vercel Blob** (carátulas) · **Vercel Cron** (8 jobs) · Deploy push a `master`. `[CÓDIGO VERIFICADO]` — detalle en `06`.

## 5. Modelo de datos (8 modelos)
`Advisor → Client → Referral` es la espina. `AdvisorSettings` (config de premios, mensajes, credibilidad, burbuja), `RewardTier` (escalera), `BubbleClaim` (premio burbuja, hoy latente), `PlanEvent` (bitácora de billing/atribución, NO analytics de producto), `OwnerBriefing` (narrativa IA). `Referral` es el modelo rico: `status`, `rewardStatus`, `saleAmount`, `productType`, `lessioCommission`, `caratulaStatus`, timestamps (`contactedAt`, `rewardApprovedAt`, `rewardPaidAt`, `billedAt`), `deletedAt` (soft-delete para rastro antifraude). Detalle en `03`. `[CÓDIGO VERIFICADO]`

## 6. Monetización y economía
**Fase 0 actual — servicio asistido:** membresía **$539 MXN/mes** + **comisión por cliente cerrado**. `[CÓDIGO VERIFICADO]`
- **Comisión de Referidoo** (`lib/rewards.ts:25-43`): `Math.round(saleAmount × tasa)`. Tasa según plan del asesor: **PPR/Vida = 0.25% freemium / 0.15% Pro**; Daños/Auto/GMM/Otro = 1.5% / 0.8% (hoy ocultos). Se calcula al convertir, se guarda en `Referral.lessioCommission`, y el cron `billing-commission` la **suma al próximo cobro de Mercado Pago**. Freemium paga ~2× → palanca de upgrade. Ejemplo: Vida $100,000, Pro → **$150**; freemium → **$250**.
- **Premio al cliente** (escalera): tiers por asesor (default UI `[1500, 1500, 3500]`), avanza solo con Vida/PPR; +$1,000 launch bonus si el referrer junta ≥3 referidos en 7 días. El asesor lo paga **por fuera** vía CLABE; la app solo registra el estado. Corte obligatorio de pago = **30 días** desde aprobado. Detalle en `04`.

## 7. Free vs Pro (verdad del código) `[CÓDIGO VERIFICADO]`
| | Trial (30 días) | Free (freemium) | Pro ($539/mes) |
|---|---|---|---|
| Estado | `plan="paid"` sin `mpPreapprovalId` | tras vencer trial | suscripción MP activa |
| Clientes/cartera | ilimitados | **ilimitados** | ilimitados |
| Leads en pipeline | ilimitados | **5** (`FREEMIUM_LEAD_LIMIT`); excedentes se ocultan al asesor, NO se borran | ilimitados |
| Comisión PPR/Vida | (tasa freemium) | 0.25% | 0.15% |
| Envío masivo de links | — | ❌ | ✅ (`/api/clients/send-links`) |

> La única diferencia de producto real entre Free y Pro es **visibilidad de leads (5) + comisión + envío masivo**. NO hay cap de clientes ni gate de imports por plan. `[CÓDIGO VERIFICADO]`

## 8. IA (todo con OpenAI gpt-4o-mini) `[CÓDIGO VERIFICADO]`
1. **Lectura de carátula / antifraude** (`lib/caratula-ai.ts`): al convertir, la IA lee prima+producto de la foto de la póliza; si Vercel Blob está configurado, la carátula es **obligatoria** y el monto se **bloquea** (el asesor no lo teclea) → cierra el subreporte. Antifraude post-hoc compara prima vs `saleAmount` (tolerancia ±25%) → `validada`/`discrepancia`/`pendiente` (cola manual del owner). Fallback: nunca truena la conversión.
2. **Mensaje sugerido al referido** (`/api/referrals/[id]/suggest-message`): genera el primer WhatsApp editable.
3. **Briefing del owner** (`lib/owner-narrative-ai.ts`): narrativa priorizada, **cacheada hasta 14 días** (puede estar desactualizada). Detalle en `05`.

## 9. Estado actual (lo que está vivo vs oculto)
- **Decisión de producto (Fase 1 de venta):** vender **solo el core PPR + Vida**. Ocultos por flags reversibles en `lib/product-visibility.ts` (`SHOW_BUBBLE_REWARDS=false`, `SHOW_NON_CORE_PRODUCTS=false`, `VISIBLE_PRODUCT_TYPES=["PPR","Vida","Otro"]`): los tipos **Daños/Auto y GMM** y **todo el sistema de premios burbuja**. Backend, datos históricos y `COMMISSION_RATES` **intactos** — NO es bug (ver `CLAUDE.md`). Detalle en `07`. `[CÓDIGO VERIFICADO]`
- **Tracción:** pre-tracción. ~3 asesores registrados, **0 activados** (ninguno cerró el loop completo). $0 MRR real.

## 10. Activación (el problema #1) `[CÓDIGO VERIFICADO]`
Meta de activación = **el asesor recibe su primer referido REAL proveniente de un cliente** (no "crear cuenta" ni "agregar cliente"). El loop es de **dos lados** y el punto de fuga #1 es estructural:
> **Cuando el asesor crea un cliente, el sistema NO le envía nada al cliente automáticamente.** El asesor debe compartir el link `/c/[token]` **manualmente por WhatsApp**. Solo Pro puede enviar masivo por correo, y el cron de recordatorios al cliente (`client-nudges`) está **APAGADO por default** (`CLIENT_NUDGES_ENABLED !== "true"`).

Handoffs y quién los controla:
| Paso | Controla |
|---|---|
| Crear cliente | Referidoo (UI) + asesor |
| Cliente recibe acceso | **Asesor (manual)** ← fuga #1 |
| Cliente abre portal | Cliente |
| Cliente comparte | Cliente |
| Referido llena formulario | Referido |

Fixes recientes que sí funcionan: "agrégate a ti mismo" (persiste hasta probarse), handoff forzado "Mándale su link ahora" (banner `justCreated`), reencuadre de copy, banner de paywall al topar 5 leads. Detalle en `01` §Journey B.

## 11. Qué podemos medir HOY `[CÓDIGO VERIFICADO]`
Desde timestamps de DB + PlanEvents: registros de asesor, email verificado, cliente creado (`createdAt`), referido creado, **contacto** (`contactedAt` → tiempo a primer contacto), conversión, premio aprobado/pagado, comisión facturada (`billedAt`), upgrade a Pro (PlanEvent `activated`), downgrade (`cancelled`), atribución unete. Owner ve MRR, comisión por facturar, GWP, morosidad, ranking, cola de carátulas.

## 12. Funnel viral — antes ciego, ahora INSTRUMENTADO `[CÓDIGO VERIFICADO]`
**Estado original de la auditoría:** el funnel viral era 100% ciego (sin tracking de portal abierto, link compartido, WhatsApp, landing vista, forma iniciada). **Actualización (sep-2026):** se implementó el modelo `ProductEvent` + `/api/events` + el cockpit `/owner/activacion`, que hoy hacen observable todo el funnel `client_created → portal_link_sent → client_portal_opened → referral_share_clicked → referral_landing_viewed → referral_form_started → referral_created`, con atribución por asesor/cliente, deduplicación y timeline. Ver **`11-INSTRUMENTACION-FUNNEL.md`**. (Analytics de sitio sigue siendo solo Vercel Web Analytics para pageviews; los eventos de producto viven en `ProductEvent`.)

## 13. Principales riesgos (resumen; detalle en `08`)
- **P1** — Password en query string de `/login` (`?p=`); sin rate-limiting en login/register/resend (fuerza bruta/spam).
- **P2** — CLABE + PII de clientes viajan por email sin cifrar en el backup diario; PII en logs cuando falta `RESEND_API_KEY`; `accessToken`/`referralCode` con aleatoriedad débil (cuid/`Math.random`, enumerables).
- **Deuda** — `FREEMIUM_LEAD_LIMIT` y `$539` y `COMMISSION_RATES` duplicados en varios archivos; endpoints legacy no conectados; código muerto (`Tour.tsx`, `ReferralMath.tsx`); toggle manual de plan del owner **no emite PlanEvent** (rompe series).
- **Contradicción legal** — `/aviso-de-privacidad` dice "nunca pedimos cuentas bancarias" pero el portal **sí** captura CLABE.
- No se hallaron **P0**.

## 14. Contradicciones doc↔código más importantes (detalle en `09`)
- **Tope de leads: triple inconsistencia** — `FREEMIUM_LEAD_LIMIT=5` (real) · comentario en `plan.ts` dice "12" · `PerfilClient.tsx` muestra al usuario **"Leads {n}/12"** · `NEGOCIO.md` dice "2 clientes". **Vigente: 5 leads, clientes ilimitados.**
- **Trial:** `NEGOCIO.md` dice 14 días · código = **30 días**.
- **Auto/GMM/Burbuja:** docs viejos los describen como oferta · **hoy ocultos por flag** (código intacto).
- **Montos de escalera:** comentario "1500/1500/2500" · default UI "1500/1500/3500" · default sin-tiers "1500 plano".

## 15. ¿Puede otro modelo operar como cofundador con estos docs?
**Sí, en gran medida** — con estos 11 documentos + los docs de estrategia (`../*.md`) un cofundador de producto/growth/negocio entiende el producto real, la economía, el estado, la activación y los agujeros de medición casi como si llevara meses. Lo que **no** se puede extraer del repo y solo Patrick tiene: cifras reales de tracción/facturación en producción, el contenido de conversaciones con asesores, la decisión de pricing final, y credenciales/paneles externos (Turso prod, Mercado Pago, Vercel, Resend). Ver `20` en la respuesta de terminal.
