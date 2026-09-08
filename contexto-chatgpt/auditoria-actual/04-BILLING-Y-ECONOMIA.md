# 04 · Billing y Economía — Free/Pro/Trial · Comisión · Premio · Mercado Pago

> Todo verificado contra código y tests (`rewards.test.ts`, `plan.test.ts`, `billing-*.test.ts`). `[CV]` = código verificado.

## 1. El asesor: Free / Pro / Trial

### Trial (`src/app/api/auth/register/route.ts`) `[CV]`
- Todo registro nace **`plan:"paid"`, `paidUntil = now + 30 días`** (`TRIAL_MS`), `mpPreapprovalId=null`. Un `"paid"` sin `mpPreapprovalId` = **está en trial**.
- **[DOC vs CÓDIGO]** `NEGOCIO.md` dice "14 días"; el código = **30 días**. Vigente: 30.

### Free (freemium) `[CV]`
- `FREEMIUM_LEAD_LIMIT = 5` (`lib/plan.ts:3`, confirmado por test).
- **Clientes ilimitados** — `canAdvisorAddClients` solo bloquea si el email no está verificado (`plan.ts:12-23`); `remainingClientQuota` = `{remaining:null}`.
- **Tope de 5 leads** aplicado en `api/referrals/route.ts:98-99`: `isFreemiumOverLimit = plan==="freemium" && advisorLeadCount >= 5`. **No bloquea la creación** del lead — el referral se crea igual; lo que cambia es que **al asesor no le llega** (`skipAdvisor`) y recibe un email de upgrade; Patrick sí recibe los datos. En la UI (`ReferidosClient.tsx:414`) los excedentes se difuminan.

### Pro ($539/mes) `[CV]`
- Leads ilimitados, comisión más baja, envío masivo de links por correo (`send-links`, gate servidor 403 si no Pro).

### Downgrade / cancelación / renovación / fallos (cron `billing-downgrade`) `[CV]`
Red de seguridad diaria (17:00 UTC). Baja a `freemium` en 3 grupos, cada uno registra `PlanEvent "cancelled"`:
1. **Expirado**: `paid` AND `paidUntil < now`. A los sin `mpPreapprovalId` (trial) les manda `sendTrialDowngradedEmail`.
2. **Pago fallido > grace**: `paid` AND `paymentFailedAt < now-3días` (`GRACE_PERIOD_MS=3d`).
3. **Trial stale**: `paid` AND `paidUntil=null` AND `mpPreapprovalId=null` AND `createdAt < now-30d`.
- **Cancelación** (`api/billing/cancel`): cancela en MP, **no toca plan/paidUntil** → conserva Pro hasta que `paidUntil` pase.

## 2. Comisión de Referidoo (lo que se cobra al asesor)

### Fórmula (`src/lib/rewards.ts:33-43`) `[CV]`
```
calculateLessioCommission(productType, saleAmount, plan):
  si !productType || !saleAmount → null
  rate = LESSIO_COMMISSION_RATES[productType]?.[ plan==="paid" ? "paid" : "freemium" ]
  si no existe → null
  return Math.round(saleAmount × rate)
```
Se calcula **sobre `saleAmount`** (el monto reportado que la carátula bloquea). No distingue "valor del plan" vs "prima" en código — es un solo campo cuya semántica depende del producto.

### Tasas (`rewards.ts:25-31`) `[CV]`
| Producto | freemium | paid |
|---|---|---|
| **PPR** | 0.25% | 0.15% |
| **Vida** | 0.25% | 0.15% |
| Daños/Auto `LEGACY/OCULTO` | 1.5% | 0.8% |
| GMM `LEGACY/OCULTO` | 1.5% | 0.8% |
| Otro | 1.5% | 0.8% |

> Freemium paga **~2×** que Pro → palanca de upgrade (decisión /office-hours 2026-06-29). **⚠️ La tabla está duplicada hardcoded en 5 archivos** (`rewards.ts`, `perfil/page.tsx`, `ReferidosClient.tsx`, `AdminOverviewClient.tsx`, `owner/configuracion/page.tsx`) — hoy sincronizadas.

### Ejemplos numéricos (de los tests reales) `[CV]`
- Vida $100,000, **paid** → **$150** · **freemium** → **$250**
- Daños/Auto $100,000 (legacy), paid → $800 · freemium → $1,500
- Producto desconocido → **null**

### Cuándo/cómo se genera, valida y cobra `[CV]`
- **Genera:** al convertir (o corregir producto/monto de un convertido no pagado) → `Referral.lessioCommission` (`api/referrals/[id]/route.ts:142,185`). `saleAmount` obligatorio.
- **Valida:** antifraude IA compara la carátula (ver `05`).
- **Cobra:** cron `billing-commission` (12:00 UTC): para asesores `paid` con `mpPreapprovalId` cuyo `paidUntil` cae en ≤24h, suma `lessioCommission` de los `Referral` con `billedAt:null` y hace **PUT a Mercado Pago = `$539 + comisiónAcumulada`**, luego marca esos referrals `billedAt:now`. Si el PUT falla, **no** marca (rueda al día siguiente, no se pierde ni duplica).
- **Qué ve el owner:** comisión por facturar (billedAt:null), comisión cobrada, GWP.

## 3. Premio al cliente (escalera + burbuja)

