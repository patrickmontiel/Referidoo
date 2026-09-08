# 06 · Arquitectura Técnica — cómo está armado Referidoo

> Para un desarrollador nuevo. `[CV]` = código verificado.

## Mapa de alto nivel
```
Browser (React 19 client components + Next SSR)
  ↓  fetch / navegación
Next.js 16 (App Router, Turbopack)
  ├─ src/proxy.ts  (middleware Next 16) → protege /admin/* y /owner/*
  ├─ Server Components (SSR) → leen DB directo vía Prisma
  └─ Route Handlers (src/app/api/**/route.ts) → lógica de negocio
  ↓
Prisma 7  (@prisma/adapter-libsql, cliente generado en src/generated/prisma)
  ↓
Turso (libSQL / SQLite)   [local: dev.db en raíz]

Servicios externos: Mercado Pago · OpenAI · Resend · Vercel Blob · Vercel Cron · Vercel Web Analytics
```

## Stack `[CV]`
- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**. Ojo: Next 16 renombró `middleware.ts` → **`src/proxy.ts`**. Ver `AGENTS.md` (leer `node_modules/next/dist/docs/` antes de escribir código nuevo).
- **Tailwind CSS v4**.
- **Prisma 7** sobre **Turso** con `@prisma/adapter-libsql`. Cliente generado en `src/generated/prisma`. `postinstall` corre `prisma generate`.
- **Auth propia**: `jsonwebtoken` (HS256) + `bcryptjs`. Sin proveedor externo.
- **Vitest** + Testing Library (unit/integration) · **Playwright** (e2e).

## Componentes server vs client `[CV]`
- **Server Components (SSR):** `page.tsx` (landing), `/admin/page.tsx`, `/admin/niveles`, `/admin/perfil/page.tsx`, `/owner/*` (varias), `/r/[code]/page.tsx`, `/unete/[slug]`, `/como-funciona`. Leen DB directo con Prisma y pasan props a los clients.
- **Client Components:** `AdminOverviewClient`, `ClientesClient`, `ReferidosClient`, `PerfilClient`, `ClientPortalPage`, `ReferralLandingPage`, `AdminLayoutShell` (tour engine), `registro`, `login`, `UpgradeCardForm` (MP SDK React).

## Auth / gating `[CV]`
- `src/lib/auth.ts`: `signToken` (HS256, exp **30 días**), `setAdvisorCookie` (`advisor_token`, httpOnly, secure en prod, sameSite lax, maxAge 30d), `hashPassword`/`verifyPassword` (bcrypt cost 10), `getAdvisorSession`, `isPlatformOwner(email)` (compara contra `PLATFORM_OWNER_EMAIL`). Throw en prod si `JWT_SECRET==="dev-secret"`.
- `src/proxy.ts`: matcher `/admin/:path*` y `/owner/:path*`; sin sesión → `/login`; `/owner` exige owner → si no `/admin`. **Además cada page/api owner re-verifica en server** (defensa en profundidad). El proxy confía en el email del JWT (firmado por el server).

## APIs (`src/app/api/`) — grupos `[CV]`
- **auth/**: register, login, logout, refresh, verify-email, resend-verification.
- **billing/**: subscribe, cancel. **webhooks/**: mercadopago (firma HMAC), send-confirmation.
- **referrals/**: `route.ts` (POST público crea lead), `[id]/route.ts` (PATCH convertir/pagar, DELETE soft), `caratula` (upload Blob), `read-caratula` (IA), `[id]/suggest-message` (IA).
- **clients/**: route (POST), import, send-links (Pro), `[id]`, `[id]/pay-rewards`.
- **portal/[token]/**: route (GET), confirm, claim-bubble, clabe.
- **advisor/**: me, onboarded, onboarding-tasks, credibility.
- **tiers**, **bubble-settings**, **bubble-claims**, **caratula-view** (owner), **referral-info/[code]**, **recalculate-rewards**, **migrate** (owner, DDL en prod), **demo/reset** (destructivo), **test-emails** (secret).
- **owner/**: overview, narrative, caratulas, resend-verification, backfill-trials, summary, breakdown, ranking, trends, problems. **admin/**: advisors, advisors/[id], clients-data, referidos-data, home-data, profile-data.
- **cron/**: confirmations, billing-downgrade, billing-commission, backup, client-nudges, reward-reminders, trial-ending (todos `Bearer CRON_SECRET`).

## DB `[CV]`
8 modelos (ver `03`): Advisor, AdvisorSettings, RewardTier, Client, BubbleClaim, PlanEvent, OwnerBriefing, Referral. **NO se usa `prisma migrate dev`** — cambios de esquema vía scripts `prisma/add-*.ts` o `/api/migrate` (DDL en Turso con `TURSO_AUTH_TOKEN`). Local: `dev.db` en la **raíz** (hay dos; usar el de raíz).

## Crons / background `[CV]`
Vercel Cron (`vercel.json`) — 8 jobs (ver `05`). Webhook MP entrante firmado. **No hay QStash real** (nombrado en README, sin cliente en código).

## Deploy `[CV]`
Vercel. **Push directo a `master` = deploy a producción** (sin PRs, un solo dev). `npm run build` = `next build`. `next/font/google` hace fallar `npm run build` offline; `tsc --noEmit` y `vitest` corren offline.

## Variables de entorno (nombres y para qué) `[CV]` — NO se exponen valores
| Var | Para qué |
|---|---|
| `DATABASE_URL`, `TURSO_AUTH_TOKEN` | Conexión Turso; el token también lo usa `/api/migrate` para DDL en prod |
| `JWT_SECRET` | Firmar tokens de sesión del asesor |
| `NEXT_PUBLIC_BASE_URL` | Base para links (portal, back_url MP) |
| `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_NOTIFY_CREATOR` | Emails transaccionales + copia al creador |
| `OPENAI_API_KEY` | Visión de carátula, mensaje sugerido, briefing owner |
| `CRON_SECRET` | Autentica los 8 crons + webhook send-confirmation |
| `PLATFORM_OWNER_EMAIL` | Único correo con acceso a `/owner` |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_PLAN_ID`, `NEXT_PUBLIC_MP_PUBLIC_KEY` | Mercado Pago (API, firma webhook, plan, tokenización en browser) |
| `QSTASH_TOKEN` | (nombrado; sin integración real en código) |
| `CLIENT_NUDGES_ENABLED` | Flag que enciende el cron de recordatorios al cliente (apagado por default) |
| `TEST_EMAILS_SECRET` | Protege `/api/test-emails` |

## Scripts `[CV]`
`prisma/seed.ts` (datos de prueba), `prisma/add-*.ts` (cambios de esquema puntuales), `prisma/comp-advisor.ts` (comp de trial a mano), `prisma/check-data.ts`, `prisma/migrate-turso.ts`, `scripts/mp-create-plan.ts` (crear el Plan de MP una vez por cuenta).

## Testing `[CV]`
Vitest colocado en `__tests__/`; Playwright en `e2e/`. Resultado de la corrida local durante esta auditoría: **27 archivos, 178 tests, 0 fallos**. 1 test skip (`e2e/billing-upgrade.spec.ts` — Secure Fields de MP bloquean automatización). Detalle de cobertura en `08`.

## Convenciones del repo (`CLAUDE.md`) `[CV]`
Sin PRs; push a master. Sin `prisma migrate dev`. Verificación visual con `gstack browse`. Productos Auto/GMM/burbuja **ocultos a propósito por flags** (no es bug). No tocar `clientes/` sin confirmación (regla global de Patrick).
