# 03 · Datos y Métricas — modelo conceptual + instrumentación

> Fuente: `prisma/schema.prisma` (8 modelos) + lógica. `[CV]` = verificado.

## Grafo conceptual (entidades reales)
```
Advisor ─1:1─ AdvisorSettings   (config premios, mensajes, credibilidad, burbuja)
   │  ─1:N─ RewardTier          (escalera de premios)
   │  ─1:N─ PlanEvent           (bitácora billing/atribución)
   │  ─1:N─ Client              (cartera; cada uno con referralCode + accessToken)
   │           └─1:N─ BubbleClaim
   │  ─1:N─ Referral ◄── referrerId (Client) ── el cliente que refirió
   │            (lead → contacto → conversión → premio + comisión)
OwnerBriefing  (singleton: narrativa IA del owner)
```
`Advisor → Client → Referral` es la espina dorsal. Un `Referral` apunta al `Advisor` **y** al `Client` que lo refirió (`referrerId`).

## Modelos (para producto, no solo schema)

### `Advisor` (`schema.prisma:10`)
El asesor. Campos clave: `plan` ("freemium" default), `emailVerified`, `verificationToken` (unique), **`mpPreapprovalId`** (unique; su presencia = suscripción MP real; ausencia con plan="paid" = trial), `paidUntil`, `paymentFailedAt` (ancla del grace), `onboardedAt` (sella fin del tour), `deletedAt` (soft-delete). Timestamps: `createdAt`, `paidUntil`, `paymentFailedAt`, `onboardedAt`, `deletedAt`.

### `AdvisorSettings` (`:33`, 1:1)
Config por asesor: `afterLastTier` (cycle/flat/stop), `flatAmount` (1500), `whatsappMessage`/`advisorInviteMessage`/`welcomeMessage`, `schedulingUrl`, **credibilidad** (`credential`=cédula, `yearsExperience`, `peopleServed` — se muestran en `/r/[code]`), **burbuja** (`bubbleAutoPoints`=150, `bubbleGmmPoints`=300, `bubbleClaimThreshold`=500).

### `RewardTier` (`:54`)
La escalera: `position`, `amount`, `label`. Unique `[advisorId, position]`. Default UI `[1500,1500,3500]`.

### `Client` (`:65`)
El cliente-referidor. `referralCode` (unique, para `/r/`), **`accessToken`** (unique cuid, para el portal `/c/`), `active`, `launchBonusUsed`, `bubblePoints`, **CLABE** (`clabe`/`clabeBank`/`clabeHolder`). **Solo `createdAt`** — NO hay `portalOpenedAt`/`lastSeenAt`/`linkSharedAt`.

### `BubbleClaim` (`:90`) — hoy LATENTE (flag oculta la UI)
Reclamo de premio burbuja: `amount`, `status` (pending|paid), `paidAt`.

### `PlanEvent` (`:103`) — bitácora, NO analytics de producto
`event` (string) + `createdAt`. El comentario dice `activated|failed|cancelled` pero en la práctica se escriben: `activated` (webhook MP), `failed` (rechazo MP), `cancelled` (cron downgrade ×3), `trial_ending_notified` (dedupe cron), `unete:{slug}` (atribución al registro), `unete_reward_self` / `unete_reward:{id}` (premios pagados), `linksent:{clientId}` (envío de link). **No hay evento para acciones de producto del funnel.**

### `OwnerBriefing` (`:117`)
Singleton con la última narrativa IA del owner (`narrative`, `generatedAt`; refresh 14 días).

### `Referral` (`:123`) — el modelo rico
Lead + conversión + premio + comisión + antifraude. Campos:
- **Estados:** `status` (pending|contacted|in_process|converted|rejected), `rewardStatus` (pending|approved|paid).
- **Dinero:** `saleAmount` (monto reportado), `rewardAmount` (premio al cliente), `lessioCommission` (comisión de Referidoo; **null = no calculada**, nunca 0), `tierPosition`.
- **Producto:** `productType`, `interestProductType`.
- **Antifraude:** `caratulaUrl`, `caratulaStatus` (pendiente|validada|discrepancia), `confirmedByReferrer`, `referrerConfirmedAt`.
- **Attribution/timestamps:** `createdAt`, `updatedAt`, **`contactedAt`** (1er contacto → tiempo-a-contacto), **`rewardApprovedAt`** (ancla del corte de 30d), `rewardPaidAt`, `billedAt` (cuándo se facturó la comisión), `deletedAt` (soft-delete para rastro antifraude del owner).
- **Preferencias del lead:** `preferredDays`, `preferredHours`.

