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
