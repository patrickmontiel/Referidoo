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

## Design

### Crear DESIGN.md formal

**What:** Documentar por escrito el sistema visual real del proyecto (paleta, tipografía, espaciado, componentes base) que hoy solo existe implícito en el código.

**Why:** Cada `/design-review` y `/plan-design-review` tiene que re-derivar el sistema visual leyendo `/login` u otras páginas directamente — funciona, pero es repetitivo y propenso a divergencia conforme se agreguen más pantallas.

**Context:** Surgió durante `/plan-design-review` de Approach A (2026-06-19). El sistema actual: fondo blanco, card centrado `max-w-sm`, `-apple-system`/`Segoe UI` como tipografía principal (decisión deliberada, no accidental — confirmada en este mismo review), labels uppercase `text-gray-500`, inputs `rounded-xl border-gray-200`, botón pill negro. No bloquea nada hoy; correr `/design-consultation` cuando haya tiempo.

**Effort:** S
**Priority:** P3
**Depends on:** None
