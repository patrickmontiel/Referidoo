# REFERIDOO — PAQUETE COMPLETO (todo en un archivo)

> Contexto completo de Referidoo para ChatGPT. Empieza por el documento maestro (sección 1); el resto son los documentos de producto, negocio y estrategia. Snapshot: 2026-09-08.


---

<!-- ============================================================ -->
# 📄 [1] 00-REFERIDOO-MAESTRO.md
<!-- ============================================================ -->

# Referidoo — Contexto maestro (todo lo construido)

> **Para ChatGPT:** este documento te pone al día de TODO Referidoo — qué es, cómo está construido, su estado EN VIVO hoy, el modelo de negocio y la estrategia. Los demás archivos de esta carpeta son los documentos de estrategia y producto completos; este es el índice y el resumen autoritativo. Cuando haya conflicto de cifras, **este documento manda** (algunos docs viejos — NEGOCIO.md, README.md — tienen números desactualizados, se señala abajo).

Fecha del snapshot: 2026-09-08 · Producto en producción en **referidoo.com** (Vercel).

---

## 1. Qué es Referidoo (en una frase)
Un SaaS que **convierte a los clientes felices de un asesor de seguros en un canal de referidos**: cada cliente recibe un link propio, ve en pesos lo que gana por recomendar, refiere a un conocido, y ese prospecto tibio le cae al asesor en su pipeline. Cuando el asesor cierra la venta, el premio del cliente se calcula y trackea solo.

**One-liner de marketing:** *"Deja de perseguir clientes. Los que ya tienes te los traen."*

**Posición:** No hay competidor directo de referral-tracking para asesores de seguros individuales en México. Referidoo **compite contra Excel y WhatsApp**, no contra otro SaaS.

## 2. Para quién es (ICP y usuarios)
- **Usuario/ICP principal — el ASESOR** (el que paga y adopta): asesor de seguros de **vida / PPR** independiente, con cartera propia (30+ clientes), cómodo con lo digital, que cree en los referidos. En la práctica correlaciona con **<~45 años**. NO es el asesor mayor de 60 old-school ni el de autos. Usa el dashboard `/admin/*`.
- **Cliente referidor** (`/c/[token]`, sin login): el cliente del asesor. Ve su premio, comparte su link. **Su acción es indispensable para el aha** (ver "activación de dos lados").
- **Lead referido** (`/r/[code]`): el conocido del cliente que llega por el link y deja sus datos.
- **Dueño de plataforma** (`/owner/*`): Patrick. Dashboard interno (MRR, comisión, ranking de asesores, cola de problemas).

## 3. El loop (el mecanismo central)
```
Asesor agrega a su cliente feliz
 → el cliente ve, en pesos, lo que gana por recomendar (premio visible)
 → el cliente comparte su link
 → un conocido llena el formulario (cae tibio en el pipeline del asesor)
 → el asesor cierra la venta
 → el premio del cliente se calcula/trackea solo, el asesor se lo paga
 → (se reactiva el loop, y dispara el loop asesor→asesor)
```
También existe un **loop asesor→asesor** (`/unete/[slug]`): un asesor invita a otro; cuando el invitado cierra su primer cliente, los dos ganan 1 mes de Pro. Está completamente construido.

## 4. Stack y arquitectura
- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript · **Tailwind CSS v4**
- **Prisma 7** sobre **Turso** (libSQL/SQLite), adapter `@prisma/adapter-libsql`
- **Auth propia** (JWT `jsonwebtoken` + `bcryptjs`) — sin proveedor externo. `/admin/*` protegido por `src/proxy.ts` (Next 16 renombró `middleware.ts` → `proxy.ts`).
- **Mercado Pago** para suscripciones (Plan + tarjeta tokenizada con Secure Fields, no redirect). Webhooks firmados.
- **Resend** para emails transaccionales. **OpenAI Vision** para leer la carátula de la póliza.
- **Vercel** (deploy en cada push a `master`, sin PRs). Crons diarios de Vercel.
- **Dominio:** referidoo.com registrado en Hostinger, hosteado en Vercel.

### Modelo de datos (`prisma/schema.prisma`)
`Advisor` → `Client` (cada uno con su `referralCode` + `accessToken`) → `Referral` (cada lead, con `tierPosition`/`rewardAmount`) y `BubbleClaim`. `AdvisorSettings` + `RewardTier` = config por asesor. `PlanEvent` = eventos de plan/atribución.

## 5. Features CONSTRUIDAS y en producción
**Núcleo del loop:**
- Dashboard del asesor: clientes, pipeline de referidos (pendiente → contactado → en proceso → convertido/rechazado), escalera de premios configurable.
- Portal del cliente sin login (`/c/[token]`): ve su progreso, comparte su link, guarda su CLABE, reclama premios.
- Landing del referido (`/r/[code]`): el lead deja nombre/teléfono/correo + su interés (Server Component + credibilidad del asesor: cédula, años, personas atendidas).
- Loop asesor→asesor (`/unete/[slug]`): recompensa doble de 30 días Pro, atribución vía PlanEvents.

**Onboarding y activación:**
- "Primeros Pasos": 5 tareas auto-marcadas (correo verificado, ≥1 cliente, escalera, ≥1 referido, link de agenda) + recorrido guiado interactivo (motor de spotlight en `AdminLayoutShell`).
- Verificación de correo cross-device (link funciona desde cualquier dispositivo, la pestaña de origen se actualiza sola).
- **"Agrégate a ti mismo"**: el asesor corre el loop consigo mismo sin arriesgar a un cliente (persiste hasta que se prueba — arreglo reciente).
- **Handoff forzado**: al crear un cliente, un CTA único "Mándale su link ahora" (en vez de caer en "mete otro").
- Festejo/confetti cuando cae un lead o el cliente termina su recorrido.

**IA (diferenciador estratégico):**
- **IA lee la carátula = autoridad de la comisión** (OpenAI Vision): al convertir, lee producto + prima de la foto de la póliza y **bloquea** esos campos; el asesor no teclea ni baja el monto → cierra el fraude de subreportar. (`lib/caratula-ai.ts`.)
- IA redacta el primer WhatsApp al referido (personalizado, editable).

**Billing (Mercado Pago):** suscripción real, trial de 30 días, freemium, crons de downgrade y aviso.

**Owner:** dashboard interno (`/owner/*`) con MRR, comisión, ranking, cola de problemas, cola de pagos/carátulas.

## 6. ESTADO EN VIVO HOY (post cambios sep 2026 — esto manda sobre los docs viejos)
Decisión de producto reciente: **vender SOLO el core, PPR + Vida.** Cambios ya en producción:
- **Ocultos (sin borrar, reversibles por flags en `src/lib/product-visibility.ts`):** los tipos de producto **Daños/Auto** y **GMM** (fuera de selección y marketing) y **todo el sistema de premios burbuja**. El backend, `COMMISSION_RATES` y los datos históricos siguen intactos.
- **Freemium:** cartera de clientes **ilimitada**, hasta **5 leads** en el pipeline (los de más se guardan bloqueados, no se pierden). *(OJO: README/NEGOCIO dicen "2 clientes" y "12 leads" — desactualizado; lo vigente es 5 leads / clientes ilimitados.)*
- **Pro:** **$539 MXN/mes** — leads ilimitados, comisiones más bajas, envío masivo del link.
- **Trial:** todo registro arranca con **30 días de Pro gratis** (plan `paid` sin suscripción de MP). Al vencer, el cron `billing-downgrade` lo baja a freemium.
- **Correo de downgrade:** al bajar a freemium ya **avisa por correo** (antes era silencioso) — "conservas tus clientes, tope 5 leads, reactiva Pro".
- **Banner de paywall** en Referidos: aparece SOLO cuando ya hay leads bloqueados (los referidos ya fluyen = valor probado) — "tus referidos ya te llegan solos, desbloquéalos con Pro".
- **Hero:** lidera con *"Empieza gratis, sin tarjeta · 30 días de Pro incluidos"*.

## 7. Modelo de negocio y pricing
**Fase actual (0) — servicio asistido por Patrick:** $539 MXN/mes + comisión por cliente cerrado.
- Comisión: **PPR/Vida = 0.15%** del valor del plan (Pro) / 0.25% (Gratis) · (Daños/Auto/GMM existían a otra tasa, hoy ocultos).
- La comisión varía por producto porque la estructura de ingreso del asesor difiere (plan de largo plazo vs prima anual).
- **El dilema de pricing abierto:** ¿cobrar la comisión, la membresía, o ambas, y en qué orden? Ver `pricing.md` y `pitch-and-offer.md`.

**Roadmap de fases (en `NEGOCIO.md`, a futuro, NO vigente hoy):** Fase 1 freemium + app móvil self-service; Fase 2 B2B por asiento (despachos); Fase 3 API enterprise. *Los números de esas fases en NEGOCIO.md son de planeación, no reflejan lo que está en producción.*

## 8. Tracción real y el problema central (honesto)
- **Pre-tracción.** ~3 asesores registrados, **0 activados** (ninguno ha corrido el loop completo hasta que le caiga un referido real). $0 de ingreso recurrente.
- **El cuello de botella NO es adquisición, es ACTIVACIÓN.** Los asesores meten 1-2 clientes y se paran. Causa raíz = **activación de dos lados**: el aha del asesor depende de que su CLIENTE actúe (comparta). Son 4 handoffs, cada uno una fuga.
- **Por qué se paran (disclosure de Patrick):** perciben el producto como incompleto, temen pasar pena con su cliente, así que meten a un familiar de compromiso que no refiere → el loop nunca se prueba de verdad. Además la muestra estaba sesgada (asesores >60 que no son el ICP).
- **La apuesta actual:** Patrick va a sentarse 1-a-1 con una asesora (**Ceci**) hasta cerrar el primer loop completo = su primer caso de éxito + testimonio. Ver `plan-ceci-caso-exito.md`. Todo lo demás (endurecer barrera, first-50, etc.) espera a ese primer loop cerrado.

## 9. Estrategia GTM (resumen — detalle en los docs adjuntos)
- **Villano/positioning:** "pedir referidos es incómodo, así que no lo haces" + "lo frío se muere, hoy solo vende la confianza". El premio visible **elimina la incomodidad de pedir**.
- **ICP afinado:** asesor de vida/PPR, <45, digital, cree en referidos. Explícitamente NO "para todos los asesores / todos los productos" (ese feedback viene de fuera del ICP y desvía).
- **Voz del cliente:** validada con asesores MX reales de Reddit (r/Changarrito) — evitar autos, enfocarse en vida/GMM, el endgame es que los referidos dominen.
- **Competencia:** figuro.la (CRM/cotizador, no referral-first) es el más cercano; diferenciarse como "trae prospectos nuevos" vs "ordena los que ya tienes".

## 10. Índice de los archivos de esta carpeta
**Negocio y producto (base):**
- `NEGOCIO.md` — modelo de negocio y fases (ojo: números de fases futuras, algunos viejos).
- `README.md` — stack, arquitectura, billing MP, crons (técnico).
- `PRODUCT.md` — usuarios, propósito, capacidades, principios de diseño.

**Estrategia GTM (carpeta `docs/gtm-cofounder` original):**
- `founder-brief.md` — brief base del fundador (ICP, etapa, activos).
- `gtm-roadmap.md` — diagnóstico y roadmap priorizado.
- `who-is-this-for.md` — el ICP / early adopter real, y a quién NO.
- `positioning.md` — villano, escalera de diferenciación, historia de 3 actos.
- `voice-of-customer.md` — citas reales de asesores MX (Reddit).
- `competitors.md` — análisis competitivo (figuro.la, etc.).
- `pricing.md` — value metric, tiers, la línea gratis→pago.
- `pitch-and-offer.md` — one-liner, pitch 30s, oferta grand-slam.
- `activation.md` — el hoyo #1 (activación de dos lados) y los fixes.
- `onboarding-audit.md` / `onboarding-soluciones.md` — auditoría de onboarding + soluciones con copy y código.
- `paywall-strategy.md` — qué gatear para endurecer gratis vs pago sin matar la activación.
- `feedback-analysis.md` — cómo pesar el feedback (Representación × Influencia) para no perder foco.
- `guion-presentacion.md` — guion 1-a-1 con un asesor (demo + discovery + activación).
- `mesa-redonda-berninimo.md` — prep para presentar a un experto SaaS (asesoría, no pitch).
- `action-plan-semana.md` — plan semanal (grupos FB, mensajes listos).
- `talk-to-users-expo-kit.md` — kit de conversaciones con usuarios.
- `plan-ceci-caso-exito.md` — **el plan activo:** 1-a-1 con Ceci para el primer caso de éxito (con marcos de founder-sales + customer-success).

## 11. Qué NO está construido / decisiones abiertas
- App móvil nativa/PWA (Fase 1) — no construida.
- B2B despachos / API enterprise (Fases 2-3) — no construidas.
- Decisión de pricing final (comisión vs membresía vs ambas, y el número).
- El "moat" de IA de conversión (aprender qué mensaje/timing/producto convierte) — diseñado, no construido.
- Barrera de pago más dura más allá del tope de 5 leads — propuesta, no ejecutada (espera al primer caso de éxito).


---

<!-- ============================================================ -->
# 📄 [2] README.md
<!-- ============================================================ -->

# Referidoo

Dashboard de referidos para asesores de seguros y planes financieros. El asesor registra a sus clientes, cada cliente recibe un link/código de referido propio, y cuando ese link convierte en una venta el sistema calcula la recompensa, la trackea, y se la paga al cliente que refirió. Sin que el cliente comparta datos propios ni pase por procesos legales — el asesor gestiona todo desde un dashboard.

Ver [NEGOCIO.md](./NEGOCIO.md) para el modelo de negocio completo (fases, pricing, comisiones).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Prisma 7** sobre **Turso** (libSQL/SQLite) — adapter `@prisma/adapter-libsql`
- **Resend** para emails transaccionales (confirmaciones, recordatorios)
- **JWT propio** (`jsonwebtoken` + `bcryptjs`) para auth de asesores — sin proveedor externo
- **Vitest** + Testing Library para tests, **Playwright** para e2e (ver [TESTING.md](./TESTING.md))

> Next.js 16 tiene cambios importantes respecto a versiones anteriores (`middleware.ts` → `proxy.ts`, entre otros). Antes de escribir código nuevo, revisar `node_modules/next/dist/docs/` — ver [AGENTS.md](./AGENTS.md).

## Cómo funciona

- **Asesor** (`/admin/*`, protegido por `src/proxy.ts`): dashboard con clientes, referidos (pipeline pendiente → contactado → convertido), niveles de recompensa configurables, y ajustes de "burbujas" (premio acumulable por ventas de Auto/Otro/GMM).
- **Cliente referidor** (`/c/[token]`): portal público sin login — accede con un token único, ve su progreso de burbuja, comparte su link de referido (`/r/[code]`), y reclama su premio cuando la burbuja se llena.
- **Lead referido** (`/r/[code]`): landing pública donde el lead que llega por el link de un cliente deja sus datos para que el asesor le dé seguimiento.

### Modelo de datos (`prisma/schema.prisma`)

`Advisor` → `Client` (cada cliente tiene su propio `referralCode` + `accessToken`) → `Referral` (cada lead referido, con su `tierPosition`/`rewardAmount` calculado) y `BubbleClaim` (reclamos del premio acumulable). `AdvisorSettings` y `RewardTier` son configuración por asesor (niveles de premio, puntos de burbuja por tipo de producto).

## Getting Started

```bash
npm install
npm run dev
```

