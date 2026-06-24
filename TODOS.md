# TODOS

## Auth / Self-serve

### Rate limiting en /api/auth/register y /api/auth/login

**What:** Limitar intentos por IP/email en los dos endpoints de auth públicos — hoy ninguno tiene límite.

**Why:** Sin esto, /login permite fuerza bruta de contraseñas sin límite de intentos, y /api/auth/register puede recibir spam de cuentas (la verificación por email reduce esto pero no lo elimina).

**Context:** Surgió durante `/plan-eng-review` de Approach A (self-serve mínimo viable, 2026-06-19). A tráfico casi cero (un asesor de prueba) no es urgente. En cuanto haya asesores reales con contraseñas reales que proteger, vale la pena — opciones: Upstash Ratelimit, o un contador simple por IP/email en la DB (ej. tabla `LoginAttempt` con ventana de tiempo). No hay infraestructura de rate-limiting hoy en el proyecto.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Billing

### Integrar CFDI (factura fiscal) para el cobro de Mercado Pago

**What:** Generar factura fiscal timbrada (CFDI) para el cobro recurrente de $539/mes, vía un PAC (proveedor autorizado de certificación — ej. Facturama, Open Factura).

**Why:** Decidido explícitamente en esta sesión (2026-06-22/23) diferir CFDI hasta que un asesor lo pida — Mercado Pago da recibo de pago simple sin CFDI timbrado, y con 1-2 asesores pagando no es urgente. Integrar un PAC es trabajo real (días, no horas).

**Context:** Surgió al construir Approach B (cobro automatizado con Mercado Pago) tras confirmar que el asesor de prueba sí pagaría. El webhook de Mercado Pago (`src/app/api/webhooks/mercadopago/route.ts`) y el endpoint de suscripción (`src/app/api/billing/subscribe/route.ts`) no tocan facturación — si esto se vuelve un requisito, hay que decidir qué PAC usar y dónde se dispara el timbrado (¿en el webhook de pago aprobado?).

**Effort:** L
**Priority:** P4
**Depends on:** Que un asesor real lo pida, o que el negocio lo requiera fiscalmente.

## Plataforma / Dashboard de dueño

### Paginación en GET /api/admin/advisors

**What:** Agregar paginación (o al menos un límite + cursor) al endpoint que lista
todos los asesores para el dashboard de dueño.

**Why:** Hoy carga todos los asesores sin límite con `db.advisor.findMany()`. A 1
asesor no importa; en cuanto haya cientos, la tabla se vuelve lenta de cargar.

**Context:** Surgió durante `/plan-eng-review` del dashboard de dueño (2026-06-23/24),
sección de Performance. No bloquea nada hoy — es una optimización para cuando haya
volumen real de asesores registrados.

**Effort:** S
**Priority:** P4
**Depends on:** Que el número de asesores crezca lo suficiente para notarse.

### /owner/pagos — monitoreo de webhooks/cobros fallidos de Mercado Pago

**What:** Página dentro del dashboard de dueño que muestre webhooks fallidos o
pagos rechazados de Mercado Pago, antes de que el asesor afectado se queje.

**Why:** Es uno de los 4 disparadores reales confirmados en `/office-hours`
(2026-06-23) para el dashboard de dueño — pero la fuente de datos no estaba
resuelta a tiempo para v1.

**Context:** Mercado Pago no expone un log histórico simple de webhooks fallidos
vía API. Dos caminos: (a) construir una tabla propia de eventos, registrando cada
webhook recibido (éxito o falla) en `src/app/api/webhooks/mercadopago/route.ts`, o
(b) inferir indirectamente desde `Advisor.paymentFailedAt` (más simple, menos
completo — no distingue fallo de webhook de fallo de cobro). Diferido a v1.1 del
dashboard de dueño (ver design doc en `~/.gstack/projects/patrickmontiel-Referidoo/`).

**Effort:** M
**Priority:** P3
**Depends on:** Decidir (a) vs (b) cuando se retome.

### Backfill histórico de comisión Referidoo (lessioCommission)

**What:** Calcular y persistir `lessioCommission` para referidos YA convertidos
antes del lanzamiento del campo (hoy queda `null`, no se recalcula retroactivamente).

**Why:** `saleAmount` y `productType` ya están persistidos en `Referral`, así que el
backfill es técnicamente posible en cualquier momento — solo se difirió porque el
volumen histórico hoy es bajo (datos de prueba) y no justificaba bloquear el
arreglo más urgente (el shell de dueño).

**Context:** Decidido explícitamente en `/office-hours` (2026-06-23) tras una
segunda opinión que cuestionó meter el backfill en el alcance de v1. En cuanto
haya varios asesores reales con meses de conversiones, ese histórico sin comisión
persistida es dinero real no contabilizado en los reportes de ingresos.

**Effort:** S
**Priority:** P3
**Depends on:** Que haya suficiente volumen histórico real para que valga la pena.

## Design

### Crear DESIGN.md formal

**What:** Documentar por escrito el sistema visual real del proyecto (paleta, tipografía, espaciado, componentes base) que hoy solo existe implícito en el código.

**Why:** Cada `/design-review` y `/plan-design-review` tiene que re-derivar el sistema visual leyendo `/login` u otras páginas directamente — funciona, pero es repetitivo y propenso a divergencia conforme se agreguen más pantallas.

**Context:** Surgió durante `/plan-design-review` de Approach A (2026-06-19). El sistema actual: fondo blanco, card centrado `max-w-sm`, `-apple-system`/`Segoe UI` como tipografía principal (decisión deliberada, no accidental — confirmada en este mismo review), labels uppercase `text-gray-500`, inputs `rounded-xl border-gray-200`, botón pill negro. No bloquea nada hoy; correr `/design-consultation` cuando haya tiempo.

**Effort:** S
**Priority:** P3
**Depends on:** None
