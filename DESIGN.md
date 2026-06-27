---
name: Referidoo
description: Dashboard de referidos para asesores de seguros y planes financieros en México
colors:
  ink: "#0a0a0a"
  paper: "#ffffff"
  neutral-50: "#f9fafb"
  neutral-100: "#f3f4f6"
  neutral-200: "#e5e7eb"
  neutral-400: "#9ca3af"
  neutral-500: "#6b7280"
  neutral-600: "#4b5563"
  accent-blue: "#3b82f6"
  warning-bg: "#fffbeb"
  warning-ink: "#d97706"
  danger-bg: "#fef2f2"
  danger-ink: "#dc2626"
  success-ink: "#16a34a"
typography:
  body:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  badge-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.full}"
    padding: "4px 8px"
  badge-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-ink}"
    rounded: "{rounded.full}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Referidoo

## 1. Overview

**Creative North Star: "La Herramienta de Confianza"**

Referidoo se siente como una herramienta de trabajo sólida, no como una pieza de marketing — en la línea de lo que Apple hace con sus apps de productividad: blanco y negro plano, sin decoración que compita con la tarea, cada pantalla resuelta con la mínima cantidad de elementos visuales necesarios. El asesor que la usa maneja dinero y datos de sus clientes; la interfaz transmite eso con quietud, no con personalidad. No hay sombras, no hay gradientes, no hay color de marca dominante — el negro y el blanco cargan toda la jerarquía visual, y el color (azul, ámbar, rojo, verde) aparece únicamente como señal funcional de estado, nunca como decoración.

Esto rechaza explícitamente la estética de SaaS genérico de 2024-2026: sin gradientes morado/azul, sin glassmorphism, sin "AI gradient" aesthetic, sin badges-pill como tendencia visual sino como código de estado real.

**Key Characteristics:**
- Blanco y negro como base; el color es señal de estado, no decoración
- Plano por completo — cero `box-shadow` en todo el proyecto
- Border sutil (`border-gray-100`) en vez de sombra para separar superficies
- Tipografía Geist en un solo peso por rol, sin jerarquía display dramática
- Densidad de producto, no de marketing — espaciado funcional, no expansivo

## 2. Colors

La paleta es deliberadamente mínima: dos primitivos (negro/blanco) cargan el 90% de cada pantalla; el color solo aparece para comunicar estado.

### Primary
- **Ink** (`#0a0a0a`): texto principal y fondo de los elementos de mayor énfasis (botón primario, card de MRR, nav activo). Es el "acento" del sistema — no hay un color de marca separado.

### Neutral
- **Paper** (`#ffffff`): fondo base de toda la app.
- **Neutral 50** (`#f9fafb`): fondos secundarios sutiles (hover de filas, fondos de badge neutro).
- **Neutral 100** (`#f3f4f6`): el border de las cards (`border-gray-100`) — la única forma de separación entre superficies.
- **Neutral 200** (`#e5e7eb`): border de inputs y campos de formulario.
- **Neutral 400** (`#9ca3af`): solo para usos no-textuales (líneas de datos en gráficas, números de índice decorativos) — nunca como color de texto, falla WCAG AA (~2.5:1 contra blanco).
- **Neutral 500** (`#6b7280`): texto secundario / labels (`text-gray-500`) — captions de widgets, fechas, metadatos. Reemplazó a Neutral 400 como color de texto secundario en todo el proyecto (corrección de contraste, junio 2026).
- **Neutral 600** (`#4b5563`): texto de nav inactivo.

### Semantic (estado, no decoración)
- **Accent Blue** (`#3b82f6`): único uso decorativo permitido — el punto junto al wordmark "referidoo". No se usa en ningún otro lugar como acento de marca.
- **Warning** (bg `#fffbeb` / ink `#d97706`): pago fallido dentro del periodo de gracia, referido sin confirmar, "pocos datos todavía".
- **Danger** (bg `#fef2f2` / ink `#dc2626`): pago fallido fuera del periodo de gracia.
- **Success** (`#16a34a`): línea de comisión en gráficas — único lugar donde verde aparece, nunca como botón de "éxito" genérico.

### Named Rules
**The Two-Color Rule.** Negro y blanco resuelven la jerarquía visual de cualquier pantalla. Un color solo se introduce cuando comunica un estado real (advertencia, error, comisión) — nunca para diferenciar secciones o decorar.

## 3. Typography

**Body Font:** Geist (con fallback `-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`)

**Character:** Una sola familia tipográfica en pesos moderados (400/500/600) — sin pairing serif/sans, sin display font dramático. La tipografía no es protagonista; es legible y se queda fuera del camino.

### Hierarchy
- **Title** (600, 1.25rem / `text-xl font-semibold`, line-height 1.3): título de página (ej. "Resumen del negocio"). Aparece una vez por pantalla, nunca repetido como hero.
- **Body** (400, 0.875rem / `text-sm`, line-height 1.5): texto de contenido general, nombres de asesores/leads, mensajes de estado.
- **Label** (400, 0.75rem / `text-xs`): captions de widget, fechas, metadatos secundarios — siempre en Neutral 400.
- **Emphasis** (600, varía según contexto / `font-medium` o `font-semibold`): montos de dinero, nombres en listas, valores que el asesor necesita escanear rápido.

### Named Rules
**The No-Display Rule.** No existe un tamaño "hero" o `clamp()` dramático en todo el proyecto. El título más grande de cualquier pantalla es `text-xl`. Esto es producto, no landing page — el contenido es la jerarquía, no el tamaño de letra.

## 4. Elevation

