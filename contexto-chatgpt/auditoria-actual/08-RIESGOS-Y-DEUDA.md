# 08 · Riesgos y Deuda — seguridad, bugs, deuda técnica

> Revisión arquitectónica (sin pentest destructivo). Clasificación P0 (crítico) → P3 (bajo). **NO se cambió nada.** `[CV]` = verificado. **No se encontraron P0.**

## Seguridad

### P1 — Alto
1. **Password en query string** (`login/page.tsx:24-26`): `/login?p=...` precarga la contraseña en texto plano → fuga por historial del navegador, logs de servidor, header `Referer`. `[CV]`
2. **Sin rate-limiting en auth** (`login`, `register`, `resend-verification`): `lib/rate-limit.ts` (in-memory) solo se usa en `suggest-message` y `read-caratula`. Habilita fuerza bruta de contraseñas (mitigado parcial por bcrypt), spam de registros y de correos de verificación. `[CV]`

### P2 — Medio
3. **CLABE + PII por email sin cifrar**: el cron `backup` (diario) manda un dump JSON de todas las tablas (incl. CLABE, teléfonos, emails de clientes; sin passwords) por correo al owner → PII sensible viaja por email sin cifrar. `[CV]`
4. **PII en logs**: varios `console.log/error` imprimen payloads con `leadName/leadPhone/leadEmail` cuando falta `RESEND_API_KEY` (`email.ts:242,592,682,712`), email de asesor + URL con token de verificación (`email.ts:431`), y posible respuesta de OpenAI (`owner-narrative-ai.ts:61`). `[CV]`
5. **Tokens con aleatoriedad débil**:
   - `accessToken` del portal `/c/[token]` = `cuid()` (`schema.prisma:78`): largo pero no criptográficamente aleatorio (timestamp+contador+entropía débil). Para un portal que expone CLABE/premios, `crypto.randomBytes` sería preferible. `[CV]`
   - `referralCode` de `/r/[code]` (`utils.ts:33-41`) = hasta 6 chars del **nombre** (predecible) + 4 chars con `Math.random()` (espacio ~31⁴≈923k) → **enumerable**. Riesgo real: no expone PII (la landing solo muestra nombre/credibilidad del asesor y permite **crear leads**), pero permite **spammear leads falsos** a un asesor conocido y descubrir qué clientes tiene. `[CV]`
6. **Login no valida `deletedAt` ni `emailVerified`** (`refresh` sí valida `deletedAt`) → una cuenta soft-borrada podría re-loguearse. `[CV]`

### P3 — Bajo
7. `verify-email` es **GET que muta estado** → prefetch/escáneres de link podrían "verificar" involuntariamente. `[CV]`
8. `claim-bubble/route.ts:13` valida solo `!client` (no `active`) — inconsistente con `clabe`/`portal`; inalcanzable hoy por el flag de burbuja. `[CV]`
9. `/api/migrate` (owner-gated) ejecuta DDL en Turso producción por HTTP; `/api/demo/reset` borra datos del asesor autenticado sin confirmación server-side; `/api/test-emails` hardcodea un correo Gmail personal en el fuente. `[CV]`

### Lo que SÍ está bien `[CV]`
- Firma HMAC del webhook MP validada (constant-time, tolerancia replay 300s, **fail-closed** sin secret) → P0 evitado.
- Authorization consistente: mutaciones de asesor validan `advisorId===session.advisorId`; portal valida ownership del token; APIs owner/admin gated por `isPlatformOwner` con **defensa en profundidad** (proxy + re-chequeo en cada page/api).
- Crons autenticados con `CRON_SECRET`. Carátula: upload gated por sesión, visor gated por owner con allowlist de host de Blob.
- `JWT_SECRET==="dev-secret"` lanza error en producción.

## Bugs / robustez `[CV]`
- **Dead-end de activación (el más importante, no es "bug" pero es el hueco de producto #1):** crear un cliente **no envía nada** → el cliente nunca sabe que tiene portal salvo que el asesor comparta manual (ver `01` Journey B).
- `ReferidosClient.load()` y varios `PUT`/fetch **sin `.catch`** → un fallo de red deja el spinner colgado / errores silenciosos.
- `PerfilClient.handleCancel` en éxito no refresca → el usuario sigue viendo "Activo" tras cancelar.
- `/api/admin/clients-data` omite `linkSent/advisor.email/advisor.plan` → tras un `load()` in-place se degradan el gate Pro y el banner de self-test.
- Header de la landing sin nav en móvil (<640px, sin hamburguesa) → no hay acceso a login/registro desde el header en móvil.
- Anclas rotas en el footer (`#paso-3/#paso-4`).
- `/unete`: si el reclutador cambia su nombre, el slug deja de matchear y **su premio se pierde en silencio**.
- `correo-verificado` en estado de error empuja a `/admin` en vez de reenviar/login.

## Deuda técnica `[CV]`
- **Duplicación de constantes:** `FREEMIUM_LEAD_LIMIT` (en `plan.ts` y hardcoded en `ReidosClient.tsx:414`), `$539` (`MEMBERSHIP_COST`, `MEMBERSHIP_MONTHLY`, `MONTHLY_PRICE_MXN`), `COMMISSION_RATES` (5 archivos). Cambiar una tasa exige tocar 5 archivos.
- **Código muerto:** `src/components/Tour.tsx`, `landing/ReferralMath.tsx`.
- **Endpoints legacy no consumidos:** `admin/referidos-data`, `admin/home-data` (además `home-data` omite `deletedAt:null`), y 5 APIs owner (`summary/breakdown/ranking/trends/problems`).
- **`PlanEvent.event` mal documentado** en el schema (dice 3, hay ≥8 valores).
- **Toggle manual de plan del owner no emite PlanEvent** → serie `trends`/eventos incompleta; sin backfill de PlanEvent → series arrancan vacías.
- **`linkSent` no es columna de DB** (se deriva de PlanEvent) y no se propaga en `clients-data`.
- **Cobertura de tests con huecos** (ver abajo).

## Tests — cobertura `[CV]`
- **Corrida local:** 27 archivos, **178 tests, 0 fallos**. 1 skip: `e2e/billing-upgrade.spec.ts` (Secure Fields de MP bloquean automatización — requiere humano; documentado).
- **Con cobertura:** libs (auth, mercadopago, plan, rewards, utils, tour-position), auth APIs (login/register/verify), billing (subscribe/cancel), crons billing-commission/downgrade, webhook mercadopago, clients (import/route), referrals/[id], advisor/me, admin/advisors, owner/summary, owner page, proxy.
- **SIN tests (crítico):** `owner/overview` (alimenta todo el dashboard), `owner-problems.ts` (morosidad/antifraude), `owner-narrative-ai.ts`, `unete.ts` (premios), `caratula-ai.ts`, portal (confirm/claim-bubble/clabe), `send-links`, y 5 de 8 crons (confirmations, trial-ending, reward-reminders, client-nudges, backup). Emails solo mockeados en sus triggers (sin test de contenido).
- Nota: `tsc --noEmit` reporta errores **preexistentes** en 2 archivos de test (`admin/layout.test.tsx`, `admin/perfil.test.tsx` — props faltantes) que NO afectan la corrida de vitest (esos 178 pasan). `[CV]`

## Contradicción legal/confianza `[CV]`
`/aviso-de-privacidad` y el FAQ afirman **"Nunca pedimos RFC, cuentas bancarias ni datos de pólizas"**, pero el portal del cliente **sí captura CLABE** (`/api/portal/[token]/clabe`) y el flujo sube **carátulas de pólizas**. Contradicción real a resolver (legal + confianza).
