# 14 · Recovery del asesor existente + alcance de cuentas en analytics

> Implementado **solo en local** (Fase 4). Sin push, sin Turso prod.

---

# PARTE A · `analyticsExcluded` — cómo funciona HOY

## A.1 Comportamiento actual (verificado en código)
| Situación | Valor | Resultado |
|---|---|---|
| **Default del schema** | `Advisor.analyticsExcluded Boolean @default(false)` | Toda cuenta nueva **entra** a analytics salvo que se diga lo contrario |
| **Registro público normal** | `false` | ✅ **Cuenta como negocio real, sin aprobación manual** |
| **Cuenta del owner** | `true` (automático) | El registro evalúa `isPlatformOwner(email)` (config `PLATFORM_OWNER_EMAIL`) y la excluye |
| **QA / e2e / interna** | `true` (opt-in explícito) | Solo si el alta manda `internalToken` **y** el entorno define `INTERNAL_SIGNUP_SECRET` |
| **Cuentas ya existentes en prod** | lo que decida el PASO C de `13` | Operación de datos puntual, reversible |

## A.2 Por qué NO rompe a un asesor real que se registra solo
El "deny-by-default" del doc `13` es una **operación de datos de una sola vez** sobre las filas que YA existen en producción (contaminadas). **No** es el comportamiento del sistema: el default del schema sigue siendo `false`, así que **cualquier signup público futuro entra a métricas automáticamente**. Son dos cosas distintas:

- **Limpieza histórica** (`13`, PASO C) → deny-by-default sobre lo viejo, porque no sabemos qué es real.
- **Runtime** (este doc) → allow-by-default, porque un registro público es real por definición.

## A.3 Recomendación: **Opción A** (mantener `analyticsExcluded`), NO `accountType`
Se evaluó `accountType = real|test|internal|owner`. **No aporta lo suficiente para justificar la migración:**
- El único consumidor es el filtro de analytics, que necesita un **booleano**, no una taxonomía.
- `analyticsExcluded` ya está implementado, ya está en el alcance único (`analytics-scope.ts`) y ya tiene tests.
- La distinción real/test/internal/owner **no cambia ninguna decisión de producto** hoy — solo "cuenta o no cuenta". Guardar una taxonomía que nadie lee sería exactamente el error que estamos corrigiendo (pedir/guardar datos que no cambian nada).
- Si algún día hace falta distinguir *por qué* se excluyó, se agrega `excludedReason String?` sin tocar el filtro.

**Nada depende de nombres ni de dominios de correo.** El único input de configuración es `PLATFORM_OWNER_EMAIL` (env, no hardcode) y un secreto de entorno para altas internas.

## A.4 Hueco conocido (documentado, no tapado)
Los tests de Playwright (`e2e/signup.spec.ts`) crean asesores **a través del formulario del navegador**, así que no pueden mandar `internalToken` en el body. Esas cuentas nacen con `analyticsExcluded = false`.
**Mitigación:** correr los e2e solo contra base local, o marcarlas después. **Pendiente:** que el spec use un alta programática con el token. No lo tapé con un filtro por dominio de correo — eso sería volver al hardcode.

---

# PARTE B · Recovery del asesor existente

## B.1 Estados (derivados, nunca persistidos)
```
NEW              clientCount = 0                                  → onboarding legacy
RECOVERY_NEEDED  clientCount > 0  y  activationCount = 0          → RECOVERY  ← caso Ceci
READY            activationCount > 0  y  referralCount = 0        → operación normal
ACTIVATED        referralCount > 0                                → operación normal
```
Se evalúa **de más avanzado a menos** (`referral → activación → cartera`), para que un asesor nunca retroceda a una superficie de setup que ya superó. Al no persistirse, **no hay flag que desincronizar** ni "recovery completado" que recordar.

