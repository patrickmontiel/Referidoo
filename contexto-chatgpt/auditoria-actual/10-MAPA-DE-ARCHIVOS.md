# 10 · Mapa de archivos — dónde buscar

> Orientación para que otro modelo sepa dónde profundizar. Rutas desde la raíz del repo.

## Config / raíz
- `prisma/schema.prisma` — 8 modelos (Advisor, AdvisorSettings, RewardTier, Client, BubbleClaim, PlanEvent, OwnerBriefing, Referral). Fuente de verdad del modelo de datos.
- `vercel.json` — schedules de los 8 crons.
- `dev.db` (raíz) — SQLite local (usar el de raíz, no el de `prisma/`).
- `CLAUDE.md` / `AGENTS.md` — convenciones (push a master, sin `migrate dev`, Next 16 = `proxy.ts`, productos ocultos por flag).
- `NEGOCIO.md` / `README.md` / `PRODUCT.md` / `DESIGN.md` / `TESTING.md` / `TODOS.md` — contexto (ojo: drift, ver `09`).

## `src/lib/` — lógica de negocio (empezar aquí)
- `auth.ts` — JWT, bcrypt, cookies, `isPlatformOwner`.
- `db.ts` — cliente Prisma.
- `plan.ts` — `FREEMIUM_LEAD_LIMIT=5`, `canAdvisorAddClients` (gate = email verificado).
- `rewards.ts` — **el núcleo económico**: `LESSIO_COMMISSION_RATES`, `calculateLessioCommission`, escalera (`computeRewardForPosition`), burbuja, launch bonus, `ESCALERA_PRODUCTS`.
- `mercadopago.ts` — SDK MP: crear/actualizar/cancelar suscripción, **firma webhook**, `MONTHLY_PRICE_MXN=539`.
- `email.ts` — **14 emails Resend** (ver `05`).
- `caratula-ai.ts` — IA visión (lectura + antifraude de carátula).
- `owner-narrative-ai.ts` — briefing IA del owner (cache 14d).
- `owner-problems.ts` — **`computeMorosos` + `computeOwnerProblems`** (morosidad, subreporte, duplicados, cobros rechazados, leads stale). Sin tests.
- `unete.ts` — premios del loop asesor→asesor.
- `product-visibility.ts` — **flags** (`SHOW_BUBBLE_REWARDS`, `SHOW_NON_CORE_PRODUCTS`, `VISIBLE_PRODUCT_TYPES`, `VISIBLE_INTERESTS`).
- `blob.ts` — Vercel Blob (carátulas). `referral-info.ts` — datos para `/r/[code]`.
- `message-templates.ts` — plantillas WhatsApp/welcome/invite. `utils.ts` — `generateReferralCode`, `REWARD_CUTOFF_DAYS=30`, `formatCurrency`. `rate-limit.ts` — cooldown in-memory (solo 2 endpoints). `tour-position.ts` — cálculo del spotlight del tour.

## `src/proxy.ts` — middleware Next 16 que protege `/admin` y `/owner`.

## `src/app/` — superficies (ver `01`)
- `page.tsx` — landing. `como-funciona/`, `terminos/`, `aviso-de-privacidad/` — estáticas.
- `registro/`, `login/`, `verificar/`, `correo-verificado/` — auth.
- `admin/` — dashboard asesor:
  - `AdminLayoutShell.tsx` — **motor del tour + Primeros Pasos + welcome** (no `components/Tour.tsx`).
  - `page.tsx` + `AdminOverviewClient.tsx` — resumen.
  - `clientes/ClientesClient.tsx` — cartera, agregar, "agrégate a ti mismo", handoff, CSV, pagar premio.
  - `referidos/ReferidosClient.tsx` — pipeline, leads bloqueados, paywall, conversión (drawer).
  - `niveles/page.tsx` — escalera + burbuja (gated) + agenda + mensajes.
  - `perfil/PerfilClient.tsx` — plan, `UpgradeCardForm`, credibilidad, comisiones pendientes.