## Campos legacy / oculto / deuda de schema
- **Burbuja** (`bubblePoints`, `BubbleClaim`, `bubble*Points/Threshold`): construida y viva en backend, **oculta por flag**; hoy no acumula porque Auto/GMM no son seleccionables → **código latente**. `[CV]`
- **`PlanEvent.event` mal documentado** en el schema (lista 3, hay ≥8 valores). `[CV]`
- **`linkSent` NO es columna de DB** — se deriva de `PlanEvent linksent:*` en el SSR de clientes; `/api/admin/clients-data` no lo devuelve (gap). `[CV]`
- **No se guarda:** apertura de portal, compartición de link, clics de WhatsApp, vistas de landing, inicio de formulario. `[CV]`

---

# Instrumentación / eventos / métricas

> **ACTUALIZACIÓN (sep-2026):** el funnel viral ya **NO es ciego**. Se implementó el modelo `ProductEvent` + el endpoint `/api/events` + el cockpit `/owner/activacion`. Ver el detalle completo en **`11-INSTRUMENTACION-FUNNEL.md`**. La sección "B. Lo que NO podemos medir" de abajo describía el estado ANTERIOR; los ítems del funnel ahora sí se miden (se marcan abajo).

## Analytics existente
**Solo `@vercel/analytics/next`** (`layout.tsx`) = Vercel Web Analytics (pageviews automáticos, **sin eventos custom**). **NO hay PostHog, GA, Segment, Mixpanel, Amplitude, Plausible.** `[CV]`

## A. Lo que HOY podemos medir `[CV]`
De timestamps de DB + PlanEvents:
- **Asesor:** registro (`Advisor.createdAt`), email verificado (`emailVerified`, sin timestamp propio — solo booleano), onboarding completado (`onboardedAt`), upgrade a Pro (`PlanEvent activated` / `mpPreapprovalId`), downgrade (`PlanEvent cancelled`), fallo de pago (`paymentFailedAt` / `PlanEvent failed`).
- **Referido:** creado (`Referral.createdAt`), primer contacto (`contactedAt` → **time-to-contact real**), convertido (status + `updatedAt`), premio aprobado (`rewardApprovedAt`), premio pagado (`rewardPaidAt`), confirmado por el cliente (`referrerConfirmedAt`), comisión facturada (`billedAt`).
- **Time-to-X calculables:** time-to-first-client (`Advisor.createdAt`→primer `Client.createdAt`), time-to-first-referral (→primer `Referral.createdAt`), time-to-contact (`Referral.createdAt`→`contactedAt`), time-to-close (`createdAt`→`updatedAt` en converted). `[INF]` — calculables aunque no haya una vista que los muestre.
- **Atribución unete** (PlanEvent `unete:*`).

## B. Funnel viral — antes CIEGO, ahora INSTRUMENTADO `[CV]`
> ✅ **RESUELTO (sep-2026)** por `ProductEvent` — cada ítem de abajo hoy se registra (ver `11`): portal abierto (`client_portal_opened`), link enviado/copiado (`portal_link_sent` con channel), compartir (`referral_share_clicked`), landing vista (`referral_landing_viewed`), formulario iniciado (`referral_form_started`), + `client_created` y `referral_created`. Lo que sigue abajo es el diagnóstico ORIGINAL de la auditoría (estado previo).

**Estado previo — NO EXISTÍA INSTRUMENTACIÓN** para:
- **Portal del cliente abierto** — `GET /api/portal/[token]` es solo lectura, no marca timestamp ni evento.
- **Link compartido / copiado** — clipboard y `wa.me` se abren sin `fetch` a ningún endpoint.
- **WhatsApp clickeado** — sin tracking.
- **Landing del referido vista** (`/r/[code]`) — solo lee, no registra vista.
- **Formulario del referido iniciado/abandonado** — solo hay señal al **enviarse** (creación de `Referral`).
- **time-to-share** (cliente recibe → comparte) — imposible: no se registra ni "recibió" ni "compartió".

> El único punto medible del funnel viral es la **conversión final a lead**. Toda la cadena `cliente recibe link → abre → comparte → conocido ve landing → inicia forma` es invisible. **Esto es el hueco #1 para un futuro Growth Dashboard.**

## Deuda de series `[CV]`
- `trends/route.ts` reconstruye MRR/activos desde PlanEvent pero **no hay backfill** → la serie empieza vacía.
- El **toggle manual de plan del owner no escribe PlanEvent** → serie de activación/churn incompleta.
