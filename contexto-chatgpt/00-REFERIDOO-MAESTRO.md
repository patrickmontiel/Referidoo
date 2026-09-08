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