### Escalera (`rewards.ts:85-135`) `[CV]`
- Config: `RewardTier` por asesor + `AdvisorSettings.afterLastTier` (cycle/flat/stop) + `flatAmount`.
- `computeRewardForPosition`: `nextPosition = completedReferrals+1`; sin tiers → **1500 plano**; con tier en esa posición → su amount; `cycle` (default) → posición cíclica; `flat` → flatAmount; `stop` → último tier.
- **Solo Vida/PPR (o sin producto) avanzan** (`ESCALERA_PRODUCTS=["Vida","PPR"]`). Daños/Auto/GMM → burbuja. **"Otro" no genera premio en efectivo** (`tierPosition=0, rewardAmount=0`).
- Asignación por **orden de conversión**, no de registro.
- **Launch bonus:** +$1,000 sobre el premio del **nivel 1** si el referrer junta **≥3 referidos en sus primeros 7 días** (marca `launchBonusUsed`; se libera si el referido del nivel 1 se borra).
- **[DISCREPANCIA de montos]** comentario "1500/1500/2500" vs default UI **1500/1500/3500** vs default sin-tiers **1500 plano**. La fuente de verdad operativa = lo que el asesor configura en `/admin/niveles` (default UI 1500/1500/3500).

### Estados del premio (`rewardStatus`) `[CV]`
`pending → approved` (sella `rewardApprovedAt`, ancla del corte) `→ paid` (sella `rewardPaidAt`, email al cliente). No se puede borrar un referral con premio approved/paid o comisión billed.

### Corte obligatorio `[CV]`
`REWARD_CUTOFF_DAYS = 30` (`lib/utils.ts:67`): el asesor tiene 30 días desde que se aprueba para pagarle al cliente; morosidad → cola de problemas del owner + recordatorios día 7/14 (`cron/reward-reminders`).

### CLABE y pago real `[CV]`
El cliente guarda `clabe/clabeBank/clabeHolder` en su portal. El pago se hace **por fuera** (transferencia bancaria). `api/clients/[id]/pay-rewards` solo cierra el ciclo en la app (marca `paid`) — **no es un rail de pago** (comentario explícito).

### Burbuja — `LEGACY/OCULTO` (`SHOW_BUBBLE_REWARDS=false`) `[CV]`
Backend vivo: puntos por producto (Auto 150, GMM 300), umbral de reclamo 500, `bubblePoints` acumula al convertir Auto/GMM/Otro, `claim-bubble` crea `BubbleClaim`. **Hoy no acumula en la práctica** (Auto/GMM no seleccionables). Código latente.

## 4. Mercado Pago — state machine `[CV]`

### Variables de entorno (solo nombres)
`MP_ACCESS_TOKEN` (API), `MP_WEBHOOK_SECRET` (firma webhook), `MP_PLAN_ID` (PreApprovalPlan, creado 1 vez con `scripts/mp-create-plan.ts`), `NEXT_PUBLIC_MP_PUBLIC_KEY` (browser, tokeniza tarjeta), `NEXT_PUBLIC_BASE_URL`. `MONTHLY_PRICE_MXN=539` (constante, no env).

### Alta / tokenización / subscribe
- Frontend (`UpgradeCardForm`): campos hosted (Secure Fields), `createCardToken` → el PAN nunca toca el backend. POST `/api/billing/subscribe {cardTokenId}`.
- `createSubscription` (`mercadopago.ts:36-57`): `PreApproval.create` con `preapproval_plan_id=MP_PLAN_ID`, `external_reference=advisor.id`, `card_token_id`, `status:"authorized"` — **sin redirect** (esta cuenta MP lo exige así, probado en sandbox).
- subscribe: si `status==="authorized"` → `mpPreapprovalId`, `plan:"paid"`, `paidUntil=now+30d`, re-firma JWT.

### Webhooks (`api/webhooks/mercadopago`) — firma HMAC validada (fail-closed sin secret)
- **`subscription_authorized_payment`** (cada cobro): `data.id` = **Invoice** (`GET /authorized_payments/{id}`). `approved` → `paidUntil += 30d`, `paymentFailedAt=null`, `PlanEvent activated`; **si no logra guardar → HTTP 500 para que MP reintente** (nunca deja al asesor pagado en freemium). `rejected` → `paymentFailedAt=now` (solo si no había una) + `PlanEvent failed`.
- **`subscription_preapproval`** (alta): activa `paid` + `PlanEvent activated`.

### Máquina de estados reconstruida `[CV]`
```
register → [TRIAL] plan=paid, paidUntil=+30d, mpPreapprovalId=null
  ├─ cron trial-ending (≤3d) → email
  ├─ subscribe/webhook → [PAID] mpPreapprovalId + paidUntil rodante
  └─ trial vence sin suscribir → cron downgrade → [FREEMIUM]
[PAID]
  ├─ cobro approved → paidUntil += 30d
  ├─ cobro rejected → paymentFailedAt=now [GRACE 3d] → sigue fallando → cron downgrade → [FREEMIUM]
  ├─ cancel (usuario) → MP cancelado; paid hasta paidUntil → cron downgrade → [FREEMIUM]
  └─ cron billing-commission (24h antes) → suma comisión al próximo cobro
```

### Reactivación
No hay endpoint dedicado de "reactivar" — el asesor vuelve a `/admin/perfil` y suscribe de nuevo (crea nuevo `mpPreapprovalId`). `[INF]`

## 5. Comp de trial (operación manual del owner)
El toggle "a paid" del panel /owner **NO fija `paidUntil`** → el cron lo revierte. El comp real = `plan='paid'` + `paidUntil=+30d` + `paymentFailedAt=null` vía SQL/script (`prisma/comp-advisor.ts`). `[CV]`
