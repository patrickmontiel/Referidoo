# 00 · Activation Operating System — Referidoo (pre-PMF)

> Cómo operamos Referidoo **mientras estamos pre-PMF**. Snapshot: 2026-09-09. Esta carpeta (`operacion-activacion/`) es el sistema operativo de esta fase; la auditoría del producto real vive en `../auditoria-actual/`.

## Principio de esta fase
**No seguir construyendo Referidoo por intuición.** El objetivo único es:

> **Observar suficientes loops reales para descubrir exactamente dónde se rompe la activación.**

Construir features nuevas ahora es ruido. Lo que falta no es producto: es **evidencia de que el loop de dos lados funciona con humanos reales**.

## Qué es activación (definición dura)
La activación **NO** es: registro, onboarding terminado, cliente agregado, ni link generado.

> **Activación = un asesor recibe su primer referido REAL proveniente de uno de sus clientes.**

Y la **activación profunda** (deep activation):

> **Ese referido se cierra y el cliente recibe su recompensa.**

## North Star provisional
> **FIRST REAL REFERRAL PER ADVISOR** — # de asesores que han recibido ≥1 referido real originado por un cliente suyo.

Es provisional: se revisa cuando tengamos evidencia de loops reales (no antes).

## Métricas auxiliares (la cadena)
Cada eslabón es un handoff que puede romperse. Origen de datos: `ProductEvent` (después del deploy) + timestamps de `Referral`.

| # | Transición | Fuente |
|---|---|---|
| 1 | advisor → first client | `Advisor.createdAt` → primer `Client.createdAt` |
| 2 | client created → portal action | `client_created` → `portal_link_sent` |
| 3 | portal action → first portal open | `portal_link_sent` → `client_portal_opened` |
| 4 | portal open → share action | `client_portal_opened` → `referral_share_clicked` |
| 5 | share action → landing activity | `referral_share_clicked` → `referral_landing_viewed` |
| 6 | landing → form start | `referral_landing_viewed` → `referral_form_started` |
| 7 | form start → referral created | `referral_form_started` → `referral_created` |
| 8 | referral created → first contact | `referral_created` → `Referral.contactedAt` |
| 9 | referral → converted | `contactedAt` → `status=converted` |
| 10 | converted → reward paid | `rewardApprovedAt` → `rewardPaidAt` |

**⚠️ Regla de lectura (no falsear el funnel):**
- `referral_share_clicked` = **el cliente pulsó compartir**, NO que envió el mensaje.
- `referral_landing_viewed` = **una vista** (un share puede generar **varias** vistas; no es un lead único ni una persona única).
- **Shares y views NO son un funnel 1:1.** No se calcula una tasa share→landing (podría superar 100%). En `/owner/activacion`, una conversión se muestra solo donde el denominador aplica limpio; si saliera >100% se muestra "—".

## NOW / NEXT / LATER / KILLED

### NOW (lo único en foco)
1. **Instrumentación funcionando en PRODUCCIÓN.** (Hoy: código listo y probado en local; **NO desplegado** — ver estado abajo.)
2. **Conseguir el primer referido real con Ceci** (experimento 1 — ver `01-CECI-EXPERIMENTO.md`).
3. **Seguir ese referido hasta cierre y recompensa** (deep activation).
4. **Segundo experimento limpio con el prospecto de 32 años** (ver `04-PROSPECTO-32.md`).

### NEXT (solo cuando NOW dé señal)
- Interpretar dónde se rompió el loop en experimentos 1 y 2 y decidir el **primer cuello real** a estudiar (Conversion Audit — ver triggers).
- Repetir el loop con 1–2 asesores más del mismo ICP (Vida/PPR individual) para confirmar el patrón.

### LATER (no ahora, requiere evidencia)
- Economics Audit (pricing/comisión) — ver TRIGGER.
- GTM Audit (adquisición) — ver TRIGGER.
- B2B readiness → build — ver `05-B2B-READINESS.md`.
- Endurecer trust gaps clasificados como "BEFORE NEXT ADVISOR" / "BEFORE B2B" (ver `03-TRUST-AUDIT.md`).

### KILLED / PARKED (no construir en esta fase)
Auto · GMM/Daños · Premios Burbuja · app móvil · CRM adicional · producto de agencias/B2B · API enterprise · IA de conversión (el "moat" de aprendizaje) · redesign · nuevas funcionalidades Pro · adquisición pagada. *(Parked = reversible por decisión, no muerto para siempre; ver `06-DECISION-LOG.md`.)*

## Estado de la instrumentación (verdad al 2026-09-09)
- Código: `ProductEvent` + `/api/events` + `/owner/activacion` **construido, probado (200/200 tests), build verde, E2E local completo**.
- **Producción: NO desplegado.** Hay commits locales ahead de `origin/master`. El deploy está **bloqueado en el gate**: no hay credenciales de Turso producción cargadas en el entorno del agente, así que Patrick debe correr la migración y el push (ver respuesta de terminal / `06-DECISION-LOG.md`).
- Hasta que esté en prod, **cualquier métrica de activación real = `UNKNOWN — REQUIERE OBSERVACIÓN REAL`.**

## Audit Triggers (cuándo se ACTIVA cada auditoría — no antes)

### Conversion Audit — TRIGGER
No optimizar pantallas todavía. Se dispara según dónde caiga el cuello observado:
- `portal_open` alto pero `share` bajo → estudiar **portal del cliente** `/c/[token]`.
- shares ocurren pero `landing`/`form` bajo → estudiar **landing** `/r/[code]`.
- referrals entran pero **no se contactan** → estudiar **pipeline/ejecución del asesor**.
- referrals contactados pero **no convierten** → estudiar **calidad del referral / proceso de venta**.
- **No rediseñar nada hasta observar un cuello real.**

### Economics Audit — TRIGGER
No hacer recomendaciones de pricing todavía. Arranca cuando tengamos **algunos loops reales suficientes** para observar: referrals generados, conversiones, primas, premios al cliente, comisiones de Referidoo, y **disposición del asesor a seguir pagando**. "Suficientes" = evidencia para una conversación informada, **no** un número arbitrario tratado como significancia estadística.

### GTM Audit — TRIGGER
No hacer adquisición a escala hasta demostrar que el loop **produce valor**. Cuando haya señal, investigar: ICP del asesor, canal de adquisición, activation rate, CAC, referral asesor→asesor, sales motion, agency motion.

### B2B build — TRIGGER
No construir B2B hasta tener **evidencia del loop individual** (al menos experimentos 1 y 2 con referido real, idealmente uno cerrado). Antes, solo responder las preguntas de `05-B2B-READINESS.md`.

## Regla anti-fabricación
Nunca rellenar métricas que no existan. Si no hay dato real → escribir **`UNKNOWN — REQUIERE OBSERVACIÓN REAL`**. No convertir hipótesis en hechos.
