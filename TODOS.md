# TODOS

## Auth / Self-serve

### Rate limiting en /api/auth/register y /api/auth/login

**What:** Limitar intentos por IP/email en los dos endpoints de auth públicos — hoy ninguno tiene límite.

**Why:** Sin esto, /login permite fuerza bruta de contraseñas sin límite de intentos, y /api/auth/register puede recibir spam de cuentas (la verificación por email reduce esto pero no lo elimina).

**Context:** Surgió durante `/plan-eng-review` de Approach A (self-serve mínimo viable, 2026-06-19). A tráfico casi cero (un asesor de prueba) no es urgente. En cuanto haya asesores reales con contraseñas reales que proteger, vale la pena — opciones: Upstash Ratelimit, o un contador simple por IP/email en la DB (ej. tabla `LoginAttempt` con ventana de tiempo). No hay infraestructura de rate-limiting hoy en el proyecto.

**Effort:** S
**Priority:** P3
**Depends on:** None

## Design

### Crear DESIGN.md formal

**What:** Documentar por escrito el sistema visual real del proyecto (paleta, tipografía, espaciado, componentes base) que hoy solo existe implícito en el código.

**Why:** Cada `/design-review` y `/plan-design-review` tiene que re-derivar el sistema visual leyendo `/login` u otras páginas directamente — funciona, pero es repetitivo y propenso a divergencia conforme se agreguen más pantallas.

**Context:** Surgió durante `/plan-design-review` de Approach A (2026-06-19). El sistema actual: fondo blanco, card centrado `max-w-sm`, `-apple-system`/`Segoe UI` como tipografía principal (decisión deliberada, no accidental — confirmada en este mismo review), labels uppercase `text-gray-500`, inputs `rounded-xl border-gray-200`, botón pill negro. No bloquea nada hoy; correr `/design-consultation` cuando haya tiempo.

**Effort:** S
**Priority:** P3
**Depends on:** None
