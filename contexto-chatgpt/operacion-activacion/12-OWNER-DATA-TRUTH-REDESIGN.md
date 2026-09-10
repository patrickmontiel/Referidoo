# 12 · Owner Data Truth — auditoría y rediseño

> **Regla fundamental:** un número de Owner solo puede existir si podemos explicar de qué registros sale, cuál es su denominador, qué cuentas incluye y qué significa. **Sin dato real → `0` o "Sin datos suficientes". Nunca un valor demo.** Definiciones en `15-METRICS-DICTIONARY.md`.
>
> Estado: **implementado en local** (Fase 1). Sin push, sin Turso prod.

## 1. Qué estaba mal (auditado contra código)

### 1.1 Cero aislamiento de cuentas internas — **la causa raíz**
No existía **ningún** mecanismo para excluir cuentas de prueba: no había campo `isTest`/`isDemo`/`isInternal`, ni allowlist, ni filtro por dominio. Cada cuenta creada por `seed.ts`, `seed-blur-test.ts`, los `e2e/signup.spec.ts` (que registran advisors reales en cada corrida) y la **propia cuenta del owner** contaba como asesor real en **MRR, close rate, GWP, ranking, funnel y el briefing de IA**.

### 1.2 MRR fantasma
`MRR = count(plan='paid') × $539`. Pero `plan='paid'` **sin `mpPreapprovalId`** es un **trial o un comp manual**, no un ingreso. Peor: `prisma/add-advisor-plan-verification.ts:33` corrió
```sql
UPDATE Advisor SET emailVerified = true, plan = 'paid' WHERE emailVerified = false
```
convirtiendo a **todos los advisors legacy** en "paid" sin suscripción. Cada uno sumaba $539 de MRR inexistente. (Que `backfill-trials` apunte exactamente a esa población lo confirma.)

### 1.3 `Referral.deletedAt` nunca se filtraba
El soft-delete existe (`schema.prisma:170`) pero **ninguna** query de owner lo filtraba → los referidos que el asesor ya borró seguían inflando **GWP, comisión, ranking, close rate y el detector de fraude**.

### 1.4 Métricas mal definidas
- **"Asesores activos"** = todos los no borrados (sin login ni actividad). *Registrado ≠ activado.*
- **`mrrNew`** deduplicaba por **nombre** → dos asesores homónimos colapsaban en uno.
- **"Cartera que comparte %"**: numerador de una población (todos los `referrerId`, incluidos clientes inactivos) y denominador de otra (clientes activos) → **podía pasar de 100%**.
- **Close rate**: denominador = todos los referidos no rechazados, incluidos los que siguen abiertos → se deprime con leads en vuelo y sube solo por envejecer.
- **`updatedAt` como fecha de cierre**: es mutable. Validar una carátula (`api/owner/caratulas`) **mueve una conversión al periodo actual**, reescribiendo GWP y ranking retroactivamente. No existe `convertedAt`.

### 1.5 Benchmark sin fuente
`INDUSTRY_CLOSE_RATE = 25.6` con el comentario "Focus Digital 2025". Un grep exhaustivo del repo (incluyendo docs, `prospeccion/`, `pitch/`) encontró **solo la afirmación, nunca la fuente**: sin URL, PDF, CSV, metodología ni cita. Además comparaba contra una tasa nuestra con **otro denominador**. Se mostraba a 42px junto al número real.

### 1.6 PII de clientes en analytics (y en OpenAI)
`Client.name` aparecía en **15 lugares** y `Referral.leadName` en **9**, incluyendo la cola de carátulas y los drilldowns. Lo más grave: los nombres llegaban al **prompt de OpenAI**, que además instruía *"usa nombres y montos"* — mientras la propia página de inteligencia prometía *"agregado y anónimo … nunca datos personales"*.

