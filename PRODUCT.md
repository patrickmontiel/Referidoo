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
