# 13 · Plan de limpieza de datos en producción

> **EJECUTADO PARCIALMENTE EL 24-SEP-2026.** Se corrieron las 5 migraciones aditivas y el marcado de cuentas internas. **No se ha borrado nada.** Ver §0 bis.

---

# 0 bis · RESULTADO REAL DEL DRY RUN (24-sep-2026)

Ya no son hipótesis. Cifras leídas de Turso producción con `prisma/prod-dry-run-ONE.sql`.

**38 cuentas de asesor en total; solo 9 vivas** (29 con `deletedAt`).

| Cuenta | Cartera | Referidos | Clasificación (decidida por Patrick) |
|---|---|---|---|
| Patrick (dueño) · hotmail | 4 | 6 | **Excluida** — owner |
| QA Smoke Test · patrickkarim2002@gmail | 0 | 0 | **Excluida** — pruebas de prod |
| Marcela Romo | 0 | 0 | **Excluida** — alta de cortesía, nunca usó el producto |
| Patrik Montiel · gmail | 0 | 0 | **Excluida** — origen desconocido, 0 uso |
| CECILIA CARRASCO CAMPOS | 1 | 1 | Real |
| Omar Juarez | 2 | 5 | Real |
| EDUARDO NERI · planeacion.finanzas | 2 | 1 | Real (cuenta viva confirmada) |
| Angel Israel Sosa Gómez | 1 | 1 | Real |
| Rodrigo De la Mora · @ahoraseguros.com | 0 | 0 | Real — **inbound orgánico, 18-sep** |

## Baseline honesto de Referidoo
| Métrica | Valor real |
|---|---|
| Asesores reales | **5** |
| MRR | **$0** — ninguna cuenta tiene suscripción de MercadoPago |
| Cartera conectada (total, los 5) | **6 clientes** |
| Referidos | **8** |
| Conversiones **reales de negocio** | **0** (la única `converted` es una prueba de Cecilia) |
| Activaciones de cartera | **0** |

## Hallazgos que corrigen supuestos anteriores
1. **Cecilia tiene 1 cliente, no 4–5.** Su único referido convertido **fue una prueba** (confirmado por Patrick), así que **nadie está activado todavía**. El experimento arranca desde cero y empieza por importar su cartera real.
2. **Rodrigo De la Mora es el primer asesor que llegó solo** (por redes, 18-sep). Verificó cuenta, está en trial y lleva días sentado en un onboarding vacío. Es el caso de uso más urgente del producto.
3. **30 de los 46 clientes de la base están en una cuenta borrada** (`patrickmontiel@outlook.com`). Patrick decidió que no importan; ya quedan fuera de analytics por `deletedAt`.
4. **El MRR fantasma era pequeño:** solo 2 cuentas en `plan='paid'` sin MercadoPago ($1,078 nominales), ambas ahora excluidas.
5. **Cero referidos borrados y cero huella de fixtures en prod.** El bug de no filtrar `Referral.deletedAt` era real pero no había hecho daño.
6. **Existe 1 grupo de clientes duplicados** por teléfono dentro del mismo asesor. No se fusionó (requiere decisión).

## Lo que se ejecutó
- Las 5 migraciones aditivas, cada una verificando su propio resultado: `analyticsExcluded`, `normalizedPhone/Email/updatedAt` (+ backfill de 46 clientes), `products/defaultChannel`, `ReferralCampaign`/`CampaignRecipient` (+ `campaignId` en `ProductEvent`), `convertedAt`.
- `prisma/prod-mark-internal-accounts.sql` — un `UPDATE` marcando las 4 cuentas internas. Reversible.
- Verificado con `prisma/prod-verify-truth.sql`.

## Lo que quedó pendiente
- **Backfill de `convertedAt` grupo A** (4 de 9 convertidos con fecha confiable). Sin correr. Es cosmético: ninguno pertenece a un asesor real.
- **El referido de prueba de Cecilia** sigue contando como 1 conversión en Owner. No se toca por la regla de no alterar datos de Cecilia/Omar/Eduardo. Lo más limpio es que **Cecilia lo borre desde su propio panel**.
- **Ningún borrado.** Las 29 cuentas con `deletedAt` siguen ahí y ya están fuera de analytics.

---

## 0. Principio
> No se borra nada que no podamos **demostrar** que es falso. Lo que no se pueda demostrar se marca **UNKNOWN** y se decide a mano.

## 1. Verdad conocida
**Asesores REALES (confirmados por Patrick):** CECILIA CARRASCO CAMPOS · Omar Juarez · EDUARDO NERI.
**Owner real:** la cuenta de Patrick.
Todo lo demás debe demostrarse antes de contarse como negocio real.