- `c/[token]/ClientPortalPage.tsx` — portal del cliente (sin login).
- `r/[code]/ReferralLandingPage.tsx` (+ `lib/referral-info.ts`) — landing del referido.
- `unete/[slug]/page.tsx` — loop asesor→asesor.
- `owner/` — cockpit: `page.tsx` (resumen), `asesores/`, `pagos/`(+`CaratulasQueue.tsx`), `inteligencia/`, `documentos/`, `configuracion/`, `layout.tsx`.

## `src/app/api/` — endpoints
- `auth/*` (register, login, logout, refresh, verify-email, resend-verification).
- `billing/{subscribe,cancel}` · `webhooks/{mercadopago,send-confirmation}`.
- `referrals/route.ts` (POST público) · `referrals/[id]/route.ts` (**conversión/pago/soft-delete — el más denso**) · `referrals/caratula` (upload) · `referrals/read-caratula` (IA) · `referrals/[id]/suggest-message` (IA).
- `clients/*` (route, import, send-links, [id], pay-rewards).
- `portal/[token]/*` (route, confirm, claim-bubble, clabe).
- `advisor/*` (me, onboarded, onboarding-tasks, credibility).
- `tiers`, `bubble-settings`, `bubble-claims`, `caratula-view`, `referral-info/[code]`, `recalculate-rewards`, `migrate` (owner, DDL prod), `demo/reset` (destructivo), `test-emails`.
- `owner/*` (overview, narrative, caratulas, resend-verification, backfill-trials; legacy: summary, breakdown, ranking, trends, problems).
- `admin/*` (advisors, advisors/[id], clients-data, referidos-data, home-data, profile-data).
- `cron/*` (confirmations, billing-downgrade, billing-commission, backup, client-nudges, reward-reminders, trial-ending).

## `src/components/`
- `UpgradeCardForm.tsx` — formulario MP (Secure Fields). `BolaDeNieveCard.tsx` — proyección. `landing/*` (HeroDemo, LiquidBubble, ChannelData, BrandWord, ReferralMath[muerto]). `ui/{button,card,chart}.tsx`. `Tour.tsx` — **muerto** (motor real en AdminLayoutShell).

## `prisma/` y `scripts/`
- `prisma/add-*.ts` — cambios de esquema puntuales (nunca `migrate dev`).
- `prisma/comp-advisor.ts` — **comp de trial a mano** (dar otro mes de Pro). `prisma/seed.ts`, `check-data.ts`, `migrate-turso.ts`.
- `scripts/mp-create-plan.ts` — crear el Plan de MP una vez por cuenta.

## `e2e/` — Playwright: `signup.spec.ts`, `billing-upgrade.spec.ts` (skip).

## `contexto-chatgpt/` — este paquete
- `00-REFERIDOO-MAESTRO.md` + `REFERIDOO-TODO-EN-UNO.md` — contexto general (previo).
- `auditoria-actual/` — **esta auditoría** (`00`–`10` + `screenshots/`).
- Docs de estrategia GTM copiados a la raíz de `contexto-chatgpt/`.

## "¿Dónde busco si necesito…?"
| Necesito entender… | Empieza en |
|---|---|
| El dinero (comisión/premio) | `src/lib/rewards.ts` |
| Cobro / suscripción | `src/lib/mercadopago.ts` + `api/billing/*` + `api/webhooks/mercadopago` + `api/cron/billing-*` |
| Conversión de un referido | `api/referrals/[id]/route.ts` |
| Qué está oculto y por qué | `src/lib/product-visibility.ts` |
| Antifraude / carátula | `src/lib/caratula-ai.ts` + `api/referrals/read-caratula` |
| El portal del cliente | `app/c/[token]/ClientPortalPage.tsx` + `api/portal/[token]/*` |
| Onboarding / tour | `app/admin/AdminLayoutShell.tsx` + `api/advisor/onboarding-tasks` |
| Métricas del owner | `api/owner/overview` + `src/lib/owner-problems.ts` |
| Qué emails salen | `src/lib/email.ts` |
