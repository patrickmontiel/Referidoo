# 15 · Metrics Dictionary — definiciones únicas

> **Regla fundamental:** un número solo puede existir en Owner si aquí está definido: de qué registros sale, cuál es su denominador, qué cuentas incluye y qué significa. **Sin dato real → `0` o "Sin datos suficientes". Nunca un valor demo.**
>
> Esta es la **fuente única** de definiciones. Si una métrica no está aquí, no se muestra.

## Filtro global de alcance (aplica a TODAS las métricas de Owner)
```
Advisor:  deletedAt = null  AND  analyticsExcluded = false
Client:   active = true                    (salvo que la métrica diga lo contrario)
Referral: deletedAt = null
```
- `analyticsExcluded` es una **propiedad explícita** del Advisor (no un email hardcodeado en cada query). La cuenta de Owner, QA, demos e internas van con `analyticsExcluded = true`.
- Implementación: un único fragmento compartido (`REAL_ADVISOR_WHERE`) reutilizado por todas las queries de analytics — nunca duplicar el filtro a mano.

---

## Métricas de cartera

### PORTFOLIO SIZE
- **DEFINITION:** clientes activos que el asesor tiene conectados.
- **NUMERATOR:** `count(Client)` · **DENOMINATOR:** — (conteo absoluto)
- **SOURCE:** `Client`
- **FILTERS:** `advisorId = X`, `active = true`
- **UNIQUE/RAW:** único por Client
- **EDGE CASES:** clientes desactivados (`active=false`) NO cuentan; un Client duplicado por import inflaría esto → depende de la persistencia de cartera (Fase 2).

### CONTACTABLE PORTFOLIO
- **DEFINITION:** clientes con al menos un canal utilizable.
- **NUMERATOR:** `count(Client where phone != null OR email != null)` · **DENOM:** —
- **SOURCE:** `Client`
- **FILTERS:** scope global + `active = true`
- **EDGE CASES:** un cliente sin teléfono **y** sin correo existe pero es **NO CONTACTABLE**; nunca debe contarse como "audiencia" de un canal que no puede recibirlo.

---

## Métricas de activación

### ACTIVATION AUDIENCE
- **DEFINITION:** Clients únicos incluidos en una activación **iniciada**.
- **NUMERATOR:** `count(distinct CampaignRecipient.clientId)` de la activación · **DENOM:** —
- **SOURCE:** `CampaignRecipient`, `ReferralCampaign`
- **FILTERS:** `campaignId = X` (o campañas con `startedAt != null` para agregados)
- **UNIQUE/RAW:** **único por Client** (el `@@unique([campaignId, clientId])` lo garantiza dentro de una activación).
- **EDGE CASES:** un Client en N activaciones cuenta N veces a nivel "recipients", pero **una sola vez** en "Clients únicos activados" (ver siguiente).

### PORTFOLIO ACTIVATION RATE
- **DEFINITION:** qué parte de la cartera ha sido activada alguna vez.
- **NUMERATOR:** `count(distinct clientId)` en CampaignRecipient de activaciones iniciadas
- **DENOMINATOR:** **PORTFOLIO SIZE**
- **SOURCE:** `CampaignRecipient` + `Client`
- **UNIQUE/RAW:** numerador **único por Client** (no por recipient) — si no, un Client en 3 activaciones daría >100%.
- **EDGE CASES:** puede pasar de 100% si el numerador no se hace único → **prohibido**; si `denominator = 0` → `null` / "Sin datos".

### CONTACTED / ACTIONED  ⚠️ semántica por canal
- **DEFINITION:** depende del canal — **no se combinan sin etiqueta correcta**.
  - **Email → "Enviado"**: el proveedor (Resend) **aceptó** el envío. NO significa entregado ni leído.
  - **WhatsApp assisted → "Acción de envío"**: el asesor **pulsó** enviar. NO significa que el mensaje se envió, ni entrega, ni lectura.
- **NUMERATOR:** `count(CampaignRecipient where status = 'contacted')` (o `ProductEvent portal_link_sent` con `campaignId`)
- **SOURCE:** `CampaignRecipient.status/contactedAt/channel`, `ProductEvent(portal_link_sent)`
- **EDGE CASES:** si una activación mezcla canales, mostrar **desglosado por canal**; un label único ("Contactados") solo se permite si se aclara la mezcla.

### UNIQUE PORTAL OPENS
- **DEFINITION:** Clients únicos que abrieron su portal.
- **NUMERATOR:** `count(distinct campaignRecipientId)` con `ProductEvent.event = 'client_portal_opened'`
- **DENOMINATOR:** (para tasa) Clients con contact/action signal
- **UNIQUE/RAW:** **único**. `client_portal_opened` ya está deduplicado a la 1ª apertura por Client.
- **EDGE CASES:** eventos sin `campaignRecipientId` (apertura fuera de activación) NO cuentan para métricas de activación, sí para el funnel global.