## 2. Fuentes de contaminación identificadas (con evidencia en código)
| # | Fuente | Qué metió a prod | Clasificación |
|---|---|---|---|
| 1 | `prisma/add-advisor-plan-verification.ts:33` | `UPDATE Advisor SET emailVerified=true, plan='paid' WHERE emailVerified=false` → **MRR fantasma** ($539 por cabeza sin suscripción) | REAL-LOGIC-GONE-WRONG |
| 2 | `prisma/seed.ts` | Borra 5 tablas y crea `eduardo@referidoo.mx` "Eduardo Neri" + settings + 3 tiers. Estaba enganchado a `prisma.seed` | DEMO-SEED |
| 3 | `prisma/seed-blur-test.ts` | `blur-test@referidoo.mx` + 1 cliente + **15 referidos falsos** (teléfonos `55 1111 00xx`, cliente `55 9999 0001`) | DEMO-SEED |
| 4 | `e2e/signup.spec.ts` | Registra advisors reales `e2e-<ts>@referidoo-test.mx` en **cada corrida** | TEST-ACCOUNT |
| 5 | `prisma/comp-advisor.ts` | Comps manuales → `plan='paid'` sin suscripción = más MRR fantasma | REAL-LOGIC (ops) |
| 6 | `prisma/reset-demo.ts` | `DELETE FROM Referral; DELETE FROM Client;` **sin WHERE** contra prod | DEMO-SEED (destructivo) |
| 7 | Smoke test de producción (sep-2026) | 1 advisor QA (`patrickkarim2002@gmail.com`) — sus datos ya se **limpiaron** (0/0/0), la cuenta sigue viva | TEST-ACCOUNT |

**Ya mitigado en código (Fase 1):** #2, #3 y #6 ya no pueden correr contra prod (`prisma/_guard.ts`); `prisma.seed` desenganchado; `/api/demo/reset` da 404 en producción.

## 3. ✅ Caso Eduardo Neri — RESUELTO (decisión de Patrick, sep-2026)
| Cuenta | Clasificación | `analyticsExcluded` |
|---|---|---|
| **`planeacion.finanzas@gmail.com`** — EDUARDO NERI | **ASESOR REAL** | **`false`** |
| `eduardo@referidoo.mx` (creada por `seed.ts`) | DEMO/TEST | **`true`** |
| `eduardo.neri.test@referidoo.mx` (placeholder) | DEMO/TEST | **`true`** |

Salvo que el dry-run encuentre **evidencia inequívoca en contra**, las dos últimas se tratan como demo/test. **Ninguna se borra todavía** — solo se marcan.

### Asesores reales definitivos (`analyticsExcluded = false`)
1. CECILIA CARRASCO CAMPOS
2. Omar Juarez
3. EDUARDO NERI — `planeacion.finanzas@gmail.com`

Todo lo demás → `analyticsExcluded = true`.

## 4. Orden de ejecución propuesto

### PASO A — Diagnóstico (SOLO LECTURA, seguro)
```bash
# En el SQL shell de Turso producción:
#   ejecutar prisma/prod-data-truth-dry-run.sql (todo SELECT)
```
Entrega: inventario de advisors + clasificación propuesta, volumen por tabla, MRR fantasma cuantificado, referidos borrados que contaban, huella de fixtures.

### PASO B — Migraciones aditivas (seguras, no borran)
```bash
npx tsx prisma/add-analytics-excluded.ts      # Advisor.analyticsExcluded
npx tsx prisma/add-client-identity.ts         # normalizedPhone/Email/updatedAt + backfill
npx tsx prisma/add-referral-campaigns.ts      # si Campaigns V1 aún no está en prod
```
Todas son `ADD COLUMN` / `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX`. **Ninguna borra.**

### PASO C — Marcar cuentas internas (UPDATE, reversible)
Con la lista del PASO A ya revisada por ti. **Reversible** (volver a `0` restaura).
```sql
-- Owner + QA + e2e + seeds. AJUSTAR según el inventario real del PASO A.
-- 1) Marcar TODO como interno por defecto…
UPDATE Advisor SET analyticsExcluded = 1;

-- 2) …y devolver a REAL solo a los tres confirmados por Patrick.
--    (Ajustar los nombres exactos con el inventario del PASO A.)
UPDATE Advisor SET analyticsExcluded = 0
WHERE email = 'planeacion.finanzas@gmail.com'          -- EDUARDO NERI (real)
   OR name LIKE '%CECILIA%' OR name LIKE '%Cecilia%'   -- CECILIA CARRASCO CAMPOS
   OR name LIKE '%Omar%';                              -- Omar Juarez

-- Este orden (denegar-por-defecto) es más seguro que enumerar las de test:
-- una cuenta nueva desconocida queda FUERA de métricas hasta aprobarla.

-- Verificar ANTES de continuar:
SELECT name, email, analyticsExcluded FROM Advisor ORDER BY analyticsExcluded DESC, name;
```
> **Los 3 asesores reales deben quedar en `analyticsExcluded = 0`.** Verifícalo explícitamente.