## B.2 Cómo se decide quién entra y cómo evitamos que reaparezca
- **Entra** solo `RECOVERY_NEEDED` (`shouldShowRecovery`).
- **Deja de aparecer** en el instante en que existe **una activación** — el hecho que lo cierra. Como el estado se deriva en cada carga, un **logout/login no lo resucita** (probado en E2E).
- **No es una heurística frágil**: combina cartera + activaciones + referidos, y cada transición es explícita y testeada (15 tests).

## B.3 UX pantalla por pantalla
1. **`/admin` — tarjeta de recovery.** "Ya empezaste · Ya tienes N clientes conectados." Sin welcome, sin tour, sin checklist de 5 tareas. Progreso **real**: clientes conectados / productos / premios / canal / primera activación (lo no configurado sale sin marcar; nada de avance decorativo).
   CTA primario **"Agregar el resto de mi cartera"** → `/admin/clientes`. Secundario **"Activar estos N →"** → `/admin/empezar`.
   Si faltan datos, ahí mismo aparecen **las dos únicas preguntas**: productos (PPR/Vida/Ambos) y canal (WhatsApp/Email/Ambos). Si ya se conocen, **no se vuelven a preguntar**.
2. **`/admin/clientes` — conectar el resto.** Reutiliza el preview de import ya construido: *"N ya existen · N nuevos · N posibles duplicados"*, con resolución de duplicados antes de escribir. Nunca reimporta en silencio.
3. **`/admin/empezar` — "Así quedó tu sistema".** Solo valores reales (productos, cartera, contactables, premios, canal) — lo no configurado se muestra como **"○ Sin definir"**, no se maquilla. Incluye **preview REAL**: el mensaje renderizado con un cliente real de su cartera + enlace a su **portal real**. No se envía nada.
4. **Primera activación** → `/admin/campanas/nueva` con tamaño sugerido (`<25`: todos · `25–100`: ~30 · `100+`: 30–50), **siempre editable**.
5. **Después** → resultados de la activación (audiencia visible aunque todo esté en 0), nunca un dashboard vacío.

## B.4 Qué onboarding legacy queda (y cuándo dispara)
| Pieza | Estado |
|---|---|
| Welcome overlay + `ONBOARDING_FLOW` (tour "registra tu primer cliente") | **Solo para asesores SIN cartera.** El layout calcula `hasPortfolio` y pasa `suppressLegacyOnboarding`, así que **recovery tiene precedencia**. |
| `PrimerosPasosCard` (checklist de 5 tareas) | **Oculta en recovery** (`hideSetupChecklist`). Sigue viva para cuentas nuevas. |
| Chip de progreso en el top-bar | Se mantiene (no estorba y aún sirve a cuentas nuevas). |
| `TASKS` / `CLIENT_STEPS` / `TIERS_STEPS` | **No se eliminan todavía**: son el único onboarding que existe para cuentas nuevas hasta que se construya el Onboarding V2 (ver `10`). |

## B.5 Eventos (sin PII)
`recovery_import_clicked`, `system_preview_viewed`, `activation_flow_started` — más los ya existentes del funnel (`portal_link_sent`, `client_portal_opened`, …) y los de campaña. Se disparan con `trackEvent` (fire-and-forget, nunca rompe el flujo); el preview usa un efecto de montaje, así que un refresh no duplica dentro de la misma carga.
**Pendiente:** `recovery_flow_started` / `recovery_completed` como eventos server-side derivados del cambio de estado — hoy el estado ya es observable por conteos, así que no se inventó un evento que nadie consume.

## B.6 Verificación (E2E, 18/18)
- **0 clientes** → NO ve recovery (cae al flujo de cuenta nueva).
- **4 clientes, 0 activaciones** → ve *"Ya tienes 4 clientes conectados"*.
- Perfil mínimo se guarda; producto inválido → 400.
- Import: 4 ya existen · 26 nuevos · 1 posible duplicado → resuelto → **cartera 31**.
- `/admin/empezar` muestra sistema real + preview real.
- Sigue en recovery **hasta** activar; tras la primera activación **desaparece**, y **tampoco reaparece tras logout/login**.