### UNIQUE SHARE ACTIONS
- **DEFINITION:** Clients únicos que **pulsaron compartir**.
- **NUMERATOR:** `count(distinct campaignRecipientId)` con `event = 'referral_share_clicked'`
- **UNIQUE/RAW:** único por Client.
- **CHANNEL SEMANTICS:** **acción de compartir**, NUNCA "compartió" como entrega comprobada. Prohibido inferir envío.

---

## Métricas de producción de referidos

### PRODUCTIVE REFERRER
- **DEFINITION:** Client que generó **≥1 Referral real**.
- **NUMERATOR:** `count(distinct campaignRecipientId)` con `event = 'referral_created'` (o `distinct Referral.referrerId` a nivel asesor)
- **UNIQUE/RAW:** **único por Client**
- **EDGE CASES:** referrals borrados (`deletedAt != null`) NO cuentan.

### PRODUCTIVE REFERRER RATE
- **NUMERATOR:** productive referrers (únicos)
- **DENOMINATOR:** **Clients con señal de contact/action** (no la cartera entera, no la audiencia)
- **EDGE CASES:** `denominator = 0` → `null` ("Sin datos"), nunca 0% ni 100%. Un valor >100% es imposible por construcción (numerador ⊆ denominador) — si aparece, es bug de denominador.
- **HIPÓTESIS:** ~10% es **hipótesis de trabajo**, NO un umbral demostrado.

### LEAD YIELD
- **NUMERATOR:** total de Referrals (bruto, no único)
- **DENOMINATOR:** Clients con señal de contact/action
- **PRESENTACIÓN:** "**X referidos por cada 100 contact/actions**" (más legible que un decimal)
- **EDGE CASES:** puede ser >1 (un referidor produce varios) — es correcto y **no** es un porcentaje.

### REFERRAL MULTIPLIER
- **NUMERATOR:** total de Referrals · **DENOMINATOR:** productive referrers
- **EDGE CASES:** `denominator = 0` → `null`. Siempre ≥1 cuando hay datos.

### CLOSE RATE
- **NUMERATOR:** referrals convertidos (`status = 'converted'`)
- **DENOMINATOR:** total de Referrals
- **SOURCE:** `Referral`
- **EDGE CASES:** referrals recientes aún sin trabajar inflan el denominador → considerar cohorte/periodo; documentar el periodo mostrado.

---

## Métricas de dinero

### GWP (Gross Written Premium) influenciado
- **DEFINITION:** suma de primas reportadas de referrals **convertidos**.
- **NUMERATOR:** `sum(Referral.saleAmount)` donde `status='converted'` · **DENOM:** —
- **SOURCE:** `Referral.saleAmount`
- **EDGE CASES:** `saleAmount = null` no suma. **GWP ≠ ingreso de Referidoo** — nunca presentarlos juntos sin etiqueta.

### REFERIDOO REVENUE (comisión)
- **DEFINITION:** comisión de Referidoo sobre contratos cerrados.
- **NUMERATOR:** `sum(Referral.lessioCommission)` · **DENOM:** —
- **SOURCE:** `Referral.lessioCommission`
- **EDGE CASES:** `null` = **no calculada** (no es 0) → excluir, no sumar como cero. Separar **facturada** (`billedAt != null`) vs **pendiente** (`billedAt = null`).

### MRR real
- **DEFINITION:** suscripciones Pro **reales y activas**.
- **NUMERATOR:** `count(Advisor where plan='paid' AND mpPreapprovalId != null)` × precio mensual
- **EDGE CASES:** `plan='paid'` **sin** `mpPreapprovalId` = **trial**, NO es MRR. Excluir siempre. Aplica el filtro global (sin QA/owner).

### GWP / REFERRAL · GWP / ACTIVATED CLIENT
- Solo mostrar cuando el denominador sea ≥ un mínimo documentado; si no → "Sin datos suficientes". **No fijar un umbral estadístico arbitrario sin documentarlo aquí.**

---

## Advisor states (honestos)
| Estado | Definición |
|---|---|
| **SETUP** | cartera conectada (≥1 Client), **0** activaciones iniciadas |
| **ACTIVATING** | ≥1 activación iniciada, **0** referrals |
| **ACTIVATED** | **≥1 referral real** |
| **DEEP ACTIVATED** | ≥1 referral convertido **+** premio pagado (`rewardPaidAt != null`) — solo si el dato existe realmente |

**"Registered" ≠ "Activated".** No existe el estado "active" genérico. Un asesor sin clientes no es SETUP: es **REGISTERED** (fuera de los estados de activación).

---

## Benchmarks
**No se muestra ningún benchmark sin fuente verificable en el repo.** Comparaciones contra "la industria" quedan **eliminadas** hasta tener (a) fuente citable y (b) volumen propio real. Mientras tanto: *"Aún no hay suficiente volumen para benchmark."*

## Prohibiciones
- Sin valores demo / fallback / sample en producción.
- Sin "insight" generado sobre datos falsos.
- Sin funnel 1:1 donde no aplica (landing views ≠ personas; share click ≠ entrega).
- Sin PII de clientes en ninguna métrica (ver `12-OWNER-DATA-TRUTH-REDESIGN.md`).