### PASO D — Borrado de actividad falsa (DESTRUCTIVO — requiere tu aprobación)
**Regla:** solo se borra actividad de cuentas **TEST/DEMO demostrables**. **NUNCA** se borra automáticamente nada de Cecilia, Omar o Eduardo.

**Preferencia: conservar la cuenta QA, borrar su actividad.**
```sql
-- ⚠️ NO EJECUTAR SIN APROBACIÓN. Sustituir la lista por los IDs del PASO A.
-- Orden seguro por dependencias: eventos → recipients → campañas → referidos → clientes.

-- 0) Fijar el conjunto objetivo y REVISARLO antes de nada:
SELECT id, name, email FROM Advisor
WHERE email LIKE '%@referidoo-test.mx' OR email LIKE '%@local.test'
   OR email IN ('blur-test@referidoo.mx');

-- 1) ProductEvent
DELETE FROM ProductEvent WHERE advisorId IN (<IDS>);
-- 2) CampaignRecipient  (si la tabla existe)
DELETE FROM CampaignRecipient WHERE advisorId IN (<IDS>);
-- 3) ReferralCampaign
DELETE FROM ReferralCampaign WHERE advisorId IN (<IDS>);
-- 4) BubbleClaim (cuelga de Client)
DELETE FROM BubbleClaim WHERE clientId IN (SELECT id FROM Client WHERE advisorId IN (<IDS>));
-- 5) Referral (antes que Client: referrerId apunta a Client)
DELETE FROM Referral WHERE advisorId IN (<IDS>);
-- 6) Client
DELETE FROM Client WHERE advisorId IN (<IDS>);
-- 7) La cuenta NO se borra: queda viva con analyticsExcluded = 1.
```

### PASO E — Verificación post-limpieza
```sql
SELECT
  (SELECT COUNT(*) FROM Advisor WHERE deletedAt IS NULL AND analyticsExcluded = 0) AS asesores_reales,
  (SELECT COUNT(*) FROM Advisor WHERE deletedAt IS NULL AND analyticsExcluded = 0
     AND plan='paid' AND mpPreapprovalId IS NOT NULL) * 539                        AS mrr_real,
  (SELECT COUNT(*) FROM Referral r JOIN Advisor a ON a.id=r.advisorId
     WHERE r.deletedAt IS NULL AND a.deletedAt IS NULL AND a.analyticsExcluded = 0) AS referrals_reales;
```
Esperado: **3 asesores reales**, y MRR/referrals con el número honesto (probablemente **0**). Cero es el resultado correcto si no hay negocio real todavía.

## 5. Qué NO se borra (y por qué)
| Ítem | Decisión |
|---|---|
| Advisors QA/test | **NO se borran.** Se marcan `analyticsExcluded = 1`. Se necesitan para smoke tests. |
| Cecilia / Omar / Eduardo | **NO se toca nada** automáticamente. |
| `eduardo@referidoo.mx` vs `eduardo.neri.test@…` | **UNKNOWN** → decisión tuya (punto 3). |
| Referidos con `deletedAt` de asesores reales | **NO se borran**: son rastro contable/antifraude. Ya **no cuentan** en métricas (filtro `deletedAt: null`). |
| Duplicados de cartera preexistentes | **NO se fusionan automáticamente.** La migración los reporta; fusionar es una decisión por caso. |
| MRR fantasma (plan='paid' sin MP) | **NO se cambia el `plan` a ciegas** — podría ser un comp legítimo. La métrica ya lo excluye del MRR real; si además quieres corregir el dato, es otra decisión. |

## 6. Guardrails para no volver a contaminar
1. `Advisor.analyticsExcluded` + alcance único (`src/lib/analytics-scope.ts`) — ya implementado.
2. Scripts destructivos solo contra base **local** (`prisma/_guard.ts`) — ya implementado.
3. `prisma.seed` desenganchado de `package.json` — ya implementado.
4. `/api/demo/reset` → 404 en producción — ya implementado.
5. Test guardián que falla si una query de owner no usa el alcance real — ya implementado.
6. **Pendiente:** marcar `analyticsExcluded = 1` automáticamente en las cuentas que crea el e2e.