Sistema completamente plano. No existe un solo `box-shadow` en el proyecto — la separación entre superficies se logra con un border sutil de 1px (`border-gray-100`) o con el contraste fondo blanco / card blanca sin border en absoluto cuando no hace falta separación. Confirmado explícitamente como regla permanente, no como pendiente de pulir.

### Named Rules
**The Flat-By-Default Rule.** Las superficies nunca usan sombra. Si una card necesita separarse del fondo, usa `border border-gray-100`. Si no necesita separarse, no lleva border. Nunca sombra como sustituto de jerarquía.

## 5. Components

Personalidad: **utilitarios y directos.** Cada componente existe únicamente para cumplir su función — sin estado decorativo, sin variantes "bonitas" que no comuniquen algo.

### Buttons
- **Shape:** `rounded-xl` (12px) para botones de acción; `rounded-full` solo en pills/badges de estado.
- **Primary:** fondo Ink, texto Paper, `padding: 12px 16px`.
- **Ghost / Texto:** texto Ink, sin fondo, `hover:underline` (ej. "Reintentar" en estados de error).
- **Hover / Focus:** los inputs usan `focus:ring-2 focus:ring-black` (no glow, no color secundario). Los botones de acción usan `active:scale-95` con `transition-transform` como única respuesta táctil al press — sin cambio de color en hover salvo el subrayado en los ghost.

### Cards / Containers
- **Corner Style:** `rounded-2xl` (16px) para contenedores de página; `rounded-xl` (12px) para elementos internos (nav links, inputs).
- **Background:** Paper sobre fondo `gray-50` de página, o Ink para el único elemento de máximo énfasis (card de MRR).
- **Shadow Strategy:** ninguna — ver Elevation.
- **Border:** `border border-gray-100`, siempre 1px, nunca como acento de color (ver Don'ts).
- **Internal Padding:** `p-4` (16px) estándar para todas las cards de widget.

### Inputs / Fields
- **Style:** `border-gray-200`, `rounded-xl`.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-black` — el anillo de foco reemplaza el outline nativo, nunca lo elimina sin sustituto.

### Badges (estado)
- **Style:** `rounded-full`, `px-2 py-1`, `text-xs` — siempre par fondo-claro/texto-oscuro del mismo color semántico (warning, danger), nunca un color sólido saturado de fondo.

### Navigation
- **Sidebar (desktop):** link activo = fondo Ink, texto Paper, `font-medium`; inactivo = Neutral 600, `hover:bg-gray-100`.
- **Bottom nav (mobile):** mismo lenguaje de color, ícono + label de 10px, activo = Ink, inactivo = Neutral 400.

### Charts

- **Componente:** `shadcn/ui` chart (`src/components/ui/chart.tsx`, wrapper sobre Recharts) — `ChartContainer` + `ChartTooltip`/`ChartTooltipContent`. Toda gráfica nueva usa este componente, no Recharts directo.
- **Paleta:** orden fijo, azul de marca primero, después negro/grises de apoyo — única excepción documentada al "Two-Color Rule" porque una gráfica de múltiples series necesita distinguir datos, no decorar:
  - `#3b82f6` (Accent Blue — mismo azul del punto del wordmark)
  - `#0a0a0a` (Ink)
  - `#9ca3af` (Neutral 400)
  - `#93c5fd` (azul claro, cuarta serie si hace falta)
  - `#d4d4d8` (gris claro, quinta serie)
- **Referencia:** `src/app/owner/_widgets/TrendsWidget.tsx` (líneas, vía `ChartConfig`) y `BreakdownWidget.tsx` (dona, vía array `COLORS` en el mismo orden) — ambas son la implementación canónica; cualquier gráfica futura (landing, admin, owner) sigue este mismo patrón y orden de color.

### Loading / Empty / Error states
- **Loading:** skeletons que imitan la forma real del contenido (barras para gráficas de línea, dona+leyenda para gráficas circulares, filas para listas) — nunca solo un spinner genérico cuando el contenido tiene una forma reconocible.
- **Empty:** mensaje compuesto en Neutral 400, específico al widget (ej. "Sin problemas operativos pendientes. 🎉"), nunca un estado vacío sin contexto.
- **Error:** mensaje directo + botón "Reintentar" inline, nunca `window.alert` ni mensaje genérico tipo "Oops!".

## 6. Do's and Don'ts

### Do:
- **Do** usar negro/blanco para resolver jerarquía antes de introducir color.
- **Do** usar `border-gray-100` (1px) como única forma de separar superficies.
- **Do** dar feedback táctil con `active:scale-95` + `transition-transform` en cualquier elemento presionable.
- **Do** dar a cada animación (`animate-spin`, `animate-pulse`) una alternativa bajo `prefers-reduced-motion: reduce` (WCAG AA, confirmado como requisito del proyecto).
- **Do** usar skeletons con la forma real del contenido para estados de carga, no solo un spinner circular genérico.

### Don't:
- **Don't** usar `box-shadow` en ningún componente — el sistema es plano por decisión, no por descuido.
- **Don't** introducir gradientes morado/azul, glassmorphism, o la estética "AI SaaS" genérica de 2024-2026.
- **Don't** usar `border-left`/`border-right` de color como acento decorativo (side-stripe) en cards, badges o alerts.
- **Don't** introducir un segundo color de acento de marca — Ink ya es el acento; el color adicional es siempre semántico (warning/danger/success), nunca decorativo.
- **Don't** cambiar la tipografía base (Geist) ni introducir un display font — confirmado explícitamente: pulir dentro del sistema existente, no rediseñar.
- **Don't** usar `window.alert()` o copy genérico tipo "Oops!" en estados de error — siempre mensaje directo + acción de recuperación.