Abre [http://localhost:3050](http://localhost:3050) (o el puerto que indique la consola — el script `dev` no fija puerto).

### Variables de entorno

Crear `.env` (no se commitea) con:

```
DATABASE_URL=        # libSQL/Turso connection string
JWT_SECRET=          # secreto para firmar tokens de sesión del asesor
NEXT_PUBLIC_BASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_NOTIFY_CREATOR=
TURSO_AUTH_TOKEN=    # usado por /api/migrate para aplicar cambios de esquema en prod
CRON_SECRET=         # autentica al cron diario de Vercel (ver "Cron y jobs en background")
QSTASH_TOKEN=        # autentica las llamadas salientes a QStash (webhooks diferidos)
PLATFORM_OWNER_EMAIL= # único correo con acceso a /admin/plataforma (lista de asesores + toggle de plan)
MP_ACCESS_TOKEN=     # Mercado Pago — credencial privada para crear/cancelar suscripciones
MP_WEBHOOK_SECRET=   # Mercado Pago — secreto de firma del webhook (dashboard de la app, "Tus integraciones")
MP_PLAN_ID=          # id del Plan de Referidoo en Mercado Pago — generar una vez con scripts/mp-create-plan.ts
NEXT_PUBLIC_MP_PUBLIC_KEY= # Mercado Pago — public key, expuesta al navegador para tokenizar tarjetas (Secure Fields)
```

### Base de datos

El proyecto usa Prisma sobre Turso. **No usar `prisma migrate dev`** en este proyecto — los cambios de esquema se aplican con scripts SQL puntuales (`prisma/add-*.ts`) para evitar drift-reset contra la base remota. Desde mi entorno de desarrollo no tengo credenciales de escritura directa a producción, así que los cambios de esquema en Turso se entregan como SQL para correr manualmente en el SQL shell de Turso. La aplicación desplegada sí tiene un camino propio de escritura a prod: la ruta `/api/migrate` (protegida por sesión de asesor) usa `TURSO_AUTH_TOKEN` para aplicar migraciones — es una capacidad de la app, no de este entorno de trabajo.

```bash
npm run seed   # prisma/seed.ts — datos de prueba
```

## Cron y jobs en background

- **Cron diario de Vercel** (`vercel.json`, `0 16 * * *`) — llama `GET /api/cron/confirmations`, protegido por `CRON_SECRET`. Manda recordatorios de confirmación pendientes.
- **Webhook diferido vía QStash** — al crear un referido (`POST /api/referrals`), se agenda una llamada a `/api/webhooks/send-confirmation` con 5 minutos de delay (`src/app/api/referrals/[id]/route.ts:240-249`). El webhook entrante está protegido por `CRON_SECRET`/`x-webhook-secret`.
- **`/api/demo/reset`** — endpoint destructivo de un solo uso para demos: borra todos los registros de `Referral` y `Client`. No usar fuera de un entorno de demo controlado.
- **Cron de downgrade de plan** (`vercel.json`, `0 17 * * *`) — llama `GET /api/cron/billing-downgrade`, protegido por `CRON_SECRET`. Baja a freemium a quien ya pasó su `paidUntil` sin renovar, o lleva 3+ días con un cobro fallido sin resolverse (red de seguridad si un webhook de Mercado Pago se pierde).

## Cobro (Mercado Pago)

Plan freemium (hasta 2 clientes, gratis) y plan pagado ($539 MXN/mes, clientes ilimitados). El registro siempre arranca en `freemium` — nunca se asigna `paid` directamente, ni siquiera si el formulario lo pide, para no abrir la puerta a un plan pagado sin pago real.

**Arquitectura real (verificada contra la API de Mercado Pago en sandbox, no solo contra la doc):** suscripción contra un **Plan** (`preapproval_plan_id`, creado una sola vez con `scripts/mp-create-plan.ts`) + tarjeta tokenizada en un formulario embebido (`src/components/UpgradeCardForm.tsx`, Secure Fields de `@mercadopago/sdk-react`) — **no** redirect a checkout hospedado. Se intentó redirect primero (más simple); esta cuenta de Mercado Pago devuelve `Internal server error` consistente para suscripciones sin Plan asociado, y "con Plan asociado" la documentación oficial confirma que *siempre* requiere `card_token_id` + `status: "authorized"`, nunca redirect. Ver el historial de commits de esta sección para el proceso de descarte completo.

- `scripts/mp-create-plan.ts` — correr UNA VEZ por cuenta/credencial (test y producción son cuentas separadas) para crear el Plan de Referidoo. Guardar el `planId` resultante en `MP_PLAN_ID`.
- `POST /api/billing/subscribe` (autenticado, recibe `cardTokenId` ya generado en el navegador) — crea la suscripción (`PreApproval` con `preapproval_plan_id` + `card_token_id` + `status: "authorized"`), autoriza de inmediato (sin esperar webhook), marca `plan: "paid"` + `paidUntil`.
- `POST /api/webhooks/mercadopago` — recibe notificaciones de Mercado Pago, firma verificada con el validador oficial del SDK (`MP_WEBHOOK_SECRET`). Escucha dos topics (confirmados contra la tabla oficial de eventos del dashboard y contra los tipos del SDK instalado, `mercadopago@3.1.0` — **no** el topic genérico `payment`, que esta integración no usa):
  - `subscription_preapproval` — cambios de estado de la suscripción misma.
  - `subscription_authorized_payment` — cada cobro recurrente. El `data.id` es un **Invoice** (factura de suscripción, `GET /authorized_payments/{id}` vía el cliente `Invoice` del SDK), no un `Payment` — `invoice.payment.status` aprobado extiende `paidUntil` un mes; rechazado marca `paymentFailedAt` (inicia la gracia de 3 días, sin reiniciarla si ya estaba corriendo).
- `POST /api/billing/cancel` (autenticado) — cancela en Mercado Pago sin tocar `plan`/`paidUntil` localmente: el asesor ya pagó el periodo actual, así que lo conserva hasta que termine.

En el dashboard de Mercado Pago (Tus integraciones → tu app → Webhooks → Configurar notificaciones), hay que marcar los eventos **"Recurring payment of a subscription"** y **"Subscription linking"** (no solo "payments") y guardar — la clave secreta solo aparece después de guardar la configuración.

**Límite conocido de testing:** las Secure Fields de Mercado Pago rechazan toda interacción automatizada (fill/click/keyboard vía Playwright) — protección anti-fraude deliberada de su lado. `e2e/billing-upgrade.spec.ts` documenta esto y queda en `test.skip`; verificar el flujo de tokenización completo requiere un humano en un navegador real (toma ~30 segundos con una tarjeta de prueba).

## Tests

```bash
npm run test         # Vitest, una corrida
npm run test:watch   # Vitest, modo watch
npm run test:e2e     # Playwright
```

Ver [TESTING.md](./TESTING.md) para convenciones y capas de test.

## Deploy

Desplegado en Vercel, push directo a `master` (sin flujo de PRs — proyecto de un solo desarrollador). `npm run build` corre `next build`; `postinstall` corre `prisma generate` automáticamente.


---

<!-- ============================================================ -->
# 📄 [3] PRODUCT.md
<!-- ============================================================ -->

# Product

## Register

product

## Users

Asesores de seguros y planes financieros en México (independientes, fase actual de servicio asistido). Usan el dashboard (`/admin/*`) para registrar clientes, dar seguimiento al pipeline de referidos (pendiente → contactado → convertido) y configurar niveles de recompensa. Su contexto de uso es operativo y frecuente: revisan el dashboard para saber qué referidos necesitan seguimiento y para confirmar pagos de recompensa a sus clientes.

Un segundo tipo de usuario es el **cliente referidor** (`/c/[token]`): sin login, accede con un token único para ver su progreso de "burbuja" de premio y compartir su link de referido. No comparte datos propios ni pasa por procesos legales.

El **lead referido** (`/r/[code]`) es la superficie pública más cercana a "marca" — una landing simple donde el lead deja sus datos — pero no es el foco estratégico del producto; el dashboard del asesor lo es.

Un tercer usuario, el **dueño de la plataforma** (`/owner/*`), usa un dashboard interno (MRR, comisión de Referidoo, tendencias, problemas operativos, ranking de asesores) para monitorear el negocio — no es cara al cliente.

## Product Purpose

Referidoo convierte a los clientes activos de un asesor en referidores activos, sin friction legal ni de datos. El asesor gestiona todo desde su dashboard; el sistema calcula y trackea la recompensa automáticamente cuando un referido convierte en venta. No existe competidor directo de referral tracking para asesores de seguros individuales en México — Referidoo compite contra Excel y WhatsApp, no contra otro SaaS. Éxito = el asesor deja de trackear referidos a mano y empieza a ver conversiones reales y predecibles desde su cliente base existente.

## Capacidades actuales (jul 2026)

Además del pipeline de referidos y la escalera/burbuja de premios, ya en producción:

- **Onboarding "Primeros Pasos"** — bienvenida corta que lleva al asesor a registrar su primer cliente, y una cajita de tareas (tarjeta en Resumen + chip de progreso persistente en la barra superior) donde cada tarea dispara un recorrido guiado interactivo (motor de spotlight en `AdminLayoutShell`). Las 5 tareas se auto-marcan desde datos reales (correo verificado, ≥1 cliente, escalera configurada, ≥1 referido, link de agenda).
- **Verificación de correo cross-device** — el link funciona desde cualquier dispositivo, aterriza en una página pública (`/correo-verificado`, nunca fuerza login), y la pestaña de origen se actualiza sola sin perder trabajo en curso.
- **IA lee la carátula = autoridad de la comisión** — al convertir, la IA (OpenAI Vision) lee producto + prima de la foto de la póliza y **bloquea** esos campos: el asesor no teclea el monto ni lo puede bajar. Sin lectura legible no hay conversión. Cierra el fraude de subreportar para pagar menos comisión. (`lib/caratula-ai.ts` → `readCaratula`.)
- **IA redacta el primer WhatsApp al referido** — botón que genera un primer mensaje personalizado y editable, con las mejores prácticas de outreach de referidos (menciona quién refirió, corto, un solo CTA suave). (`/api/referrals/[id]/suggest-message`.)
- **Link de agenda** — el asesor pega su Calendly/Cal.com/página de citas de Google; aparece un botón "Agendar una cita" en el formulario del referido.
- **Envío masivo del link (Pro)** — un botón manda a toda la cartera su link de portal por correo y marca cuáles ya se enviaron.

**El diferenciador estratégico es la IA de conversión:** no "usamos GPT", sino que Referidoo se sienta sobre los datos de qué mensaje / timing / producto convierte — un efecto de red de datos que un competidor no puede copiar sin esos datos. El bucle de aprendizaje (moat, fase 2) está en `TODOS.md` y en el design doc `~/.gstack/projects/patrickmontiel-Referidoo/patri-master-design-20260717-ia-conversion.md`.

## Brand Personality

Directo, confiable, sin relleno. El diseño no debe llamar la atención sobre sí mismo — debe sentirse como una herramienta de trabajo sólida, no como una pieza de marketing. Tono de copy: claro, en español de México, sin jerga corporativa ni "AI copywriting clichés".

## Anti-references

Ninguna anti-referencia específica definida todavía. Revisitar cuando haya más superficie visual que auditar (ej. cuando se construya la app móvil de Fase 1).

## Design Principles

1. **El diseño existente (blanco/negro/gris, sin gradientes ni decoración) es la base — pulir, no rediseñar.** Confirmado explícitamente: mantener fondo blanco, no cambiar tipografía, solo refinar dentro del sistema visual ya establecido.
2. **Cada pantalla sirve una tarea operativa concreta**, nunca decoración. Si un elemento no ayuda al asesor a dar seguimiento a un referido o cobrar una recompensa, no pertenece.
3. **Confianza antes que personalidad.** El asesor maneja datos de sus clientes y dinero de recompensas — la interfaz debe sentirse predecible y seria, no "delightful" o juguetona.
4. **Consistencia entre superficies.** Los mismos patrones de card, badge, estado vacío/error/carga deben repetirse entre `/admin`, `/owner` y `/c/[token]` — no introducir un lenguaje visual nuevo por feature.

## Accessibility & Inclusion

WCAG AA como estándar. Contraste de texto, foco visible en elementos interactivos, y soporte de `prefers-reduced-motion` (ya hay una base de esto en `src/app/globals.css`) son requisitos, no opcionales.


---

<!-- ============================================================ -->
# 📄 [4] NEGOCIO.md
<!-- ============================================================ -->

# Referidoo — Modelo de Negocio

## Propuesta de valor
Plataforma que convierte clientes activos de asesores financieros/seguros en referidores activos, sin que el cliente comparta datos propios ni pase por procesos legales. El asesor gestiona todo desde un dashboard.

**Posición única en el mercado:** No existe ningún competidor directo en México que ofrezca referral tracking específico para asesores de seguros individuales. Referidoo no compite contra otras herramientas — compite contra Excel y WhatsApp.

---

## Fases del producto

### Fase 0 — Servicio asistido (actual)
- **Precio:** $539 MXN/mes por asesor
- **Comisión por producto:**
  - PPRs y seguros de vida (Allianz, Skandia): **0.15% sobre el valor del plan contratado**
  - Seguros de daños, autos y GMM: **0.08% sobre el valor de la prima anual**
- **Modelo:** Atención directa de Patrick (onboarding, soporte, configuración)
- **Perfil:** Asesores individuales que necesitan acompañamiento
- **Objetivo:** Validar el modelo, acumular 20–30 casos de éxito con testimonios
- **Trigger de salida:** Suficiente tracción para justificar desarrollo de app self-service

### Fase 1 — Freemium + self-service (app móvil)
- **Freemium:** Gratis hasta 2 clientes activos (sin límite de tiempo)
- **Paid:** A partir del 3er cliente → **$189 MXN/mes**
- **Comisión por producto (solo plan pagado):**
  - PPRs y seguros de vida (Allianz, Skandia): **0.25% sobre el valor del plan contratado**
  - Seguros de daños, autos y GMM: **25% sobre la comisión del asesor**
- **Canal de distribución:** App móvil en Google Play + App Store — no solo web
- **Modelo:** 100% self-service — sin atención directa de Patrick
- **Soporte:** Chatbot / atención automatizada
- **Free trial:** 14 días sin tarjeta para el plan paid (estándar del sector)
- **Lógica de precio:** $189 MXN/mes es intencionalmente bajo para maximizar adopción en app stores. El ingreso real a escala viene de las comisiones acumuladas en volumen, no de la mensualidad.
- **Nota técnica:** Requiere desarrollo de app nativa o PWA instalable — se justifica con tracción de Fase 0.

### Fase 2 — B2B multi-asesor (despachos)
- **Precio base:** $99 MXN por asiento/mes
- **Comisión por producto:**
  - PPRs y seguros de vida (Allianz, Skandia): **0.10% sobre el valor del plan contratado**
  - Seguros de daños, autos y GMM: **10% sobre la comisión del asesor**
- **Mercado objetivo:** Despachos, grupos de asesores, brokers con 10–200 asesores
- **Add-on White-label:** Personalización de marca (logo, colores, dominio propio) por fee adicional — mismo modelo, nivel superior de customización
- **Modelo de venta:** Contrato con el gerente/dueño del despacho, no con cada asesor individual
- **Diferencia vs Fase 1:** Volumen + precio por asiento + contrato grupal

### Fase 3 — API / Integración enterprise
- **Modelo:** Acceso programático a la plataforma vía API
- **Para quién:** Aseguradoras grandes, sistemas CRM propios, integradores de tecnología
- **Precio:** Por contrato / por volumen de llamadas (a definir cuando llegue el momento)
- **Casos de uso:** Aseguradora que conecta Referidoo a su sistema interno; broker que ya tiene su app y quiere el motor de referidos como backend
- **Trigger:** Solo tiene sentido después de que Fase 2 demuestre volumen y casos enterprise

---

## Resumen de fases

| Fase | Tipo | Mensual | Comisión vida/PPR | Comisión daños/auto/GMM |
|------|------|---------|-------------------|------------------------|
| 0 | Asistido por Patrick | $539 MXN | 0.15% del valor del plan | 0.08% de la prima anual |
| 1 | Freemium → self-service app | Gratis/2 clientes → $189 MXN | 0.25% del valor del plan | 25% de comisión del asesor |
| 2 | B2B por asiento (despachos) | $99 MXN/asiento | 0.10% del valor del plan | 10% de comisión del asesor |
| 3 | API enterprise | Por contrato (TBD) | TBD | TBD |

---

## Cómo se calcula la comisión de Referidoo

La comisión varía por tipo de producto porque la estructura de ingreso del asesor es diferente:

**Productos de largo plazo (PPR, Seguro de Vida — Allianz, Skandia):**
- El valor del plan es conocido y es una cifra grande
- Referidoo cobra un % sobre ese valor del plan
- Ejemplo Fase 0: Plan de $500,000 MXN → Referidoo cobra $750 MXN por ese referido convertido

**Productos de corto plazo / renovación anual (Daños, Auto, GMM):**
- No hay "valor del plan" como tal — hay una prima anual
- Referidoo cobra un % sobre el valor de esa prima anual
- Ejemplo Fase 0: Prima anual de $30,000 MXN → Referidoo cobra $24 MXN por ese referido convertido

### Integridad del monto (antifraude, jul 2026)

Como toda la comisión de Referidoo depende del monto que reporta el asesor,
subreportar era el vector de fraude directo. Ya no: al convertir, la IA
(OpenAI Vision) lee el producto y la prima de la **foto de la póliza** y bloquea
esos campos — el asesor no teclea el monto ni lo puede bajar, y sin lectura
legible no hay conversión. La carátula es la autoridad, no el asesor. (Antes ya
existía verificación post-conversión que marcaba discrepancias en la cola del
dueño; ahora además se bloquea de entrada.)

---

## Inteligencia competitiva (investigación junio 2026)

### Mercado México / LATAM

| Herramienta | Tipo | Precio/mes | Notas |
|---|---|---|---|
| **Agenthos Plus** | CRM seguros LATAM | $1,987 MXN | Incluye IA, WhatsApp, lector de pólizas — sin referral tracking |
| **SICAS Online** | AMS seguros MX | $484–$798 MXN | Reviewer: "costo-beneficio cuestionable" |
| **Jooylo** | Cotizador multimarca MX | ~$500 MXN | Solo cotizaciones |
| **Sinalix** | Cotizador autos/daños | ~$600 MXN | Solo cotizaciones |
| **Stack completo asesor MX** | Herramientas sueltas | $700–$900 MXN | Jooylo + Kommo + ZapSign |

### Mercado US (referencia de modelos)

| Herramienta | Tipo | Precio/mes (USD) | Notas |
|---|---|---|---|
| **HelloReferrals** | Referidos para seguros | $49–$99 USD | Más cercano a Referidoo — sin comisión |
| **AgencyZoom Growth** | CRM + Referidos | $199 USD (7 seats) | Estándar de agencias US |
| **ReferralCandy** | Referidos ecomm | $47–$79 USD + 1.5–3.5% | Mismo modelo híbrido |

---

## Modelos de pricing evaluados

| Modelo | Decisión |
|---|---|
| Success-only (puro %) | Descartado — revenue garantizado muy bajo |
| Freemium hasta 2 clientes | ✓ Fase 1 (entrada) |
| Flat + comisión asistida | ✓ Fase 0 |
| B2B por asiento | ✓ Fase 2 |
| White-label | ✓ Add-on dentro de Fase 2 |
| API enterprise | ✓ Fase 3 |
| Marketplace inverso | ✗ Descartado (conflictos de interés) |

---

## Framing de venta recomendado

> "Si un asesor pierde 3 referidos al mes por falta de seguimiento, y cada póliza vale $2,000–$5,000 MXN en comisión, el costo de no tener Referidoo es $6,000–$15,000 MXN/mes. Frente a $539 MXN, es invisible."

---

## Decisiones pendientes

- [ ] Definir cap máximo mensual de comisión (sugerido $500 MXN/mes tope)
- [ ] Definir trigger exacto de cobro: ¿emisión de póliza o cobro de prima?
- [ ] Implementar free trial de 14 días en Fase 1
- [ ] Definir precio del add-on white-label en Fase 2
- [ ] Definir estructura de precios API para Fase 3
- [ ] Confirmado para Fase 0 (2026-06-24): Daños/Auto/GMM cobra 0.08% sobre la prima anual, no "% sobre comisión del asesor" — corregido en este doc y ya coincide con `src/lib/rewards.ts`. Falta confirmar si Fase 1 (25%) y Fase 2 (10%) tienen el mismo error de redacción ("sobre comisión del asesor") cuando se construyan esas fases.


---

<!-- ============================================================ -->
# 📄 [5] founder-brief.md
<!-- ============================================================ -->

# Founder Brief — Referidoo

> Memoria compartida de GTM. La leen todas las skills de gtm-cofounder antes de aconsejar, para que el consejo sea sobre Referidoo real y no de librería. Documento vivo: cuando un asesor real confirme un supuesto, cambia el tag a [validado].

Última actualización: 2026-07-26

---

## Activo más fuerte (lo primero, ancla todo)

**Acceso presencial al ICP este mes.** Patrick tiene alguna conexión al mundo de seguros y va a summits y expos de asesores de seguros durante este mes. Es acceso cara a cara a decenas o cientos de su cliente ideal exacto, en un contexto de confianza. `[validado]`

Por qué importa: para un fundador pre-tracción, ver y hablar con el ICP en persona vale más que escalar en frío. Estas expos son el vehículo natural de `talk-to-users` y `first-50-users` en la vida real. La lista de ~56k agentes en `prospeccion/` es el activo de escala, para después. `[validado]`

---

## Los 5 core

### 1. Qué hace, en una frase
Referidoo convierte el boca a boca en un sistema: el cliente que refiere ve, visualmente, lo que puede ganar por recomendar, así que refiere más; los referidos caen en el pipeline del asesor, y cuando uno contrata, el premio del cliente se calcula solo. El asesor cierra más sin comprar leads y sin llevar cuentas a mano. `[supuesto]` en la parte de "ver lo que gana lleva a referir más" (mecanismo causal por confirmar con un cliente real).

### 2. Para quién es (ICP)
Asesor de seguros en México, independiente o de agencia (para ambos). `[supuesto]`
- Vende principalmente **vida y PPR**. Los demás ramos (autos, GMM) son extra, no el foco. `[supuesto]`
- **Más de 30 clientes**, sin tope superior. El tamaño no define al ICP: lo define que **aún no ha exprimido el potencial de sus referidos**. `[supuesto]`
- El villano (su situación): tiene una mina de oro de referidos en su propia cartera y no la aprovecha, por una de cinco razones: (a) compra leads en vez de verla, (b) no ha sabido aprovecharla, (c) la sabe pero no la explota, (d) es olvidadizo, (e) está tan ocupado que no le da tiempo. `[supuesto]` — cuál de las cinco pesa más es lo primero a validar en `talk-to-users`.
- El trabajo de Referidoo: hacerle ver que ahí hay dinero que está dejando en la mesa, y dárselo ya sistematizado.

### 3. Qué usan hoy en lugar de Referidoo
Compite contra los tres a la vez: `[supuesto]`
- **Comprar leads** (caros, cierran al 1 a 5%). Referidoo: los referidos que ya tiene cierran mucho más y no cuestan.
- **Llevar los referidos a mano** (Excel, notas, WhatsApp, o la pura memoria), y perderlos. Referidoo: caen solos, con premio calculado, nada se pierde.
- **No hacer nada**, la mina intacta. Referidoo: el cliente ve lo que gana y refiere solo.

### 4. Etapa y tracción
Pre-tracción. `[validado]`
- 0 asesores usándolo al 100%. Lo prueban, no lo adoptan.
- 0 pagando (todos en gratis).
- 0 referidos reales han pasado por el sistema. El loop completo (cliente comparte, cae referido, asesor cierra, premio) nunca ha corrido de punta a punta con gente real.
- Producto construido y muy pulido (landing del referido, portal del cliente, festejo de lead, credibilidad del asesor, dashboard). El motor está listo pero no ha arrancado ni una vuelta.

### 5. Activo más fuerte
Ver arriba: acceso presencial al ICP en expos/summits este mes.

---

## Diagnóstico que se cae de maduro (para el roadmap)

El cuello real **no es conseguir más asesores ni afinar el precio**. Es **activación**: lograr que un asesor corra el loop completo una vez, con un cliente real, hasta que caiga y cierre un referido de verdad. Hasta que eso pase, no se sabe si el producto funciona, solo que se ve bien.

Por lo tanto, el #1 del roadmap es `talk-to-users` + activación del primer loop, usando las expos de este mes como vehículo. Pricing, cold-email sobre los 56k y cualquier adquisición a escala van DESPUÉS de ver el loop cerrar una vez.

---

## Supuestos a validar (van a `talk-to-users`)

- Que "ver lo que gana" haga que el cliente refiera más (el mecanismo central).
- El ICP: ramo (vida/PPR), umbral de 30+ clientes, y cuál de las 5 razones del villano pesa más.
- Que los tres "hoy" (comprar leads / a mano / nada) sean realmente contra lo que se compite, y en qué proporción.

## Pendientes de responder (se llenan cuando una skill los pida)
- Positioning: el dolor en palabras del asesor; la tendencia que lo empeora (el villano con urgencia).
- Buyer y pricing: quién paga vs quién adopta (aquí suelen ser la misma persona, el asesor); value metric; línea free a paid; el número ($539 vs $129, sin decidir).
- Motion y distribución: además de expos, dónde más se juntan y descubren herramientas los asesores.
- Foco: a qué se le está diciendo que no ahora mismo.


---

<!-- ============================================================ -->
# 📄 [6] gtm-roadmap.md
<!-- ============================================================ -->

# GTM Roadmap — Referidoo

> El plan corto y con forma de decisión, derivado del founder-brief. Documento vivo: al terminar un movimiento, pásalo al Log y promueve el siguiente. Vuelve aquí al empezar cada sesión.

Última actualización: 2026-07-26

---

## Diagnóstico (una frase)

Referidoo nunca ha sido validado por un usuario real: todo el GTM se apoya en supuestos y el loop de referidos jamás ha cerrado ni una vez, así que el único trabajo ahora es ponerse frente a asesores reales (las expos de este mes) y o ver a uno usarlo o escuchar el dolor de primera mano.

---

## Now (el único movimiento)

**`talk-to-users` — hablar con asesores reales por el camino GRATIS (no el expo de $8,000).**

Validar no requiere el expo (el TAB original es por Zoom, no en persona). Tres fuentes, costo $0:
1. **Los asesores que YA se registraron** — entrevistarlos de verdad, 15 min c/u. La evidencia más caliente, gratis, esta semana.
2. **La lista de ~56k en `prospeccion/`** — 10 mensajes personalizados por WhatsApp/correo pidiendo 15 min para "entender cómo consiguen clientes" (no vender). ~10% contesta.
3. **Grupos de Facebook/WhatsApp de asesores de seguros MX** — ahí está el dolor en crudo.

- Qué escuchar: cuál de las 5 razones del villano es la real, si el mecanismo central les suena, y el rango de precio (ver kit). Si se puede, sentar a uno frente al producto.
- Hecho: ~10 asesores entrevistados de verdad + en el mejor caso 1 enganchado que meta clientes y mande un link. Cada supuesto confirmado pasa a `[validado]`.
- Skill/kit: `talk-to-users` + `talk-to-users-expo-kit.md` (sirve igual para llamada que para expo).
- **El expo ($8,000) es opcional**, solo si sale barato o gratis. No amarrar la validación a ese gasto.

---

## Next (en cola detrás del Now)

1. **`who-is-this-for`** — con lo que digan las expos, afilar el ICP (cuál de las 5 razones pesa, si el umbral de 30+ clientes y el ramo vida/PPR aguantan). No adivinar: usar lo escuchado.
2. **`first-50-users`** — convertir las expos en un canal repetible para los primeros usuarios. Las expos SON tu primer canal; sistematizar cómo sales de cada una con asesores activados.
3. **`positioning-and-story`** — ya con el dolor en palabras de asesores reales, afinar el mensaje. La landing que construimos asume el dolor; esto lo confirma o lo corrige.

---

## Later (parqueado a propósito, fuera de tu cabeza)

- **`pricing` ($539 vs $129)** — no decidas el número hasta que un asesor haya cerrado un referido y sentido el valor. Decidir precio sin eso es adivinar.
- **cold-email sobre los ~56k de `prospeccion/`** — canal de escala. Va después de que el mensaje esté validado, no antes (si no, quemas la lista con un pitch sin probar).
- **`founder-led-sales`** — cuando ya tengas un pitch validado que cierre.
- **the-homepage / founder-led-content** — reales, pero no todavía.

---

## Log (qué se hizo y qué se aprendió)

- 2026-07-26: brief y roadmap creados. Estado: pre-tracción (0 activados, 0 pagando, 0 loops cerrados). Producto muy pulido esta sesión (landing del referido rediseñada, portal enganche, festejo de lead, credibilidad del asesor, home con hero anti-comprar-leads). Activo clave descubierto: acceso presencial al ICP en expos este mes.


---

<!-- ============================================================ -->
# 📄 [7] who-is-this-for.md
<!-- ============================================================ -->

# ¿Para quién es Referidoo? — el early adopter real

> Skill `who-is-this-for`. Regla dura: si tu ICP no EXCLUYE a nadie, no es un ICP. Un mensaje que le habla a todos los asesores no le habla a ninguno. Este doc existe por un problema concreto: Patrick ha probado con asesores >60 que "no lo ven como él", y su feedback lo empuja a "hazlo para todos los asesores y todos los productos" — fuera de su camino. La cura es definir a quién SÍ, y sobre todo a quién NO.

Última actualización: 2026-08-28

---

## El ICP de 5 atributos (early adopter, no "todo asesor")

1. **Forma del negocio:** asesor de seguros INDEPENDIENTE o de agencia chica, con **cartera propia de 30+ clientes** que ya cerró (no broker corporativo, no recién iniciado sin cartera).
2. **Ramo / contexto:** **vida / GMM / PPR** — productos de relación y confianza, recompra y recomendación. NO autos (ciclo transaccional, sin loop de confianza; el propio gremio lo llama "trampa sin fondo").
3. **Contexto digital / mentalidad:** cómodo con WhatsApp + apps, **cree en el juego de referidos con premio visible**, quiere crecer y NO se avergüenza de mostrarle algo nuevo a un cliente. En la práctica esto correlaciona con **~menos de 45 años** — no por la edad en sí, sino por la mentalidad digital y la disposición a probar algo "en beta".
4. **El gatillo (por qué AHORA):** siente que **se le está acabando el mercado natural** / los leads comprados cuestan más y cierran menos / quiere sistematizar los referidos que hoy pierde. (Verbatim real: *"cómo conseguir referidos desde ahorita antes que se me acabe el mercado natural"*.)
5. **El dolor, en SUS palabras:** *"pedir referidos es incómodo, la gente se harta de que le pidas"* + *"nadie te da una cita si no eres referido por alguien de confianza"*. (De `voice-of-customer.md`.)

## Quién dice NO (el filtro que te devuelve el foco)

Esto es lo más importante del doc. Estos NO son tu early adopter, y su feedback NO manda:

- ❌ **El asesor >60 que hace las cosas "como siempre".** No es tu cliente de acceso anticipado. Le pesa lo digital, le da pena mostrar algo no-pulido, y su instinto es que le construyas un CRM completo. **No juzgues el producto por él.** (Es justo con quienes Patrick ha estado probando → muestra sesgada.)
- ❌ **El que vende autos / transaccional.** Sin loop de confianza, tu mecanismo no aplica.
- ❌ **El que pide "una plataforma para TODOS los asesores del mundo y TODOS los productos".** Eso es pedirte que dejes de ser filoso. Un producto para todos no le sirve a nadie primero.
- ❌ **El recién iniciado sin cartera.** No tiene clientes felices que refieran → no hay mina que explotar todavía.

## La regla de oro para el feedback (tu problema #1 hoy)

> **El asesor es experto en su DOLOR, no en tu producto.** Cuando te dice "hazlo para autos / para todos / agrégale un CRM", eso es una *solución* que él inventa — ignórala. Extrae el dolor de abajo y decide TÚ la solución.

Ponderación práctica:
- El asesor **<40 que te dio "mucho, mucho feedback"** → ese ES tu ICP. **Escucha su mensaje de voz.** Su feedback pesa 10x.
- Los asesores **>60** → agradéceles, pero su feedback de producto pesa cerca de 0 para el roadmap. Son buenos para aprender del dolor del gremio, no para dirigir hacia dónde va Referidoo.

## El pitch como Job-To-Be-Done (no como demografía)

> **"Cuando siento que se me está acabando mi mercado natural y me da pena andar pidiendo referidos, quiero que mis clientes felices me recomienden solos (viendo lo que ganan), para llenar mi pipeline con gente tibia sin perseguir extraños ni quemar mi círculo."**

Eso te dice el gatillo (mercado natural que se acaba), el dolor (pena de pedir) y la victoria (referidos solos). Una demografía ("asesores de seguros") nunca te da eso.

## Los personajes de la venta (no es un solo actor)

Referidoo NO es venta de un solo jugador — el aha depende de más de una persona. Por eso se atora:

| Persona | Qué le importa | Rol en el loop |
|---|---|---|
| **Asesor (adopta Y paga)** | más clientes sin perseguir, sin pena | Se registra, mete clientes, manda links. Es tu ICP central. |
| **Cliente del asesor** | su premio, ayudar a alguien de confianza | **Tiene que ACTUAR** (abrir portal, compartir). Sin él, no hay aha. |
| **El referido (amigo del cliente)** | un seguro que no sea "carísimo/inalcanzable", confianza | Llena el formulario = el aha del asesor. |

→ Implicación: no basta con vender al asesor. El producto tiene que **mover al cliente a actuar** (por eso el "agrégate a ti mismo" y el CTA "mándale su link ahora" son críticos, ver `activation.md`). La activación es de varios lados; ahí está la fuga.

## Qué hacer con esto (accionable)

1. **Deja de probar con >60.** Consigue 3-5 asesores <45, digitales, de vida/GMM, con cartera. Ese cohort te va a dar señal real.
2. **Escucha el mensaje de voz del asesor <40.** Es tu ICP hablándote y lo tienes en pausa.
3. **Cuando alguien pida "para todos / para autos", di NO por diseño.** Anótalo en un "Later", no en el roadmap. Tu nicho (vida/GMM + loop de referidos) es tu ventaja, no tu límite.
4. **En los grupos FB, filtra:** busca al asesor que dice "se me acaba el mercado natural" y "me da pena pedir referidos" — ese muerde. Ignora al que quiere un ERP de seguros.

## Nota honesta

El feeling de "la plataforma no está completa" que percibes en tus asesores es **real pero mal atribuido**: no le faltan features, le falta que UN asesor de tu ICP corra el loop completo y le caiga un referido (ver `activation.md`). Con eso pasas de "una demo que da pena mostrar" a "una historia con carne". El fix no es construir más — es elegir mejor a quién le pruebas y taparle la fuga a UNO.


---

<!-- ============================================================ -->
# 📄 [8] positioning.md
<!-- ============================================================ -->

# Positioning & Story — Referidoo (a fondo)

> Framework Frankl: el asesor es el héroe, no Referidoo. Referidoo es el sabio que le da un arma mejor. Sin villano no hay urgencia, sin urgencia no hay conversión. TODO aquí es HIPÓTESIS hasta que las pláticas lo validen (sobre todo el Nivel 4). Documento vivo.

Última actualización: 2026-08-25

---

## 1. El villano (una tendencia que empeora HOY, no un problema estático)

El villano no es "no tienes sistema de referidos". Eso es estático y sin urgencia. El villano es una **fuerza del mundo que se mueve en contra del asesor ahora mismo.** Candidatos:

**A — "Lo frío se está muriendo." (el más fuerte)**
Cada año los leads cuestan más y cierran menos. La gente ya no le abre a un número desconocido. El spam y los fraudes mataron la confianza en el extraño. El asesor que vive de comprar leads o llamar en frío está corriendo en una pista que se acorta sola.
*Inciting event:* "este año tus leads costaron más y cerraron menos que el pasado, y el que viene será peor."

**B — "La economía de la confianza."**
En un mundo de bots y estafas, la gente solo actúa sobre lo que le recomienda alguien que ya conoce. La recomendación dejó de ser un "extra" y es el único canal que sobrevive. El que no la sistematiza, no compite.

**C — "La comoditización."**
Todos los asesores venden pólizas casi idénticas al mismo precio. El diferenciador ya no es el producto: es la confianza. Y la confianza se transfiere por recomendación, no por otra llamada.

**Recomendado: fundir A + B.**
> "Lo frío murió. Hoy solo vende la confianza. Y tú estás sentado sobre la mayor mina de confianza que existe, tus clientes felices, sin explotarla."

Eso es héroe (asesor) + villano (muerte de lo frío / economía de la confianza) + arma (Referidoo). Es lo que le da urgencia.

**Actualización por social listening (25-ago-2026) — re-rankeo del villano:**
La voz real del asesor (ver `voice-of-customer.md`) mueve el villano #1 hacia algo más caliente que "la fuga": **pedir referidos es incómodo, así que no lo haces.** Está literal en su vocabulario ("conseguir referidos... llega a ser incómodo"; blogs titulados "pedir referidos y no morir en el intento"). El nuevo ángulo líder:
> **"Referir deja de ser un favor incómodo que tienes que pedir. Tu cliente ve lo que gana y refiere solo, tú no pides nada."**
El premio visible **elimina la incomodidad de pedir.** Ese es el villano más respaldado por su voz. Sigue probando "la fuga" contra este, pero este arranca con ventaja.

**Prueba en su propia voz (para el pitch):** un asesor en Reddit sobre comprar leads: *"mejor pagar solo cuando cierras el trato que comprar un montón de leads que capaz sí, capaz no cierren."* Es tu oferta de reversión de riesgo, dicha por el cliente. Úsala.

**Diferenciación vs figuro.la** (ver `competitors.md`): figuro ordena y cotiza a los prospectos que YA tienes; Referidoo te trae prospectos nuevos de tu cartera. Otro trabajo. No compitas como CRM; sé profundo en el loop de referidos.

## 2. La escalera de diferenciación (dónde estás → a dónde ir)

Compite lo más arriba posible. La guerra de features es una carrera al fondo.

| Nivel | Tipo | Suena a | Referidoo hoy |
|---|---|---|---|
| 1 | Feature | "trackeamos referidos y calculamos premios" | ⬅ el sitio roza aquí |
| 2 | Beneficio | "consigue más clientes sin comprar leads" | ⬅ el hero nuevo está aquí |
| 3 | Segmento | "para el asesor de vida que vive de recomendaciones pero las pierde" | meta cercana |
| 4 | **Problema** | "el único que tapa **la fuga de referidos**" | **meta real** |

## 3. El problema nombrado (Nivel 4 = crear categoría)

Nombra el problema tan preciso que Referidoo sea la respuesta obvia. Si los competidores adoptan tu palabra, ya perdieron la posición. Candidatos a probar:

- **"La fuga de referidos"** — cada asesor pierde referidos que YA tiene, sin darse cuenta. (Enmarcado en pérdida = urgente y nombrable.) ⭐ favorito
- **"La mina dormida"** — tu cartera está llena de oro y nadie la está sacando.
- **"El boca a boca ciego"** — te recomiendan y ni te enteras; el crédito y el cliente se pierden.

**Cómo se valida (crítico):** en las pláticas, escucha si el asesor **usa esa idea con sus propias palabras.** Si tú dices "fuga de referidos" y él responde "exacto, se me escapan un montón", ganaste el Nivel 4. Si te mira raro, no es su palabra: prueba otra. **No lo declares ganado desde la oficina.**

## 4. La historia de 3 actos (esqueleto — con los huecos marcados)

1. **Inciting event (listo):** el mundo cambió, lo frío se muere, y el asesor no puede quedarse quieto. (Ver villano A+B.)
2. **Obstáculos (HUECO):** una serie de retos, cada uno resuelto con Referidoo, contados como mini antes/después: *"Antes esas recomendaciones se morían en un WhatsApp. Ahora [resultado medido]."* → **Esto NO lo tienes aún: sale de asesores reales usándolo.**
3. **Resolución (HUECO):** villano vencido, resultado concreto, el asesor comparte la sabiduría → ese es tu testimonio. → **Falta: 0 usuarios han cerrado un loop.**

**La verdad incómoda:** el esqueleto de tu historia es fuerte, pero le falta la carne (actos 2 y 3), y esa carne **solo la dan las pláticas y el primer loop cerrado.** Por eso positioning depende de first-50, no al revés.

## 5. El mensaje que sale de cada capa

- **Nivel 2 (hoy, en el sitio):** "Deja de perseguir clientes. Los que ya tienes te los traen." — bien, pero es beneficio.
- **Nivel 4 (a donde vas, si valida):** "Estás perdiendo referidos que ya son tuyos. Referidoo tapa la fuga." — problema nombrado + pérdida + urgencia.
- **El villano explícito (para posts/pitch):** "Comprar leads cada año cuesta más y cierra menos. La gente solo le compra a quien le recomiendan. Deja de perseguir extraños: activa la confianza que ya tienes."

## 5.5. Set de mensajería Nivel-4 (listo para probar en las pláticas)

Contrasta en vivo el framing actual (Nivel 2, ganancia) contra el Nivel 4 (pérdida / "la fuga"). La aversión a la pérdida suele pegar más fuerte, pero puede sonar acusatorio: por eso se prueba, no se asume.

**Headline (Nivel 4 — elige/prueba):**
- ⭐ "Estás perdiendo referidos que ya son tuyos."
- "Tu cartera tiene una fuga: se te escapan los referidos."
- "Cada mes se te van referidos que ni sabías que tenías."

**Subhead (Nivel 4):**
> "Tus clientes felices te recomendarían, pero esa recomendación se muere en un WhatsApp: sin premio y sin que te enteres. Referidoo tapa la fuga: tu cliente ve lo que gana, refiere, y el referido te cae listo en tu pipeline."

**Pitch con villano explícito (30 seg, para plática o post):**
> "Piénsalo: comprar leads cada año cuesta más y cierra menos, y la gente ya no le abre a un desconocido. Lo único que sigue vendiendo es la confianza, y tú tienes una tonelada guardada en tus clientes felices. El problema es que esa confianza se te está fugando: te recomiendan de boca y se pierde, porque no hay premio ni forma de rastrearlo. Referidoo tapa esa fuga."

**Post Nivel-4 para grupo FB (alternativa al Mensaje C):**
> "Los que llevan años en seguros: ¿cuántos referidos creen que se les han 'fugado'? O sea, un cliente contento que los habría recomendado, pero nunca pasó nada: ni premio, ni seguimiento, se murió en una plática. Trato de medir qué tan grande es esa fuga en la vida real del asesor. Cuéntenme 👇"

**Cómo probar los dos framings (A/B en la plática):**

| | Nivel 2 (en el sitio hoy) | Nivel 4 (a probar) |
|---|---|---|
| Ángulo | ganancia / dejar de perseguir | pérdida / la fuga |
| Frase | "Deja de perseguir clientes. Los que ya tienes te los traen." | "Estás perdiendo referidos que ya son tuyos." |
| Riesgo | menos urgente | más urgente, pero puede sonar acusatorio |

Di las dos en distintas pláticas y observa cuál hace que el asesor diga "sí, exacto". Esa gana y sube al sitio.

## 6. Qué debe sacar cada plática para lockear el positioning

- ¿El villano les pega? ("¿sientes que lo frío cada vez rinde menos? ¿los leads peor?")
- ¿Nombran "la fuga de referidos" (o cuál palabra usan ellos)?
- El antes/después en SUS palabras (para el acto 2).
- La frase con la que ELLOS describen el dolor (esa es tu copy, no la mía).

Cuando 3-4 asesores confirmen el villano y usen la palabra del problema, subes el sitio del Nivel 2 al Nivel 4 y tienes tu historia con carne.


---

<!-- ============================================================ -->
# 📄 [9] voice-of-customer.md
<!-- ============================================================ -->

# Voz del cliente — social listening (asesores de seguros)

> Investigación SECUNDARIA de fuentes públicas (Reddit, Instagram, YouTube, blogs del gremio). Son citas reales pero no una conversación: valida hipótesis y da vocabulario, no reemplaza las pláticas. Ojo: mucho r/InsuranceAgent es EE.UU.; r/Changarrito y contenido en español son MX. Los grupos FB (privados) no se pueden minar.

Última actualización: 2026-08-25

---

## Lo que confirma tu positioning (en sus palabras)

**El villano "lo frío duele / prospectar es un martirio" → CONFIRMADO fuerte.**
- "La mayoría de los agentes nuevos **odian prospectar porque sienten que molestan**." (AMASFAC, IG)
- "Vender seguro de vida... **la mayoría de los agentes no lo logra porque está bien difícil.**" (r/InsuranceAgent)
- Hilos MX y en español repitiendo lo mismo: "¿cómo consiguen clientes fuera de su mercado natural?", "soy sociable pero tímido y me da pena prospectar." (r/Changarrito, MX)
- "Mientras dependes ÚNICAMENTE de la prospección..." → la sobredependencia de lo frío como trampa. (IG)

**Tu oferta (comisión / "paga cuando cierres") → VALIDADA literal.**
- r/InsuranceAgent, mejores fuentes de leads 2026: *"**Mejor pagar solo cuando cierras el trato que comprar un montón de leads que capaz sí, capaz no cierren.**"* → Es EXACTAMENTE tu modelo, dicho por un asesor. La reversión de riesgo no es idea tuya: es lo que ellos ya quieren.

**Los referidos: los quieren, pero PEDIRLOS es incómodo → matiz clave.**
- "Conseguir referidos... **incluso llegar a ser incómodo para muchos agentes.**" (softseguros)
- "**Pedir referidos y no morir en el intento**" (100seguro) — el título ya dice el dolor.

## El matiz que afina tu positioning

No es solo "se te FUGAN los referidos" (leak). Es que **PEDIR referidos es incómodo, así que no lo haces.** Ese es el dolor más vivo en su voz. Y ahí Referidoo tiene un ángulo más fuerte:

> **"Referir deja de ser un favor incómodo que tienes que pedir. Tu cliente ve lo que gana y refiere solo — tú no pides nada."**

O sea: el mecanismo del premio visible **elimina la incomodidad de pedir.** Ese es un villano más caliente ("me da pena pedir referidos") que "la fuga". Vale probar los dos, pero este pega en algo que ellos YA dicen.

## Alerta competitiva

- **figuro.la** publica "cómo conseguir referidos en seguros: **sistema, scripts para WhatsApp, modelo de incentivos, métricas**" y "cómo prospectar". Es contenido/consultoría sobre programas de referidos para agencias — el concepto ya existe en el mercado. Tu diferencia: Referidoo es el **producto que lo hace solo** (el cliente ve su premio y refiere), no scripts ni una guía. Revísalo para posicionarte contra eso, no ignorarlo.

## Hipótesis de villano, re-priorizadas por evidencia

1. ⭐ **"Pedir referidos es incómodo, así que no lo haces"** — el más respaldado por su voz.
2. **"Prospectar en frío es un martirio y la mayoría fracasa"** — muy respaldado.
3. **"Comprar leads es una apuesta; mejor pagar al cerrar"** — validado, y es tu oferta.
4. "La fuga de referidos" (leak) — plausible, pero menos visto verbatim; probarlo contra el #1.

## Citas TEXTUALES de asesores MX (Reddit r/Changarrito, vía opencli) — 25-ago

Voz real de agentes de vida mexicanos. Esto es copy-listo.

**Los referidos son EL único camino (villano confirmado):**
> *"Referidos, no hay de otra, que tus conocidos te den referidos. Antes la gente trabajaba mucho con la compra de bases de datos... pero ya no es factible, **la gente cada vez confía menos y nadie te dará una cita si no eres referido por alguien de su confianza**."* — MakotoRitter

**Pedir referidos QUEMA tu círculo (tu ángulo "refiere sin pedir", validado literal):**
> *"Luego la gente (como tus conocidos o amigos) **se harta de que le intentes vender cosas o les pidas referencias**, aguas."* — jitachi

**El mercado natural se acaba (la angustia):**
> *"Estoy pensando en **cómo conseguir referidos desde ahorita antes que se me acabe el mercado natural.**"* — OP

**Un asesor MX de 10 años valida tu ICP entero:**
> *"Me enfoco solo en esos ramos (**Seguro de vida y GMM**)... **vender seguros de autos... trata de evitar el ramo, es una trampa sin fondo**... Al día de hoy llegué a un punto en el que **ya consigo más referidos como clientes que como externos.**"* — Technical-Barber-711
> → Confirma: (1) foco vida/GMM, (2) evitar autos (justo tu decisión), (3) el endgame ES que los referidos dominen. Todo tu thesis, dicho por un veterano.

**Ya piensan en pagar por referir (tu mecanismo del premio):**
> *"**¿Cuánto porcentaje le das a los que te envían leads?**"* — TerrenoTerreneitor

**Prospectar en frío = grind que odian:**
> *"Hay que ser más como **Saul Goodman**... personalidades con mucho carisma"* (OP) · *"Esas sí son ventas de verdad, **tienes que empujar el producto**"* (Rough_Bet6203) · *"No hay mucha diferencia a vender Herbalife... si ni al médico van, menos comprar seguros"* (jitachi)

**Insight para la landing del CLIENTE:**
> *"La neta la raza tiene la idea de que **un seguro es inalcanzable y carísimo**."* — The1AndOnlyJohnny

## Citas de r/InsuranceAgent (US, en inglés) — refuerzan "no compres leads"

Mercado distinto (EE.UU.) pero el villano es idéntico:
> *"they're all about the same so you just have to hope the sweet aroma of your money burning on leads is pleasing to the insurance gods."* (leads = quemar dinero) — lonestardem
> *"Don't buy leads. Most of them recycled and running ads just burn your money... I'd rather build a pipeline... referrals."* — Content-Concert-1437
> *"For up market insurance... Leads don't exist and **referrals dominate.**"* — Monskiactual
> *"[lead companies produce] tire kickers that waste everyone's time."* — suppliezz

## Nota de método (Facebook)
Los grupos FB (Agentes de seguros México, Seguros de Vida y GMM) se pudieron UNIR pero NO leer con las herramientas actuales (opencli no tiene lector de posts de grupo y su feed/join de FB están rotos por DOM drift). El research de valor salió de Reddit. Los grupos FB son para ACTUAR (postear el Mensaje C, DM), no para raspar.

## Qué falta (lo que esto NO da)
- Voz MX específica y a fondo (mucho es EE.UU. o contenido de marketers, no asesores crudos).
- Confirmación de que TU solución les hace sentido (eso solo sale de enseñárselo).
- Sigue pendiente: 3-4 pláticas reales para lockear cuál villano y cuál palabra usan ellos.


---

<!-- ============================================================ -->
# 📄 [10] competitors.md
<!-- ============================================================ -->

# Competencia — Referidoo

Última actualización: 2026-08-25

---

## figuro.la — "Software para Agentes de Seguros" (el más cercano)

**Qué es:** CRM/software para agentes de seguros. Centraliza prospectos, envía cotizaciones profesionales, gestiona clientes, con analítica y notificaciones de seguimiento. Da al agente un sitio web personalizable y formularios de captura.
**Tracción:** 800+ asesores y agencias en 14 países (LatAm + España). Establecido y con volumen real.
**Modelo:** free hasta 50 cotizaciones, luego pago.

**Su wedge:** cotizar + ordenar a los prospectos que el agente YA tiene + sitio web del agente. NO es referral-first: publica contenido sobre referidos (blog, scripts), pero su producto central es CRM + cotizaciones, no el motor de referidos.

**Dónde se cruza con Referidoo:** "gestionar prospectos/clientes."

**Dónde gana Referidoo (la diferencia real):**
> figuro te ayuda a **cotizar y ordenar** a los prospectos que ya tienes. Referidoo te **trae prospectos nuevos, tibios, de tu propia cartera** — con el cliente viendo su premio y refiriendo solo. Es otro trabajo.

Referidoo es profundo en UNA cosa (el loop de referidos: portal del cliente, premio visible, cálculo automático) que un CRM ancho no hace igual de bien.

**La amenaza:** figuro es más grande, establecido, y ya escribe sobre referidos → podría agregar una feature de referidos y aplastar por distribución.
**La defensa:**
1. Ir TAN profundo en referidos que una feature "extra" de un CRM no compita (el portal del cliente con premio visible, la automatización del premio, el festejo, la credibilidad del asesor).
2. Considerar posicionarse **complementario, no head-to-head:** un agente puede usar figuro (CRM/cotizaciones) Y Referidoo (referidos) a la vez. "No reemplazo tu CRM; lleno tu pipeline."
3. Nicho más filoso: figuro es horizontal (todo agente). Referidoo puede ser EL de referidos para vida/personas.

**Qué validar en las pláticas:** ¿usan figuro u otro CRM? ¿lo ven como competencia de Referidoo o como algo que convive? Eso decide si es head-to-head o complementario.

## Otros / a vigilar
- Contenido/consultoría de programas de referidos (softseguros, certeza, 100seguro): guías y scripts, no producto. No compiten como software, pero educan al mercado (bueno para ti: la categoría ya se entiende).
- Compra de leads (aggregators): el "hoy" contra el que compites, no un competidor de producto.


---

<!-- ============================================================ -->
# 📄 [11] pricing.md
<!-- ============================================================ -->

# Pricing y empaque — Referidoo

> Derivado de la skill `pricing` (value metric → empaque → número). Estructura lockeada; números finales pendientes de validar en la expo (regla: no fijar precio final sin prueba de retención).

Última actualización: 2026-07-26

---

## 1. Value metric: la comisión por cliente cerrado

Se cobra POR lo que crece cuando el asesor gana más: **el cliente referido que cierra.** Escala con su éxito, es legible en una frase ("un % de cada cliente que cierres por Referidoo"), y alinea (Referidoo gana cuando el asesor gana).

La membresía fija es un value metric inferior: no escala con el éxito (el que cierra 1 paga igual que el que cierra 10). Por eso la comisión es la base, no la membresía. `[decidido, estructura]`

## 2. Empaque: los cobros se secuencian solos por el crecimiento del asesor

No se elige "cuál cobrar primero". Se ordenan por el éxito del propio asesor:

- **Comisión: siempre encendida, riesgo cero.** Solo factura cuando el asesor cierra. No cierra, no paga. Base alineada, sin resistencia.
- **Gratis: generoso, para enganchar.** Asesor solo, hasta 12 leads (tope freemium actual). Es la distribución.
- **Membresía Pro: el upsell, disparado por valor ganado.** Se activa cuando el asesor choca con el tope de 12 leads (o sea, cuando Referidoo ya le funciona). El gate ya construido (leads bloqueados del 13) es exactamente el disparador correcto. Desbloquea leads ilimitados, premios burbuja, envío masivo.

Regla del framework: cobra por escala y volumen, regala el valor individual. Encaja con lo ya construido.

### Modelo de tiers (dirección, jul 2026)

Idea de Patrick, alineada al framework: el **free da casi todo lo que da el Pro hoy**, y el **$539 se vuelve premium** para el asesor de alto volumen (100+ clientes o similar).

Dos diferenciadores premium que NO requieren construir nada nuevo:
1. **Tope de volumen** — leads ilimitados en Pro vs capado en free.
2. **Comisión más baja en Pro** — free paga más comisión (PPR 0.25%), Pro menos (0.15%). Para el asesor de alto volumen, esa diferencia por muchos cierres puede pagar la membresía sola. Se auto-justifica y auto-selecciona justo el segmento premium. Ya está construido.

**Trampa a esquivar:** NO construir features nuevas ahora para "subir el valor del Pro". Con 0 asesores activados, adivinar qué querría un asesor de alto volumen que aún no existe es el mismo error de pulir un motor que no ha arrancado. Las features que justifican $539 salen de que un asesor real de alto volumen choque con una pared y la pida, no de la cabeza del fundador. Primero: un asesor que cierre un loop; después, el Pro que él pidió.

Acción: fijar la LÍNEA (free generoso pero capado + comisión alta; Pro ilimitado + comisión baja, para alto volumen); dejar que el uso real revele las features.

## 3. El número: pendiente de la expo

No lockear sin prueba de retención (pre-tracción). Dos lecturas para cuando toque:

- **La comisión de 0.15% (vida/PPR) probablemente está muy barata.** Un cliente de vida cerrado le deja miles al asesor; 0.15% son migajas. Hay espacio para subirla, capturando una tajada donde el asesor reciba ~10x el valor. Validar antes de subir.
- **$539 funciona como ancla premium** si las features Pro lo justifican. No bajar a $129 por miedo; competir por el value metric, no por descuento. Considerar precio de fundador (grandfathering) para los primeros.

**La pregunta que da el número, en la expo:** "¿A qué precio esto sería tan caro que ni lo considerarías? ¿Y tan barato que dudarías de la calidad?" El hueco entre las dos es el rango.

## Pendiente / a validar
- Tasa de comisión correcta (¿subir de 0.15%?), según lo que digan los asesores.
- Si $539 es el ancla premium correcta o hay un número mejor.
- Meta de ingreso mensual de Patrick (define cuántos asesores pagando se necesitan): sin definir.


---

<!-- ============================================================ -->
# 📄 [12] pitch-and-offer.md
<!-- ============================================================ -->

# Pitch y oferta — Referidoo

> La versión que VENDE, no la que describe. Para llevar a la expo y probar en vivo. OJO: la oferta risk-reversal implica un cambio de modelo de precio (comisión-primero, membresía opcional) que aún no está decidido ni en el sitio. Valídala antes de shippearla a referidoo.com.

Última actualización: 2026-07-26

---

## El one-liner (lidera con la transformación, no con la maquinaria)

> **"Deja de perseguir clientes. Los que ya tienes te los traen."**

Alternativas del mismo ADN:
- "Tienes una mina de oro en tu cartera. Referidoo te la destapa."
- "Tus próximos clientes ya confían en ti. Solo no te los han presentado todavía."

## El pitch de 30 segundos (para decir en la expo, de frente)

> "¿Cuál es tu mayor dolor de cabeza? El próximo cliente, ¿verdad? Todos lo mismo: o compras leads carísimos que cierran al 1-5%, o hablas en frío, o esperas.
>
> Pero mira: cada cliente contento que tienes conoce a 5-10 personas que necesitan justo lo que vendes. Te recomendarían. Solo que esa recomendación se muere en un WhatsApp porque no hay ni motivo ni forma.
>
> Referidoo le da a tu cliente un link que le muestra, en pesos, lo que gana si te recomienda. Así refiere de verdad. El referido te cae en tu pipeline, y cuando cierra, el premio de tu cliente se calcula solo. Tú cierras más, sin comprar un solo lead, con gente que ya viene tibia por confianza."

## La oferta grand-slam (Hormozi: reversión de riesgo + alineación)

> **"No pagas nada hasta que cierres tu primer cliente por Referidoo. Cierras uno, ganas miles en comisión, nos das un pedacito. ¿No cierras? No pagas ni un peso. Y de pilón: tus clientes ven cuánto ganan por recomendarte, así que refieren solos."**

Por qué funciona:
- **Reversión de riesgo total:** el asesor no arriesga nada. El "no pagas hasta cerrar" mata la objeción #1 (el costo fijo sobre una promesa).
- **Alineación:** ganas cuando él gana. Eres socio, no proveedor.
- **La mina de oro + el mecanismo del premio visible** empaquetados en tres frases.

**Implica (decisión de precio, no solo copy):** comisión como base siempre-encendida (riesgo cero), membresía Pro como upsell opcional disparado por el tope de 12 leads. Ver `pricing.md`.

## Dirección de hero para el sitio (PROPUESTA, no shippear aún)

Cuando el precio esté decidido/validado, el hero podría migrar de "No compres más leads" hacia la transformación + oferta:

- **Titular:** "Deja de perseguir clientes. Los que ya tienes te los traen."
- **Sub:** "Tus clientes felices conocen a quien necesita lo que vendes. Referidoo hace que te recomienden de verdad (ven lo que ganan) y te caen tibios en tu pipeline. Sin comprar un solo lead."
- **Reaseguro / oferta:** "No pagas hasta que cierres tu primer cliente."

No shippear hasta decidir el modelo de precio. El hero actual ("No compres más leads") sigue siendo bueno mientras tanto.

## Qué probar en la expo con esto
- ¿El one-liner ("los que ya tienes te los traen") le prende los ojos, o le resbala?
- ¿La oferta "no pagas hasta cerrar" le suena a ganga o a truco?
- ¿Cuál de las tres alternativas del one-liner repite él con sus palabras? (esa gana).


---

<!-- ============================================================ -->
# 📄 [13] activation.md
<!-- ============================================================ -->

# Activación — el hoyo #1 de Referidoo

> Trabajo de la skill `onboarding`. Dato base: 3 asesores adentro; se registran, meten 1-2 clientes, y ahí se paran. 0 han llegado al aha.

Última actualización: 2026-08-28

---

## El aha (lo que hay que lograr)

El asesor *cree* cuando **le cae su primer referido real** — un cliente compartió su link, alguien dejó sus datos, y aparece en su pipeline sin que él lo persiguiera. Ese es el momento. (El aha profundo es cerrarlo y pagar el premio, pero la primera señal que convence es "me cayó algo solo".)

## El embudo y dónde se cae

```
Registro (3) → Verifica correo → Mete 1-2 clientes (aquí llegan los 3) → [SE CAEN] → Cliente comparte → 1er referido (AHA) → Cierra → Paga premio
```

**Se caen entre "metí un cliente" y "el cliente compartió".**

## Por qué se caen (la verdad dura: activación de dos lados)

El asesor hizo su parte (metió clientes). Pero el siguiente paso **depende de que el CLIENTE actúe** (abrir su portal, compartir su link). El aha del asesor está a merced de alguien más. Son 4 handoffs, cada uno una fuga:
1. asesor manda el portal al cliente → 2. cliente lo abre → 3. cliente comparte → 4. un conocido llena el formulario.

Y "meter otro cliente" es la trampa: el valor NO está en más clientes, está en que UN cliente **comparta**. Meten 2 y se paran porque nada pasó — porque el paso que importa (que el cliente comparta) nunca se forzó.

## Los fixes (por prioridad)

### 🥇 1. HUMANO — Patrick activa a UNO de los 3, en persona (esta semana)
Con 3 asesores, esto NO se resuelve con automatización. Háblales por WhatsApp/llamada a cada uno: *"vi que metiste un par de clientes, ¿qué te frenó? ¿te ayudo a mandarles su link ahorita?"* Siéntate con UNO y córranle el loop completo juntos hasta que le caiga un referido. **Ese primer aha, con un asesor real, es lo más valioso del negocio ahora mismo.** Es talk-to-users + activación en una.

### 🥈 2. PRODUCTO — el "agrégate a ti mismo" como PRIMER paso (ya construido)
El aha depende de que un cliente comparta, y no controlas al cliente. Solución: que el asesor **corra el loop él mismo primero** — se agrega como su propio cliente, abre su portal, se manda su link, y ve el referido caer. Siente el loop completo en 5 min, solo, sin depender de nadie. Ya lo construimos ("agrégate a ti mismo" + recorrido). **Hazlo el paso #1 de onboarding, no una opción escondida.**

### 🥉 3. PRODUCTO — forzar el handoff después de meter un cliente
Hoy, tras meter un cliente, el asesor vuelve a la lista (callejón sin salida / "mete otro"). En vez de eso, el CTA #1 justo después debe ser **"Mándale su link por WhatsApp ahora"** (mensaje prellenado al cliente con su portal). Que el handoff sea imposible de ignorar. El objetivo de la sesión no es "agrega clientes", es **"que un cliente comparta"**.

## La meta de activación
**1 asesor de los 3 corriendo el loop hasta que le caiga un referido real.** Eso enciende todo: valida el producto, dispara el loop asesor→asesor (que ya está construido y espera este momento), y te da tu primer testimonio.

## Nota
Esto es más valioso que el loop de referidos asesor→asesor, que el pricing, y que la adquisición. Con asesores adentro que no activan, meter más asesores es llenar una cubeta con fugas. **Tapa la fuga con UNO primero.**


---

<!-- ============================================================ -->
# 📄 [14] onboarding-audit.md
<!-- ============================================================ -->

# Auditoría de Onboarding — Referidoo

**Fecha:** 2026-08-29
**Método:** lectura de los componentes del camino de primer uso del asesor (`AdminOverviewClient`, `PrimerosPasosCard`, `ClientesClient`) + superficies del cliente. No navegación en vivo — el hallazgo #1 es de estructura/copy, no visual.
**Lente:** ¿qué frena a un asesor entre "me registré" y "un cliente compartió y me cayó un referido"? (la activación de dos lados de `activation.md`).

---

## Veredicto de primera impresión: 4/5 en pulido, 2/5 en enfoque

El app **no está vacío de onboarding**: tiene tarjeta de Primeros Pasos con barra de progreso, tour guiado (`data-tour`), estados vacíos con copy, el "agrégate a ti mismo", tarjeta de cliente de prueba, y CTAs de WhatsApp por cliente. El problema no es ausencia — es **jerarquía**: las tres piezas que curan tu activación están escondidas o compiten con ruido, y todo el primer uso define el éxito como *"agregar clientes"* en vez de *"que un cliente comparta"*.

---

## Los 4 hallazgos que frenan el loop (ordenados por impacto en TU tarea)

### 🥇 1. El "agrégate a ti mismo" — tu mejor herramienta de activación — está escondido y se AUTODESTRUYE
**Dónde:** `ClientesClient.tsx:611-619`. Es un link de texto chico (`text-xs`) dentro del header del formulario de "Nuevo cliente", y solo aparece si `clients.length === 0`.

**Por qué mata tu loop:** tú mismo dijiste que los asesores meten primero a un familiar de confianza. **En el instante que agregan a ese familiar, `clients.length` deja de ser 0 y el link "agrégate a ti mismo" DESAPARECE para siempre.** O sea: la única herramienta que les deja probar el loop sin arriesgar a un cliente real se esfuma justo cuando cometen el error que tú describes (meter al familiar que no refiere). El miedo a "pasar pena con mi cliente" nunca se cura porque la salida privada está oculta y es efímera.

**Impacto:** ALTO. Es la raíz de tu problema de activación descrito en tu propio diagnóstico.

### 🥈 2. Tras agregar un cliente, NO se fuerza el handoff — el asesor cae en "mete otro"
**Dónde:** `ClientesClient.tsx:206-210`. Al crear un cliente, el form se cierra (`setShowForm(false)`) y el cliente aparece en la lista con WhatsApp + Copiar link como **dos botones iguales entre varios** (menú, chevron, etc.).

**Por qué mata tu loop:** el paso que importa —que el cliente **comparta**— no está elevado. El asesor acaba de hacer su parte y el sistema no le grita "AHORA mándale su link para que empiece a recomendarte". Cae de vuelta en una lista que invita a "agregar otro cliente" (callejón sin salida de `activation.md`, fix #3). Mete 2-3 y se para, porque nada pasó.

**Impacto:** ALTO. Es el segundo lado de la activación sin disparar.

### 🥉 3. Todo el primer uso define el éxito como "clientes", no como "un cliente que comparte"
**Dónde:** dashboard `AdminOverviewClient.tsx:124-128` (las 3 stats lideran con "Clientes activos"); estado vacío `:175-181` ("Aun no hay referidos" → "Agrega tu primer cliente"); estado vacío de clientes `:699` ("Agrega tu primer cliente para comenzar").

**Por qué importa:** el asesor aprende que la meta es *acumular clientes*. Pero el aha —lo que lo convence— es *un referido que le cae solo*. El copy nunca nombra esa meta real, así que el asesor optimiza lo incorrecto (agregar) y se frustra cuando "agregar" no produce magia.

**Impacto:** MEDIO. No bloquea, pero desalinea toda la sesión.

### 4. El auto-test no tiende puente al cliente real
**Dónde:** `ClientesClient.tsx:657-692`. La tarjeta de cliente de prueba dice "Cuando termines, elimínalo" — y ahí muere el momentum.

**Por qué importa:** el asesor acaba de sentir el loop completo (¡el mejor momento!) y el sistema lo despide con "elimínalo" en vez de "ahora hazlo con un cliente real que te recomendaría". Se pierde el pico de convicción.

**Impacto:** MEDIO.

---

## Lo que YA está bien (no tocar)
- La barra de Primeros Pasos con progreso y tour guiado — buena estructura.
- La tarjeta de cliente de prueba (existe y es clara) — solo está mal enganchada (hallazgos 1 y 4).
- Los CTAs de WhatsApp con mensaje prellenado por cliente — buenos, solo mal jerarquizados (hallazgo 2).
- El corte obligatorio de pago y el resumen de deuda — sólido.

---

## Quick wins (orden de impacto en cerrar UN loop)
1. **Rescatar el "agrégate a ti mismo"**: sacarlo del link efímero → tarjeta de estado vacío prominente Y una tarea permanente en Primeros Pasos ("Corre el loop una vez"). Que NO dependa de `clients.length === 0`.
2. **Forzar el handoff post-creación**: al crear un cliente, un estado de éxito con UN CTA héroe: "Mándale su link por WhatsApp ahora".
3. **Reencuadrar el copy de éxito**: de "agrega tu primer cliente" → "logra que un cliente comparta su link".
4. **Puente del auto-test**: cambiar "elimínalo" por "ahora hazlo con un cliente real".

Ver `soluciones.md` para el copy y el código listo de cada uno.


---

<!-- ============================================================ -->
# 📄 [15] onboarding-soluciones.md
<!-- ============================================================ -->

# Soluciones de Onboarding — copy + código listo

> Salida de `onboarding-ux` (estructura) + `ux-writing` (copy). Cada fix ataca la activación de dos lados. Copy en español MX, tono "colega que te ayuda", no manual. Estilos calcados del código existente (`#0B0B0C`, `#2563EB`, `rounded-2xl`, etc.). Orden = impacto en cerrar UN loop.

Última actualización: 2026-08-29

---

## FIX 1 — Rescatar "agrégate a ti mismo" (el más importante)

**Problema:** hoy es un link `text-xs` que solo vive mientras `clients.length === 0` (`ClientesClient.tsx:611-619`). Desaparece en cuanto meten al primer familiar.

**Solución en dos frentes:**

### 1a. Estado vacío de /admin/clientes → tarjeta prominente (reemplaza el `:699`)
Hoy: `<div className="text-center py-16 ...">Agrega tu primer cliente para comenzar.</div>`

Reemplázalo por una tarjeta que lidere con probar-sin-riesgo:

```tsx
// Reemplaza el estado vacío en ClientesClient.tsx (~línea 698-699)
) : sorted.length === 0 ? (
  <div className="bg-brand-blue-bg border border-[#DCE6FB] rounded-2xl p-6 text-center">
    <p className="text-[17px] font-bold text-[#0B0B0C]">Pruébalo contigo primero</p>
    <p className="text-sm text-brand-gray-3 mt-1.5 max-w-sm mx-auto leading-relaxed">
      Antes de invitar a un cliente real, corre el loop completo contigo mismo en 2 minutos —
      sin arriesgar a nadie. Así lo entiendes de punta a punta y lo enseñas sin pena.
    </p>
    <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
      {advisor?.email && (
        <button
          onClick={() => { setForm({ name: advisor.name, phone: advisor.phone ?? "", email: advisor.email ?? "", policyNumber: "" }); setShowForm(true); }}
          className="bg-brand-blue text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:opacity-90 active:scale-[.98] transition"
        >
          Agregarme como mi cliente de prueba
        </button>
      )}
      <button
        onClick={() => setShowForm(true)}
        className="text-sm font-semibold px-5 py-2.5 rounded-full border border-[#DADCE0] text-[#0B0B0C] hover:bg-[#F4F5F7] transition"
      >
        Agregar un cliente real
      </button>
    </div>
  </div>
) : (
```

### 1b. Que el auto-test NO dependa de `clients.length === 0`
En `PrimerosPasosCard` / `AdminLayoutShell` (las TASKS), agrega una tarea permanente **"Corre el loop una vez (pruébalo contigo)"** que quede marcada solo cuando el asesor haya abierto el portal de un cliente de prueba. Así la salida privada existe aunque ya hayan metido a un familiar.

> **Copy de la tarea:** `Pruébalo contigo: corre el loop completo una vez`

---

## FIX 2 — Forzar el handoff después de crear un cliente

**Problema:** al crear, el form se cierra y el cliente cae en la lista con botones iguales (`ClientesClient.tsx:206-210`). El paso que importa (compartir) no se eleva.

**Solución:** tras crear con éxito, en vez de solo cerrar el form, mostrar un estado de éxito con UN CTA héroe (mandar el link ahora). Guarda el cliente recién creado en estado y muéstralo:

```tsx
// nuevo estado, arriba con los otros useState
const [justCreated, setJustCreated] = useState<Client | null>(null);

// dentro de handleCreate, en el bloque res.ok — en vez de solo cerrar:
if (res.ok) {
  const created: Client = await res.json().catch(() => null);
  setForm({ name: "", email: "", phone: "", policyNumber: "" });
  setShowForm(false);
  if (created?.accessToken) setJustCreated(created);
  load();
}
```

```tsx
// Banner de éxito con el handoff forzado (renderízalo arriba de la lista)
{justCreated && (
  <div className="bg-[#0B0B0C] rounded-2xl p-5 mb-4 text-white">
    <p className="text-[15px] font-bold">Listo, {justCreated.name.split(" ")[0]} ya está en tu cartera.</p>
    <p className="text-[13px] text-white/70 mt-1 leading-relaxed">
      Ahora el paso que de verdad importa: mándale su link para que empiece a recomendarte.
      Sin esto, no pasa nada — con esto, arranca tu primer referido.
    </p>
    <div className="flex flex-wrap gap-2 mt-4">
      <button
        onClick={() => { window.open(buildWhatsAppUrl(justCreated), "_blank"); }}
        className="flex items-center gap-2 bg-[#25D366] hover:bg-[#22C55E] text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
      >
        <WhatsAppIcon /> Mándale su link ahora
      </button>
      <button
        onClick={() => setJustCreated(null)}
        className="text-sm font-medium text-white/70 hover:text-white px-4 py-2.5 rounded-full border border-white/20 transition"
      >
        Ahora no
      </button>
    </div>
  </div>
)}
```

> **Nota de copy (ux-writing):** el CTA dice exactamente lo que pasa ("Mándale su link ahora" → abre WhatsApp con el mensaje). El "Ahora no" es escape sin culpa, no un dead-end oculto. El texto nombra la consecuencia real ("sin esto, no pasa nada") sin regañar.

---

## FIX 3 — Reencuadrar el copy de éxito: de "clientes" a "un cliente que comparte"

Cambios de una línea, alto impacto en enfoque:

| Dónde | Hoy | Nuevo (ux-writing) |
|---|---|---|
| `AdminOverviewClient.tsx:177` | "Aun no hay referidos." | "Aún no te cae ningún referido — pasa cuando un cliente comparte su link." |
| `AdminOverviewClient.tsx:179` | "Agrega tu primer cliente" | "Empieza: agrega un cliente y mándale su link" |
| `AdminOverviewClient.tsx:137` (subtítulo) | "Resumen de tu actividad · {mes}" | *(déjalo)* |
| Primeros Pasos, subcopy | "toca una tarea y te llevo de la mano" | *(bien, déjalo)* |

Y en el dashboard, considera que la **primera stat** que ve el asesor no sea "Clientes activos" sino "Referidos" (lo que quieres que crezca). Cambio mínimo en `statCards` (`:124-128`): poner `Referidos totales` primero.

> Regla: el copy debe enseñarle al asesor que **el marcador es "referidos que me cayeron", no "clientes que metí".** Cada frase que refuerce "agregar" sin mencionar "compartir" desalinea la sesión.

---

## FIX 4 — Puente del auto-test al cliente real

**Problema:** la tarjeta de cliente de prueba termina en "Cuando termines, elimínalo" (`ClientesClient.tsx:666`). Se pierde el pico de convicción.

**Solución:** reescribe esa línea y el botón para tender puente:

```tsx
// ClientesClient.tsx ~línea 665-667 — nuevo copy
<p className="text-[13px] text-brand-gray-3 mt-1 leading-relaxed">
  Así se ve un cliente registrado. Ábrelo como si fueras tu cliente, pícale a todo y siente el
  flujo completo. Cuando lo tengas claro, elimínalo y hazlo con un cliente real que te recomendaría —
  ese es el que va a traerte tu primer referido.
</p>
```

Y renombra el botón rojo de `"Ya probé, eliminar"` → **`"Ya lo entendí, ahora con un cliente real"`** (que elimine el de prueba Y abra el form de nuevo cliente):

```tsx
<button
  onClick={() => { deactivate(sc.id); setShowForm(true); }}
  className="text-sm font-medium text-brand-blue px-4 py-2 rounded-full border border-[#DCE6FB] hover:bg-brand-blue-bg active:scale-[.98] transition"
>
  Ya lo entendí, ahora con un cliente real
</button>
```

---

## Orden sugerido de implementación
1. **FIX 1** (rescatar el auto-test) — ataca directo la raíz de tu problema.
2. **FIX 2** (forzar el handoff) — dispara el segundo lado del loop.
3. **FIX 4** (puente del auto-test) — barato, alto momentum.
4. **FIX 3** (reencuadre de copy) — cambios de una línea, hazlos de pasada.

Ninguno toca schema ni pagos. Todo es UI/copy en `admin/`. Cuando quieras, los implemento y verifico en el navegador (375px + desktop) antes de pushear.


---

<!-- ============================================================ -->
# 📄 [16] paywall-strategy.md
<!-- ============================================================ -->

# Barrera Gratis vs Pro — qué gatear (skill `paywalls`)

> Objetivo: hacer más fuerte la diferencia Gratis vs Pro **sin matar la activación** (tu problema #1). Regla madre de `paywalls`: *"value before ask"* — el gratis debe alcanzar para **probar que funciona** (que le caiga su primer referido = el aha), pero NO para operarlo a escala. La barrera muerde DESPUÉS del aha, nunca antes.

Última actualización: 2026-08-29

---

## La línea que NO se cruza (proteger el loop)
Estas cosas se quedan **gratis siempre** — si las gateas, nadie activa y no hay viralidad:
- Agregar clientes y generar su link, el portal del cliente, la landing del referido.
- **Recibir referidos hasta el tope** y trabajar esos primeros leads.
- El festejo / el primer aha.

Gatear el loop mismo = suicidio de activación. El gratis tiene que dejar que **sienta** que funciona.

## Estado actual (post cambios de hoy)
| | Gratis | Pro ($539/mes) |
|---|---|---|
| Clientes (cartera) | ilimitados | ilimitados |
| Leads en pipeline | **5** (resto bloqueado, no se pierde) | ilimitados |
| Comisión PPR/Vida | 0.25% | 0.15% |
| Enviar link a todos por correo | ❌ | ✅ |

## Los levers para endurecer, rankeados (impacto ÷ riesgo a la activación)

### 🥇 1. Tope de 5 leads (HECHO) + momento de paywall (HECHO hoy)
El lead cap es el lever más fuerte y mejor cronometrado: muerde justo cuando los referidos empiezan a fluir (valor ya probado). Bajarlo de 12→5 lo hace bastante más agresivo. **Nuevo:** un banner de upgrade que aparece SOLO cuando ya hay leads bloqueados ("tus referidos ya te están llegando solos — desbloquéalos con Pro"). Timing perfecto, sin dark pattern.

### 🥈 2. Mover las automatizaciones de valor a Pro (bajo riesgo, alta diferenciación)
Cosas que NO tocan el aha pero sí son "para operar en serio":
- **Nudges automáticos al cliente** (el cron `client-nudges` que le recuerda al cliente compartir/reclamar) → Pro. En Gratis, el asesor lo hace manual. Es un value-add real de Pro y no rompe el loop.
- **Envío masivo por WhatsApp/correo** (ya es Pro). ✅
- **Import CSV de clientes** → podría ser Pro (bulk = power user). Impacto bajo, opcional.

### 🥉 3. Cap de cartera en Gratis (CUIDADO — puede morder antes del aha)
Hoy los clientes son ilimitados en Gratis. Un cap (ej. 15–20) muerde a escala, no al arrancar. **Riesgo:** si el asesor necesita agregar muchos clientes para que UNO comparta, un cap bajo frena la activación. Si se hace, que sea **generoso (≥15)** y solo como lever a escala. Yo lo dejaría al final.

### 4. Diferencial de comisión más amplio (palanca de negocio, no de UI)
Hoy 0.25% vs 0.15%. Ampliar la brecha (ej. Gratis 0.35% / Pro 0.15%) hace que a volumen el Pro se pague solo. Es decisión de pricing (ver `pricing.md`), no de features. La tarjeta "en Gratis pagas X, en Pro Y" ya lo visibiliza.

### ❌ Lo que NO recomiendo
- **Límite de tiempo al Gratis** — decidiste que el freemium es sin límite de tiempo. No lo rompas.
- **Bloquear cerrar/convertir leads** o **gatear la credibilidad del asesor en la landing** — muerden antes del aha y bajan la conversión de los referidos. No.

## El "harder barrier" recomendado (combinación, no un solo golpe)
Free = "pruébalo y llega a tu primer referido"; Pro = "córrelo como negocio":
1. Lead cap **5** ✅
2. Momento de paywall al topar ✅
3. Nudges automáticos → Pro (siguiente, si lo apruebas)
4. (Opcional, a escala) cap de cartera generoso + brecha de comisión más amplia

Con 1–3 la barrera ya es notablemente más dura **sin tocar el aha**. 4 es para cuando tengas tracción y quieras exprimir el ARPU.

## Métricas para saber si funciona
- % Gratis→Pro (conversión).
- % de asesores que TOPAN los 5 leads (si es alto, el cap muerde donde debe).
- Activación (que el cap NO baje la tasa de primer-referido — vigilar que no muerda antes del aha).


---

<!-- ============================================================ -->
# 📄 [17] feedback-analysis.md
<!-- ============================================================ -->

# Análisis de feedback — cómo pesar lo que te dicen sin perder el foco

> Skill `analyzing-user-feedback` (frameworks de Lenny) aplicado a TU feedback real. El problema que resuelve: *"los asesores se desvían en sus recomendaciones (hazlo para todos, para autos), y ahí me pierdo."* La cura es dejar de tratar todo el feedback igual y pesarlo por **Representación × Influencia**.

Última actualización: 2026-08-29

---

## La regla madre
> **Que alguien sea ruidoso no significa que tengas que actuar.** Antes de mover el producto, pregunta: ¿qué % de mi ICP real representa este feedback, y qué tan influyente es quien lo dice? (Matriz de Reddit.) El feedback fuera de esos dos ejes es ruido, por más fuerte que suene.

## Tu feedback real, pasado por la matriz

| Fuente | ¿Representa tu ICP? | ¿Influyente para que Referidoo gane? | Veredicto |
|---|---|---|---|
| **Asesores >60 ("hazlo para todos, para autos, todos los productos")** | ❌ BAJO — no son tu early adopter (no digitales, no creen en el juego de referidos) | ❌ BAJO — no son quienes van a hacer despegar el producto | **Minoría ruidosa. NO actuar.** Es justo lo que te desvía. |
| **Asesor <40 (mucho feedback, mensaje de voz sin oír)** | ✅ ALTO — ES tu ICP | ✅ ALTO | **Máxima prioridad. Escúchalo YA.** Tu mejor señal, ignorada. |
| **Voz real MX en Reddit (r/Changarrito: "pedir referidos incomoda", "se me acaba el mercado natural", "enfócate en vida/GMM, evita autos")** | ✅ MEDIO-ALTO — asesores de vida MX reales | 🟡 MEDIO — no son usuarios, pero es voz auténtica | **Señal direccional. Valida tu nicho.** |
| **"Se siente incompleto / me da pena mostrarlo"** | ✅ transversal (afecta a todos) | — | **Fricción real. Ya actuaste** (fixes de onboarding). |

## El insight que te libera
Tu feedback de *"hazlo para todos / para autos"* viene de tu fuente **MENOS representativa y MENOS influyente** (los >60 fuera de ICP). Y tu fuente de **MAYOR fit** (el asesor <40 + la voz real de Reddit) dice **lo contrario**: *"enfócate en vida/GMM, evita autos, la trampa sin fondo."*

> O sea: bien pesado, el dato te dice que **tu foco es correcto** y que el "hazlo para todos" hay que **descartarlo**, no obedecerlo. No te estás cerrando — estás escuchando a las personas correctas.

## Errores clásicos que estabas por cometer (los flagea la skill)
- **Construir para la minoría ruidosa** — actuar sobre los >60 sin verificar si representan a tu base. (Tu trampa exacta.)
- **Confundir "pide una feature" con "necesita una feature"** — si un asesor pide X pero no usaría/pagaría, su petición pesa poco. Filtra por: ¿este que pide es de los que sí lo usarían con un cliente real?
- **No cerrar el loop** — cuando implementes algo que un asesor pidió (como los fixes de activación), avísale. Construye lealtad y te da tu testimonio.

## Tu sistema ligero de feedback (para no volver a perderte)
1. **Cada feedback lleva 2 etiquetas:** ¿quién lo dice es mi ICP? (sí/no) · ¿cuántas veces lo he oído? (1 / recurrente).
2. **Solo actúas sobre:** ICP = sí **Y** recurrente. Lo demás va a una lista.
3. **Lista "Fuera de tesis / Ahora no":** ahí escribes "para todos los asesores", "autos", "todos los productos". Escribirlo los saca de tu cabeza sin que te jalen el roadmap.
4. **Dogfooding (empatía experiencial):** tu plan de sentarte con un asesor y correr el loop ES esto. Súmale: córrelo tú mismo como cliente (agrégate a ti mismo) para sentir la fricción de primera mano, no solo por datos.

## Lo primero, hoy
**Escucha el mensaje de voz del asesor <40.** Es tu feedback de mayor fit y lleva días en pausa. Todo lo demás de esta página es para que, cuando lo oigas, sepas qué tomar y qué archivar.


---

<!-- ============================================================ -->
# 📄 [18] guion-presentacion.md
<!-- ============================================================ -->

# Guion base de presentación — Referidoo (1 a 1 con un asesor)

> Para sentarte con UN asesor de tu ICP (vida/GMM, cartera 30+, digital, <45) y correr el loop juntos. NO es un pitch de escenario: es una plática con demo. Regla madre: **hablas 40%, escuchas 60%.** Cada bloque trae 🎤 (lo que dices) y 👂 (lo que escuchas / anotas). Si tienes que elegir entre lucir el producto y oír su dolor en sus palabras → escucha. Dura ~15-20 min.

Última actualización: 2026-08-28

---

## Antes de empezar (mentalidad)
- **No vas a convencer, vas a descubrir + activar.** El objetivo real de la sesión NO es que diga "qué padre" — es que **le caiga un referido de verdad** (aunque sea de mentira, corriendo el loop él mismo). Ver `activation.md`.
- **La beta es un ACTIVO, no una disculpa.** No arranques pidiendo perdón por lo que falta. Enmárcalo como acceso anticipado / precio de fundador. (Mata de raíz el "se siente incompleto", ver más abajo.)
- **Su feedback de features NO manda.** Escúchalo, agradécelo, anótalo — pero recuerda: es experto en su dolor, no en tu roadmap (`who-is-this-for.md`).

---

## 0. Apertura — bajar la guardia (30 seg)
🎤 *"Gracias por el rato. No te vengo a vender nada hoy — te vengo a enseñar algo que estoy construyendo para asesores como tú y quiero que me digas sin filtro si es una tontería o no. ¿Va? Cuéntame primero de ti: ¿cuánto llevas en esto y en qué ramo te mueves más?"*

👂 Anota: ramo (¿vida/GMM? ✅ / ¿autos? señal de fuera de ICP), años, tamaño de cartera. Confirma si es tu ICP en los primeros 2 min.

---

## 1. El dolor — que lo diga ÉL, no tú (2-3 min)
🎤 *"De todo tu trabajo, ¿qué es lo más pesado? ¿Conseguir al siguiente cliente, o atender a los que ya tienes?"*
🎤 (si no lo dice solo) *"¿Cómo consigues clientes hoy? ¿Compras leads, hablas en frío, referidos...?"*
🎤 *"¿Y pedir referidos? ¿Se te hace fácil o te cuesta?"*

👂 ORO si dice algo como: *"se me acaba el mercado natural"*, *"me da pena pedir"*, *"la gente se harta de que le pidas"*, *"los leads salen carísimos y no cierran"*. **Esas son sus palabras — anótalas literal, son tu copy.**

> No pases al pitch hasta que ÉL haya nombrado un dolor. Si no hay dolor, no hay venta — y lo mejor que puedes sacar es entender por qué.

---

## 2. El puente — la mina dormida (30 seg)
🎤 *"Te digo cómo lo veo yo: cada cliente contento que tienes conoce a 5, 10 personas que necesitan justo lo que vendes. Te recomendarían sin problema. Pero esa recomendación casi siempre se muere en una plática al aire — no hay ni un motivo claro para el cliente, ni forma de que te llegue. O sea, tienes una mina de referidos que se te está fugando sin que la veas."*

👂 ¿Asiente? ¿Dice "sí, exacto" o pone cara de "mmm"? Si muerde el "se me fuga" → ganaste el ángulo Nivel-4. Si no, prueba el otro framing ("los que ya tienes te los traen").

---

## 3. La demo — HAZLO, no lo cuentes (5-6 min)  ← el corazón
> Aquí abres Referidoo en tu laptop/cel y corren el loop **juntos, con datos de él**. "Do, don't show".

🎤 *"En vez de contártelo, hagámoslo contigo ahorita. Métete tú mismo como si fueras tu propio cliente — 2 minutos."*

Pasos en vivo (que los haga ÉL, con tu guía):
1. **Se agrega a sí mismo** como cliente (o mete un cliente real de confianza).
2. **Abre el portal del cliente** → *"esto es lo que ve tu cliente: mira, aquí ve en pesos lo que gana si te recomienda. Ya no es un favor, es algo que le conviene."*
3. **Comparte el link** (que se lo mande a su propio WhatsApp).
4. **Simula que un conocido llena el formulario** → aparece el referido en su pipeline.
5. **Cierra ese referido** → *"y mira: el premio de tu cliente se calculó solo. Tú no hiciste cuentas ni perseguiste a nadie."*

🎤 Cierre de la demo: *"Eso que acabas de sentir — un prospecto tibio que te cae por confianza, sin comprar un lead — es lo único que hace Referidoo. Nada más, pero eso, bien."*

👂 ¿En qué paso se le prendieron los ojos? ¿Cuál lo confundió? ¿Qué preguntó? Anota el momento exacto de "ah, ya" — ese es tu aha, y te dice qué poner primero en el onboarding.

---

## 4. Manejo del "se siente incompleto / me da pena" (60 seg)
> Sácalo TÚ antes de que lo piense él. Conviértelo en pertenencia, no en riesgo.

🎤 *"Te soy claro: esto está en acceso anticipado. Estoy metiendo a un grupo chico de asesores buenos para construirlo CON ustedes, no para venderles algo terminado. Por eso quien entra ahorita entra con precio de fundador y con línea directa conmigo — lo que me pidas, lo veo yo. No te voy a poner enfrente de un cliente algo que te haga quedar mal; por eso lo probamos primero contigo, sin arriesgar a nadie de tu cartera."*

👂 ¿Su miedo era el producto, o quedar mal frente a su cliente? Si es lo segundo → refuerza que el "agrégate a ti mismo" es justo para probar sin riesgo.

---

## 5. La oferta — reversión de riesgo (45 seg)
> OJO: la oferta "no pagas hasta cerrar" implica el modelo comisión-primero que aún NO está decidido/shippeado (`pricing.md`). Úsala en la plática para medir reacción; no la prometas como contrato hasta decidir el precio.

🎤 *"Y el trato es a tu favor: no me pagas nada hasta que cierres tu primer cliente por aquí. Cierras uno, ganas miles en comisión, me das un pedacito. ¿No cierras? No pagas ni un peso. Yo gano cuando tú ganas."*

👂 ¿Le suena a ganga o a truco? ¿Pregunta "¿y luego cuánto?" (buena señal) o se queda frío? Esa reacción vale más que un sí de cortesía.

---

## 6. El cierre — un compromiso chico y real (60 seg)
> No cierres una venta. Cierra el **primer loop real.**

🎤 *"¿Le entras a probarlo de verdad esta semana? No con un familiar de compromiso — con UN cliente contento, de esos que sabes que te recomendarían. Yo te ayudo a mandarle su link hoy mismo, y vemos juntos cuando le caiga el primer referido. ¿Va?"*

👂 Agenda el siguiente contacto AHÍ MISMO (fecha concreta). Si dice que sí pero no agenda, no es un sí.

---

## Sábana de objeciones (respuestas cortas)
| Dice… | Respondes… |
|---|---|
| *"No tengo tiempo"* | "Son 2 minutos para probarlo tú, y el sistema hace el resto solo. El tiempo lo pierdes hoy persiguiendo leads que no cierran." |
| *"Mis clientes no van a compartir"* | "Por eso el premio es visible en pesos. Deja de ser un favor y pasa a convenirle a él. Probémoslo con uno y vemos." |
| *"¿Y si mi cliente ve algo raro?"* | "Por eso entras en acceso anticipado conmigo detrás. Y primero lo pruebas TÚ como cliente, sin exponer a nadie." |
| *"¿Cuánto cuesta?"* | "Nada hasta que cierres tu primer cliente. Ahí hablamos de números, y entras con precio de fundador." |
| *"Deberías hacerlo también para autos / para todo asesor"* | "Puede ser algún día. Hoy lo estoy haciendo brutalmente bueno para vida/GMM, porque ahí el referido por confianza lo es todo. Prefiero ser el mejor en una cosa." (👂 anótalo, NO lo prometas) |

---

## Qué te llevas de cada plática (para lockear positioning)
- La frase textual con la que ÉL nombró su dolor.
- En qué paso de la demo se le prendieron los ojos (= el aha → primer paso del onboarding).
- Si mordió "la fuga" o "los que ya tienes te los traen".
- Si la oferta le sonó a ganga o a truco.
- Un compromiso agendado para el primer loop real.

> Después de 3-4 de estas con asesores de tu ICP, tienes: el copy en su voz, el aha confirmado, el villano ganador, y (ojalá) tu primer loop cerrado = tu primer testimonio.


---

<!-- ============================================================ -->
# 📄 [19] mesa-redonda-berninimo.md
<!-- ============================================================ -->

# Mesa redonda con Berninimo — cómo presentar Referidoo para sacar asesoría, no aplausos

> Contexto: Patrick presenta Referidoo en una mesa redonda donde le van a aconsejar. Uno de los que asesora es **Berninimo (Bernardo Mohnblatt)**, fundador de BeepQuest (B2B SaaS de auditorías/checklists, cientos de clientes corporativos), experto en **venta B2B enterprise + MRR + unit economics**. Este doc es la preparación: qué presentar, qué preguntar, y cómo filtrar su consejo sin perder el foco.

Última actualización: 2026-08-28

---

## La regla madre de esta mesa
**No vas a vender. Vas a pensar en voz alta con un experto.** En una mesa de asesoría, mientras más honesto seas con el problema real, mejor el consejo. Un pitch pulido te trae felicitaciones inútiles; un problema bien planteado te trae oro. Lleva tu herida, no tu maquillaje.

## Lo que tienes que saber de Berninimo antes de entrar
- Su lente es **B2B / enterprise SaaS, venta consultiva, ingreso recurrente (MRR)**. Piensa en contratos grandes, no en tickets chicos.
- **Casi seguro te empujará a venderle a AGENCIAS / aseguradoras / corporativos** en vez de al asesor individual. Desde su mundo, tiene lógica (ahí está el MRR grande).
- ⚠️ **Ese empuje es el MISMO jalón "hazlo más grande / para todos" que ya te desvía.** No es malo — pero decídelo tú, no por inercia de la mesa. (Ver `who-is-this-for.md`.)
- Habla su idioma: MRR, churn, CAC, LTV, value metric, motion de ventas, ACV. Si usas sus términos, te toma en serio.

## Cómo abrir (60 seg — su idioma, no el de asesores)
> "Referidoo es un SaaS vertical para asesores de seguros de vida. Convierte a los clientes felices de un asesor en un canal de referidos: el cliente ve, en pesos, lo que gana por recomendar, refiere, y el prospecto tibio le cae al asesor en su pipeline. Estoy pre-tracción, en Fase 0 asistida, y vengo a esta mesa con dos problemas concretos que quiero resolver con ustedes: **activación y modelo de cobro.**"

Eso ya te posiciona como fundador serio: sabes tu etapa, sabes tu problema, y le das a Berninimo justo lo que sabe resolver.

## El estado HONESTO que debes poner sobre la mesa (no lo escondas)
- **Tracción:** 3 asesores registrados, **0 activados** (ninguno ha corrido el loop completo hasta que le caiga un referido real). Pre-ingresos.
- **El hoyo #1 — activación de dos lados:** el asesor mete 1-2 clientes y se para, porque el aha depende de que el CLIENTE actúe (comparta). Es una activación multi-lado con 4 handoffs. (Ver `activation.md`.)
- **El diagnóstico de muestra:** he probado con asesores >60 que no son mi early adopter; mi ICP real es el asesor de vida/GMM <45, digital. (Ver `who-is-this-for.md`.)
- **El dilema de cobro (tu carnada para él):** al asesor hoy se le cobra una **comisión por cliente cerrado**; además tengo una membresía **Pro de $539/mes**. No sé si cobrar la comisión, la membresía, o las dos — ni en qué orden. Este es su territorio: exprímelo aquí.

## Las 3 preguntas que pones sobre la mesa (en orden de valor)

### 1. 💰 El modelo de cobro (su cancha exacta — dale el mayor tiempo)
> "Tengo dos formas de monetizar al asesor: **comisión por cada cliente que cierra vía Referidoo** (alineado, riesgo cero para él, pero ingreso variable e impredecible para mí) y una **membresía Pro de $539/mes** (MRR predecible, pero le pido pagar antes de probar valor). ¿Cobro comisión primero para reversión de riesgo y subo a membresía después? ¿Las dos capas? ¿Cómo piensas el trade-off entre alinear-incentivos y MRR predecible en un SaaS vertical de ticket bajo?"

👂 Escucha: cómo un experto en MRR pesa "recurrente predecible" vs "comisión alineada". Es probable que empuje a MRR — anota su razonamiento, es lo más valioso de la mesa.

### 2. 🔁 La activación de dos lados
> "Mi aha depende de que el cliente del asesor actúe, no solo el asesor. ¿Cómo has resuelto activación cuando el valor depende de un segundo actor que no es tu usuario que paga? ¿Fuerzo el self-loop (el asesor se prueba a sí mismo primero) o hay algo mejor?"

👂 Berninimo vive de que equipos de campo ADOPTEN BeepQuest — sabe de activación multi-usuario. Aquí su consejo puede ser muy bueno y directamente aplicable.

### 3. 🎯 El canal (aquí es donde debes filtrar)
> "Mi ICP es el asesor individual de vida <45. ¿Lo persigo uno por uno, o me voy a las agencias/aseguradoras que ya los agrupan?"

👂 **Aquí va a empujar B2B/enterprise.** Escúchalo completo — puede tener un ángulo real (vender a una agencia = 20 asesores de golpe). PERO: no te comprometas en la mesa. Anótalo como hipótesis a validar DESPUÉS de tener 1 loop cerrado. No cambies de barco antes de que el primero flote.

## El guardarraíl de foco (léelo antes de entrar)
Cuando la mesa (o Berninimo) te diga "hazlo enterprise / para todas las aseguradoras / agrégale X para corporativos":
1. **Agradece y anota** — no discutas, no te defiendas.
2. **Pregúntate:** ¿esto me ayuda a cerrar mi PRIMER loop con mi ICP actual, o me manda a construir 6 meses antes de validar?
3. **Regla:** consejo de PRICING y de VENTAS de Berninimo = oro, tómalo. Consejo de PIVOTAR EL SEGMENTO antes de validar = anótalo como "Later", no como "ahora".
4. Tu trabajo #1 sigue siendo: **1 asesor de tu ICP corriendo el loop hasta que le caiga un referido.** Nada de la mesa cambia eso.

> El experto es experto en SU negocio (B2B enterprise). Tú eres el experto en el tuyo (referidos vida, ticket bajo, prosumer). Toma su método, no necesariamente su destino.

## Qué es un GRAN resultado de la mesa
- Una recomendación clara sobre **comisión vs membresía vs ambas** (y el porqué).
- 1-2 tácticas concretas de **activación multi-lado** que puedas probar esta semana.
- Una hipótesis de **canal** (agencia vs individual) anotada para validar — NO ejecutada aún.
- Que NO salgas pivoteando a enterprise sin haber cerrado tu primer loop.

## Qué llevar físicamente
- El **demo en vivo** listo (corre el loop en 2 min con datos de mentira) — pero úsalo solo si preguntan "¿cómo funciona?"; no arranques con él.
- Una hoja con **los números honestos** (3 registrados, 0 activados, el dilema de pricing) — los fundadores que muestran sus números crudos ganan respeto en estas mesas.
- Las 3 preguntas de arriba, escritas, para no perderte si la plática se dispersa.


---

<!-- ============================================================ -->
# 📄 [20] action-plan-semana.md
<!-- ============================================================ -->

# Plan de acción — esta semana (GTM en marcha)

> Todo apunta al #1 del roadmap: hablar con asesores reales y sacar a UNO que corra el loop. Assets listos para mandar hoy. Costo: $0.

Última actualización: 2026-08-25

---

## Cómo embocan las 3 piezas (el loop, no tareas sueltas)

`talk-to-users` → saca el **villano real + tus primeros usuarios** → un usuario **cierra el loop** → te da el **testimonio** (la prueba que hoy te falta) → que alimenta el siguiente round de `first-50-users` y valida el `positioning`. Cada plática avanza las tres a la vez.

## QUÉ DECIR — positioning (hipótesis a validar, no verdad)

- **Héroe:** el asesor (nunca Referidoo). **Sabio que le da el arma:** Referidoo.
- **Villano (la tendencia que empeora su dolor HOY):** *el cliente frío ya no compra.* La gente ignora llamadas, ads y desconocidos; solo confía en quien le recomiendan. Y los leads comprados cada año cuestan más y cierran menos. El asesor que depende de lo frío está perdiendo.
- **El problema nombrado (nivel 4, a validar en las pláticas):** **"la fuga de referidos"** — cada asesor deja escapar referidos que ya tiene, sin darse cuenta. Referidoo es el único que la tapa. Si los asesores adoptan esa palabra, ganaste la posición.
- **Lo que te falta:** la **resolución/prueba** (0 testimonios). Sale del primer asesor que cierre un loop. Por eso positioning depende de first-50 — no es al revés.
- En cada plática, **prueba el villano:** "¿sientes que el cliente frío ya no te compra como antes? ¿los leads cada vez peor?" Si asienten, ese es tu ángulo.

## DÓNDE Y CÓMO — first-50-users (profundidad, no dispersión)

- **Profundidad en UN grupo primero:** empieza todo-in en **"Digitalizando a los Agentes de Seguros"** (es un loop de descubrimiento de herramientas = donde YA buscan cosas como la tuya). Domina ese antes de sumar otro. Corrige el "postear en 2-3 grupos" de abajo: uno bien > tres a medias.
- **Convierte a los entrevistados en tus primeros usuarios** (design partners). El puente de plática → usuario es a mano, uno por uno.
- **NO construyas comunidad propia aún** (5 lurkers = cementerio, señal de "muerto"). Ve donde ya están.

## ⚠️ LA ALERTA — no metas tráfico a una cubeta con fugas

Antes de empujar asesores, confirma que uno puede llegar al **primer valor solo y rápido**: registrarse → meter un cliente → que el cliente comparta → ver el loop, **sin que tú lo lleves de la mano.** Con 0 loops cerrados, es probable que gotee. Si gotea, meter tráfico es tirar agua. → El siguiente skill después de la semana es **`onboarding`** (activación), no más adquisición.

---

## Lo que ya sabemos (para actuar con datos)

- **~50,000+ de los 74k agentes de tu lista son ramo personas/vida** (RIESGOS PERSONALES/FAMILIARES, VIDA) = tu ICP exacto. Buena señal: tu mercado es enorme y bien definido.
- **La lista NO trae contactos** (registro público CNSF: nombre, cédula, ramo). Sirve para dimensionar y verificar, no para DM directo. Enriquecerla (cruzar con LinkedIn/FB) es proyecto de escala, no de esta semana.
- **Canal rápido = grupos de Facebook + tus asesores ya registrados.** Ahí están activos y contactables.

## Los grupos de Facebook a unirte (hoy)

1. **Digitalizando a los Agentes de Seguros y Fianzas** — literalmente sobre herramientas para prospección/ventas. Tu público más caliente.
2. **Seguros de Vida y Gasto Médico Mayor** — tu ramo exacto.
3. **AGENTES DE SEGUROS MEXICO** (facebook.com/groups/agentesdesegurosmexico)
4. **Agentes de seguros México** (facebook.com/groups/agentesexitosos)
5. **Agentes de Seguros TOP de México**

Únete, observa 1-2 días qué se quejan, y luego actúa con los mensajes de abajo.

---

## Mensaje A — a tus asesores YA registrados (agendar llamada)

> Hola [Nombre], soy Patrick, el fundador de Referidoo. Vi que creaste tu cuenta, gracias por darle una probada. Estoy hablando 15 min con cada asesor para entender cómo consiguen clientes hoy y qué les serviría de verdad. No es para venderte nada, ya estás dentro. ¿Te late una llamada corta esta semana? Tú me dices el día.

## Mensaje B — DM en grupo FB (a quien comente sobre el dolor)

> Hola [Nombre], vi tu comentario sobre [lo caro de los leads / conseguir clientes]. Justo estoy investigando eso: cómo los asesores consiguen clientes nuevos hoy. Me encantaría escuchar tu experiencia 15 min. No te vengo a vender nada, de verdad. ¿Te late?

## Mensaje C — POST de valor en los grupos (arranca conversaciones, NO spam)

> Pregunta para los que llevan tiempo en esto: cuando cierras a un cliente contento, ¿de verdad te llega a recomendar con alguien? ¿Cómo lo manejas: le pides referidos, esperas a que salga solo, o de plano se pierde en el WhatsApp? Estoy tratando de entender qué tan aprovechado (o desperdiciado) está el boca a boca en seguros. Cuéntenme su experiencia real 👇

Este post es tu `talk-to-users` a escala: saca el dolor en sus palabras, te posiciona como curioso (no vendedor), y a los que comenten les mandas el Mensaje B.

---

## El plan, día por día

**Día 1-2**
- [ ] Unirte a los 5 grupos, pero ir **todo-in en "Digitalizando a los Agentes"** (los demás, solo observar).
- [ ] Mandar el **Mensaje A** a TODOS tus asesores registrados.
- [ ] Postear el **Mensaje C** en "Digitalizando" (y probar el villano en los comentarios).

**Día 3-5**
- [ ] Hacer las llamadas de 15 min (usa `talk-to-users-expo-kit.md`, sirve igual por Zoom/tel).
- [ ] Mandar **Mensaje B** a los que comenten tu post.
- [ ] Meta: **5-10 conversaciones reales.**

**Cierre de semana**
- [ ] Llenar las 4 cubetas del kit (dolores/ganancias/trabajos/villano) con frases textuales.
- [ ] En `founder-brief.md`, cambiar a `[validado]` cada supuesto que un asesor confirmó.
- [ ] Sacar a **1 asesor** que meta clientes y corra el loop.
- [ ] Volver a `strategy-and-roadmap` con lo aprendido: el Now cambia solo.

## Meta única de la semana
**5-10 conversaciones + 1 asesor corriendo el loop.** Eso desbloquea todo: valida el ICP, te da el rango de precio, y te devuelve la fe. El resto (pricing final, hero-oferta, cold-email a escala) espera esto.


---

<!-- ============================================================ -->
# 📄 [21] talk-to-users-expo-kit.md
<!-- ============================================================ -->

# Kit de entrevista para la expo — Referidoo

> Para llevar en el celular. Adaptación del TAB (Frankl) a tu realidad: asesores de seguros, en persona, en las expos de este mes. El objetivo NO es vender. Es entender el dolor en sus palabras y salir con 1-2 asesores dispuestos a probarlo.

---

## La regla de oro (si rompes esta, todo lo demás no sirve)

**Es una entrevista, NO un pitch.** No mencionas Referidoo hasta el final, y solo si preguntan o si vas a invitarlos a probarlo. En el momento en que demuestras el producto, el asesor deja de ser honesto y empieza a ser amable contigo. La info honesta vale más que un "qué bonito tu sistema".

Se siente raro no vender teniendo el producto en la mano. Aguántate. Vas a escuchar, no a convencer.

---

## Cómo abrir (problema primero, sin oler a vendedor)

> "Oye, ¿te robo 5 minutos? **No te vengo a vender nada**, te lo prometo. Estoy investigando cómo los asesores consiguen clientes nuevos hoy, y quiero entender tu experiencia real. ¿Cómo le haces tú?"

Si están ocupados o el piso está ruidoso: platica 3-4 preguntas rápidas ahí, y a los que se prendan, invítalos a un café / llamada de 20 min después (ahí haces la entrevista completa).

---

## Las 7 preguntas (nunca más de 7; que hablen ellos el 80%)

**Las 3 de oro:**
1. **Varita mágica:** "Si pudieras cambiar UNA cosa de cómo consigues clientes nuevos hoy, ¿qué sería?"
2. **Lo que está en juego:** "Si eso pasara, ¿cómo cambiaría tu mes, tus ingresos?"
3. **Por qué ahora:** "¿Qué ha cambiado en cómo se consiguen clientes en seguros, que hace esto más importante que hace 5 años?"

**Las 4 a la medida de Referidoo:**
4. "¿De dónde vienen los clientes que cierras hoy? ¿Cómo llegan a ti?" *(mina: compra leads / referidos / prospección fría / nada)*
5. "Cuando cierras a un cliente contento, ¿qué pasa después? ¿Te recomienda con alguien? ¿Cómo te enteras y cómo lo manejas?" *(mina: cuál de las 5 razones del villano es la suya)*
6. "¿Alguna vez intentaste ordenar tus referidos, o premiar a quien te recomienda? ¿Qué pasó, por qué no funcionó?" *(mina: qué han probado y por qué falló)*
7. "Si nada cambia en cómo consigues clientes el próximo año, ¿qué pasa?" *(mina: el costo de no hacer nada)*

Regla: nunca preguntes "¿no te gustaría un sistema que...?". Eso te da la respuesta que fuiste a pescar. Pregunta por su dolor, no por tu solución.

**Bonus para pricing (solo si ya enseñaste el producto al final):** "¿A qué precio esto sería tan caro que ni lo considerarías? ¿Y tan barato que dudarías de la calidad?" El hueco entre las dos es tu rango de precio. Y escucha su reacción a "membresía + una comisión por cliente cerrado": ¿le suena a abuso o a ganga?

---

## Qué escuchar (lo que este brief necesita validar)

Mientras habla, marca mentalmente si dice algo que confirme o tire estos supuestos:

- **Las 5 razones del villano** — ¿cuál es la suya? compra leads / no ve la mina de referidos / la ve pero no la explota / se le olvida / no tiene tiempo.
- **El mecanismo central** — ¿le hace sentido que un cliente refiera MÁS si ve lo que va a ganar? ¿O refiere por otra razón (relación, gratitud)?
- **Los 3 "hoy"** — ¿realmente compra leads / lleva a mano / no hace nada? ¿en qué proporción?
- **El ramo** — ¿vende vida/PPR? ¿los referidos son distintos por ramo?
- **Su vocabulario** — cómo llama al problema con SUS palabras (eso se vuelve tu copy después).

---

## Cómo capturar (rápido, en el cel, después de cada plática)

Anota **frases completas, textuales**, en 4 cubetas:

| Cubeta | Buscas |
|---|---|
| **Dolores** | malos resultados, riesgos, fricciones ("pierdo referidos porque...") |
| **Ganancias** | lo que quiere ("ojalá pudiera...") |
| **Trabajos** | qué intenta lograr ("necesito llenar mi agenda de...") |
| **Cambios del entorno** | tendencias que empeoran el dolor → tu **villano** ("cada vez los leads están más caros / la gente ya no contesta llamadas") |

Esas 4 cubetas alimentan directo a `positioning-and-story` y `value-prop-that-converts` cuando regreses.

---

## El cierre (aquí sí, el puente a la activación)

Solo al final, cuando ya escuchaste:

> "Oye, justo estoy construyendo algo para atacar esto que me contaste. ¿Te late que te lo enseñe 5 min y, si te hace sentido, lo pruebes con tu cartera? Sin costo, y me ayudarías un montón viéndolo usar de verdad."

Meta de la expo: salir con **1-2 asesores** que digan que sí a probarlo. Ese es el primer paso del loop que nunca ha corrido.

---

## Checklist antes de ir
- [ ] Este kit en el celular.
- [ ] Decidido: NO vendo, escucho.
- [ ] Las 7 preguntas memorizadas (o a la mano).
- [ ] Un lugar para anotar frases textuales (notas del cel / grabadora con permiso).
- [ ] Meta clara: ~10 pláticas + 1-2 que digan sí a probarlo.

## Después de la expo (cuando regreses)
- [ ] Llenar las 4 cubetas con las frases reales.
- [ ] En el brief, cambiar a `[validado]` cada supuesto que un asesor confirmó.
- [ ] Volver a `strategy-and-roadmap`: con lo aprendido, el Now cambia (probablemente a activar al asesor que dijo sí, o a `who-is-this-for` / `positioning`).


---

<!-- ============================================================ -->
# 📄 [22] plan-ceci-caso-exito.md
<!-- ============================================================ -->

# Plan Ceci — tu primer caso de éxito (modo millón de dólares)

> Un solo objetivo, todo lo demás es ruido: **que un cliente de Ceci refiera a un conocido, ese conocido deje sus datos, y Ceci lo cierre.** Ese loop cerrado = tu primera prueba de que Referidoo funciona + tu primer testimonio. Trátalo como si te pagaran $1M por lograrlo: alto contacto, cero fricción, seguimiento implacable. Ver [[project_auditoria-agentes-ia]] y `activation.md`.

Última actualización: 2026-08-29

---

## La estrella polar
**1 referido real, cerrado por Ceci.** No "que use la app", no "que meta clientes". El aha profundo: le cayó alguien que no persiguió, y lo cerró. Hasta que eso pase, nada más cuenta.

## La verdad que define el plan (activación de dos lados)
El aha de Ceci **depende de que su CLIENTE actúe** (abra, comparta). Son 4 handoffs, cada uno una fuga:
`Ceci mete al cliente → el cliente abre su portal → el cliente comparte → un conocido llena el formulario`.
Tu trabajo de $1M es **blindar cada uno de esos 4 pasos a mano.** No sueltes el proceso hasta que el referido caiga.

---

## Fase 0 — Antes de sentarte con ella (esta semana)
- [ ] **Confirma que Ceci es tu ICP.** Vida/PPR, digital, cree en referidos, <~45. Si es la asesora del mensaje de voz que no habías escuchado — **escúchalo primero** (ver [[project_referidoo_estrategia]] / who-is-this-for). Si no es ICP, elige mejor a quién le apuestas este esfuerzo.
- [ ] **Dale otro mes de Pro** (comp) para que no tenga NINGUNA fricción de pago durante el experimento. (Comando: `npx tsx prisma/comp-advisor.ts --apply <id>` con creds de prod; su id sale de /owner/asesores.)
- [ ] **Ten la app lista** y tu demo corrida una vez (tú como cliente de prueba) para que fluya.
- [ ] **Agenda la sesión 1 en persona o videollamada.** Nada async. Esto se hace hombro con hombro.

## Fase 1 — Sesión 1 (45–60 min, hombro con hombro): onboarding + elegir al cliente correcto
El error #1 de tus asesores fue meter a un **familiar de compromiso** que no refiere. Aquí lo evitas.

1. **Corre el loop CON ella, primero contigo.** Que se agregue a sí misma (el "agrégate a ti mismo" que ya dejamos visible), abra su portal, se mande su link, y sienta el recorrido completo sin arriesgar a nadie. 2 minutos. Que lo VIVA, no que se lo cuentes.
2. **Elijan JUNTOS al cliente ideal — no un favor familiar.** Criterios (escríbelos con ella):
   - Contento con Ceci (le tiene confianza real).
   - **Sociable / con red amplia** (conoce a mucha gente, le gusta recomendar).
   - Del ramo core (su seguro es vida/PPR).
   - Que NO le dé flojera el celular.
   > Uno bueno vale más que diez de relleno. Apunten a 1–2 clientes así, no a la cartera entera.
3. **Métanlo ahí mismo, juntos.**
4. **Fuerza el handoff EN LA SESIÓN.** No "luego le mando el link". Que Ceci le mande el link al cliente **ahí**, con un mensaje que pulan entre los dos (personal, con el premio claro). El fix que shippeamos la empuja a esto ("Mándale su link ahora").

## Fase 2 — Activar al CLIENTE (el lado que se cae, blíndalo)
El cliente no es tu usuario, pero sin él no hay aha. Plan para que ACTÚE:
- **Que Ceci se lo explique en persona/llamada, no con un link frío.** "Te va a llegar un link, mira lo que ganas si me recomiendas: [premio]. Compártelo con 2–3 personas que creas que les sirve."
- **Pídele compartir con personas CONCRETAS, no "con quien quieras".** "¿Quién de tu familia/trabajo crees que necesita un seguro?" → que piense en 2–3 nombres. Lo vago no mueve; lo específico sí.
- **Ventana de 48h:** si el cliente no compartió, Ceci lo contacta (sin pena — es su cliente). Tú le recuerdas a Ceci que lo haga.

## Fase 3 — El referido cae → Ceci cierra
- **Velocidad:** en cuanto entre el referido, Ceci lo contacta rápido (lead fresco convierte). Tú estás encima ese día.
- **Acompáñala al cierre** si titubea. Es tu caso de éxito; no lo dejes a la suerte.
- Al cerrar: que **le pague el premio a su cliente** (cierra el ciclo de confianza y deja al cliente listo para referir otra vez).

## Fase 4 — Captura el testimonio (el activo que enciende todo)
En cuanto cierre, mientras está caliente:
- **Grábala / documenta en SUS palabras:** ¿qué sintió cuando le cayó el referido solo? ¿el antes/después? ¿lo recomendaría?
- Ese testimonio es la **carne de tu historia** (actos 2 y 3 de `positioning.md`) y el combustible de first-50. Sin él, el positioning es esqueleto; con él, vendes.

---

## Cadencia de seguimiento (implacable)
Check-in con Ceci **cada 1–2 días** hasta que el loop cierre. No la sueltes. Un mensaje corto: "¿ya abrió su portal tu cliente? ¿te ayudo a recordarle?".

## Tablero de contingencias (los 4 handoffs)
| Se atora en… | Tu jugada de $1M |
|---|---|
| Ceci no mete al cliente | Métanlo juntos en la sesión, no la dejes salir sin eso. |
| El cliente no abre el link | Que Ceci le llame y se lo explique de viva voz. |
| El cliente no comparte | Pídele compartir con 2–3 personas concretas; ofrece redactar el mensaje. |
| Nadie llena el formulario | Revisa que el mensaje/landing sea claro; que el cliente comparta con más gente; prueba otro cliente. |

## Cómo sabes que ganaste
**Un referido real, cerrado por Ceci, y su premio pagado.** Ahí tienes: producto validado, el loop asesor→asesor listo para dispararse, y tu primer testimonio. Ese día, todo lo demás (hero-gratis, barrera, first-50) arranca con viento a favor.

---

# Capa 1 — Acompañamiento (skill `customer-success`)

Trata a Ceci como tu cliente #1 en onboarding de alto contacto. La meta de la fase de "launch" en customer-success es literal: **"first value achieved"** = tu aha. Y su gatillo de "health improvement" es literal: al lograr valor, **pide el testimonio/referido.**

## Plan de éxito de Ceci (una hoja, compártela con ella)
| Hito | Qué significa | Dueño | Fecha |
|---|---|---|---|
| Kickoff | Corrió el loop consigo misma + eligió al cliente ideal | Tú + Ceci | Sesión 1 |
| Handoff | El cliente recibió su link (mensaje pulido) | Ceci | Sesión 1, ahí mismo |
| Activación del cliente | El cliente abrió su portal y compartió con 2–3 | Cliente (Ceci empuja) | +48–72 h |
| **Primer valor** | Cayó un referido real | El sistema | cuando pase |
| Cierre | Ceci cerró al referido y pagó el premio | Ceci | +días |
| Testimonio | Documentado en sus palabras | Tú | mismo día del cierre |

## Señales de salud de Ceci (revísalas en cada check-in)
- 🟢 **Verde:** metió al cliente, mandó el link, el cliente abrió el portal. Va.
- 🟡 **Amarillo:** metió al cliente pero no mandó el link, o el cliente no abrió en 48 h. → llamada de re-enganche (tú a Ceci, Ceci al cliente).
- 🔴 **Rojo:** no metió a nadie / metió a un familiar de compromiso / dejó de contestarte. → interviene directo: siéntate de nuevo, re-elige cliente, no la sueltes.

> El objetivo de las señales: detectar la fuga ANTES de que se enfríe, no después.

# Capa 2 — Cierre de fundador (skill `founder-sales`)

Aunque a Ceci la estás compando (sin cobrarle aún), esto es una venta: le vendes **hacer el trabajo** y la confianza de que va a funcionar. Principios:

- **Tú eres el producto.** Sin marca ni casos aún, lo que cierra es Patrick presente, confiable, hombro con hombro. Tu involucramiento no es "soporte", es el producto en esta etapa.
- **Construye confianza humana.** "Mírala a los ojos" y hazle creer que va a funcionar — porque adoptar algo no probado exige una relación de alta confianza.
- **Pesimismo interno / optimismo externo.** Por fuera, total convicción. Por dentro, caza señales que descalifiquen: ¿Ceci de verdad va a hacerlo? ¿su cliente de verdad refiere? Si ves banderas rojas, corrígelas ya — no las ignores por optimismo.
- **Vende la visión y el dolor, no las features.** No le enumeres funciones; véndele el mundo donde sus clientes felices le traen clientes solos. El feature es el cómo, no el porqué.
- **Haz el "ask" de compromiso** (versión del $1 Invoice Test — cruza la barrera de pedir). No cierres la sesión sin un compromiso concreto y con fecha: *"¿Te comprometes a mandarle el link a [cliente] hoy y a recordarle en 2 días?"* El "sí" con fecha es tu contrato.
- **El ask financiero viene DESPUÉS del valor.** Cuando Ceci cierre su primer referido y pague el premio, ahí haces el ask real: *"¿le entras a Pro para seguir sin límite?"*. El valor primero, el cobro después — pero el cobro sí llega (valida intención real).

## El error de fundador que NO debes cometer
De `founder-sales`: **no te quedes eternamente en "discovery/acompañamiento" sin pedir el compromiso.** Es fácil ser el amigo que ayuda y nunca pide nada. Pide el compromiso de acción en cada sesión, y el de pago después del primer éxito.


---
_Fin del paquete — 22 documentos incluidos._