### 1.7 Footguns de producción
- `prisma/reset-demo.ts`: `DELETE FROM Referral; DELETE FROM Client;` **sin WHERE**, apuntando explícitamente a Turso **producción**.
- `prisma/seed.ts`: borra 5 tablas y estaba enganchado a `package.json → prisma.seed`, así que **`prisma db seed` / `migrate reset` lo auto-invocaban**.
- `/api/demo/reset`: vivo en producción, llamable por **cualquier asesor autenticado**, borra toda su cartera. Sin UI que lo llamara (huérfano).

## 2. Qué se corrigió (Fase 1)

| Problema | Corrección |
|---|---|
| Sin aislamiento | `Advisor.analyticsExcluded` + `src/lib/analytics-scope.ts` como **alcance único** reutilizado por toda métrica. **Nunca** se filtra por email hardcodeado. |
| MRR fantasma | `REAL_PAID_SUBSCRIPTION_WHERE` exige `mpPreapprovalId != null`. Se separan **suscritos** vs **trial/comp**. |
| Referidos borrados | `REAL_REFERRAL_WHERE` incluye `deletedAt: null` en todas las queries. |
| "Asesores activos" | Renombrado a **asesores reales** + desglose (Pro / trial-comp / freemium). |
| `mrrNew` por nombre | Dedupe por `advisor.id`. |
| Ratio >100% | Numerador y denominador de la **misma** población; sin datos → `null` → "—". |
| Benchmark sin fuente | **Eliminado**. Se muestra *"Aún no hay suficiente volumen para benchmark"*. |
| PII | Fuera de overview, problems, narrative, timeline, campaigns, inteligencia y carátulas. Prompt de IA prohíbe nombres de clientes. "Top referidores" → **distribución anónima** (1 / 2 / 3–5 / 6+). Drilldowns usan `Referidor #A82F`. |
| Endpoints muertos | `summary`, `breakdown`, `ranking`, `trends`, `problems` **eliminados** (sin consumidores y sin filtros). |
| Footguns | `prisma/_guard.ts` obliga base **local** en scripts destructivos; se quitó `prisma.seed`; `/api/demo/reset` → 404 en producción. |

## 3. Privacy boundary (regla permanente)
```
Advisor UI      → puede ver SUS clientes (nombre, teléfono, correo). Es su cartera.
Owner Analytics → NUNCA PII de clientes. Solo agregados y referencias anónimas.
Owner Operations→ si validar un documento exige ver PII, se ve AL ABRIR el
                  documento. Explícito, mínimo y separado de analytics.
```
Permitido en Owner: **nombre y correo del ASESOR** (son los clientes de Referidoo).
Prohibido: `Client.name/email/phone/policyNumber/clabe/accessToken/referralCode`, `Referral.leadName/leadPhone/leadEmail`.

**Guardián automático:** `src/app/api/owner/__tests__/owner-pii-guard.test.ts` escanea todo el plano de control y **falla** si reaparece PII, el benchmark sin fuente, o una query sin alcance real. Los endpoints de *operación* (`backfill-trials`, `caratulas`, `resend-verification`) están en una allowlist explícita y revisable.

## 4. Zero-truth baseline
Con el alcance real aplicado, si no hay negocio real Owner debe mostrar **0** y no romperse: MRR 0, referidos 0, GWP 0, sin benchmark, sin top referrers, sin insight de IA. **Cero es mejor que inteligencia falsa.**

## 5. Lo que queda pendiente (no implementado en este run)
- **`convertedAt` inmutable**: hoy la fecha de cierre sigue siendo `updatedAt` (mutable). Es un cambio de schema + backfill que merece su propia decisión. **Riesgo vigente**: validar una carátula mueve un cierre de periodo.
- **Nueva IA de Owner** (Resumen / Asesores / Crecimiento / Ingresos / Operación / Configuración): es reorganización de UI; los datos ya son honestos.
- **Tabla de performance por asesor** y **detalle de asesor** con estados (SETUP / ACTIVATING / ACTIVATED / DEEP ACTIVATED).
- **Limpieza de datos en producción**: ver `13-PROD-DATA-CLEANUP-PLAN.md`. **Nada se borró.**
