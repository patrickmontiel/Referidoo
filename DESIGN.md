---
name: Referidoo
description: Dashboard de referidos para asesores de seguros y planes financieros en México
colors:
  ink: "#0B0B0C"
  ink-variants: ["#10141B", "#1D2530"]
  paper: "#ffffff"
  surface: "#F4F5F7"
  text-gray-1: "#3F4651"
  text-gray-2: "#5A626E"
  text-gray-3: "#6B727D"
  text-gray-4: "#8A8F98"
  text-gray-5: "#9098A2"
  accent-blue: "#2563EB"
  accent-blue-bg: "#EEF3FE"
  accent-blue-on-blue-text: "#CFE0FF"
  border-1: "#ECEDEF"
  border-2: "#EFEFF1"
  border-3: "#EAEBED"
  border-4: "#DADCE0"
  danger-bg: "#F0DDE2"
  danger-ink: "#C2566B"
  success-ink: "#1F9D5B"
  warning-bg: "#fffbeb"
  warning-ink: "#d97706"
typography:
  body:
    fontFamily: "Hanken Grotesk, -apple-system, system-ui, sans-serif"
    fontSize: "17-19px"
    fontWeight: 400
    lineHeight: 1.55-1.65
  h1-hero:
    fontFamily: "Hanken Grotesk"
    fontSize: "60px"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
  h2-section:
    fontFamily: "Hanken Grotesk"
    fontSize: "38-40px"
    fontWeight: 800
    letterSpacing: "-0.025 a -0.03em"
  card-subtitle:
    fontFamily: "Hanken Grotesk"
    fontSize: "19-23px"
    fontWeight: 700
  label:
    fontFamily: "Hanken Grotesk"
    fontSize: "12-14px"
    fontWeight: 700
    letterSpacing: "0.08-0.1em"
    textTransform: "uppercase"
  footer-wordmark:
    fontFamily: "Hanken Grotesk"
    fontSize: "24.2vw"
    fontWeight: 700
    lineHeight: 0.9
rounded:
  card: "18-22px"
  pill: "999px"
  chip: "8-12px"
spacing:
  container-max: "1180px"
  container-padding: "32px"
  hero-gap: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    backgroundColorHover: "#26262a"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    border: "{colors.border-4}"
    borderHover: "{colors.ink}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.card}"
---

# Design System: Referidoo

## 1. Overview

**Dos sistemas conviven hoy, en propagación activa — no por inconsistencia.**

- **Sistema nuevo** (sección 2-6): `/` (landing), `/login`, `/registro`,
  `/r/[code]` (landing pública de lead), `/c/[token]` (portal del cliente) —
  ya migradas. Tipografía Hanken Grotesk, paleta `#0B0B0C`/`#2563EB`, botones
  `rounded-full`, sombras puntuales documentadas. En `/c/[token]`, los
  colores semánticos de estado (pendiente=amber, convertido=green,
  contactado=blue, rechazado=gray en `statusConfig`/`rewardConfig`) se
  dejaron sin tocar a propósito — son significado, no decoración de marca.
- **Sistema original "Herramienta de Confianza"** (sección 7): `/admin`,
  `/owner` — todavía sin migrar. Geist, blanco/negro plano, azul `#3b82f6`
  solo como punto del logo, cero `box-shadow`.

**Orden de propagación** (decidido el 29 de junio de 2026, ver
`~/.gstack/projects/patrickmontiel-Referidoo/`): páginas públicas simples
primero (`/login` ✅, `/registro` ✅, `/r/[code]` ✅), luego `/c/[token]` ✅,
luego `/admin/*` pendiente (superficie de trabajo diaria del asesor — ahí
entran los primeros asesores reales, se migra con cautela y no antes de que
ese flujo esté estable), y `/owner/*` al final (la usa solo Patrick, menor
urgencia).

**Por qué dos sistemas mientras dura la migración:** la landing es la
primera impresión pública — tiene permiso de ser más expresiva (tipografía
con más peso, sombras deliberadas, una pieza de marca grande en el footer).
La app de producto sigue la disciplina de herramienta de trabajo: el asesor
maneja dinero real, la interfaz se queda quieta — eso no cambia con la
migración, solo cambian los tokens visuales (color/tipografía/radios), no la
filosofía de quietud de la sección 7.

## 2. Colors (sistema nuevo — landing)

- **Ink** `#0B0B0C` (variantes `#10141B`, `#1D2530`): texto principal, fondo
  de botón primario, base del wordmark del footer.
- **Grises de texto** (de más oscuro a más claro): `#3F4651`, `#5A626E`,
  `#6B727D`, `#8A8F98`, `#9098A2` — body copy, labels, captions, según
  jerarquía de énfasis.
- **Superficies:** blanco `#ffffff`, gris claro de tarjeta `#F4F5F7`.
- **Bordes:** `#ECEDEF`, `#EFEFF1`, `#EAEBED`, `#DADCE0` — variantes sutiles
  según contexto (separador de sección vs. borde de card vs. borde de input).
- **Azul de marca** `#2563EB` — ya no es solo decoración del logo; en este
  sistema carga: el banner de acceso anticipado, el borde + sombra de la
  tarjeta "Con Referidoo", el número de cada feature, la barra/burbuja de
  progreso, el botón "Recomendado", y el círculo del footer. Fondo claro
  asociado `#EEF3FE`; texto sobre azul `#CFE0FF`.
- **Estado en tabla "Antes":** ✕ con fondo `#F0DDE2` / texto `#C2566B`.
- **Estado "✓" en plan free:** verde `#1F9D5B` (único uso de verde en este
  sistema — Vida/PPR del bloque de premios usa azul, no verde).

## 3. Typography (sistema nuevo — landing)

**Familia:** Hanken Grotesk (Google Fonts vía `next/font/google`), pesos
400/500/600/700/800, fallback `-apple-system, system-ui, sans-serif`,
antialiasing activado. Cargada con scope solo a la landing
(`src/app/page.tsx`), no al resto de la app — `next/font/google` se aplica
por archivo, así que esto no afecta a `/admin` ni `/owner`.

### Escala
- **H1 hero:** 60px / line-height 1.04 / weight 800 / letter-spacing -0.03em.
- **H2 de sección:** 38-40px / weight 800 / letter-spacing -0.025 a -0.03em.
- **Subtítulo de tarjeta:** 19-23px / weight 700.
- **Párrafo:** 17-19px / line-height 1.55-1.65 / color gris (nunca negro puro
  para body copy largo).
- **Label fino:** 12-14px, MAYÚSCULAS, weight 700, letter-spacing 0.08-0.1em.
- **Wordmark del footer:** 24.2vw / weight 700 / line-height 0.9 — unidad
  `vw` deliberada: escala proporcional al viewport en vez de un tamaño fijo,
  así el efecto se ve igual de dramático en cualquier ancho de pantalla.

## 4. Layout (sistema nuevo — landing)

- **Contenedor base:** `max-width: 1180px`, `margin: 0 auto`, `padding: 0 32px`.
- **Secciones internas** se angostan según densidad de contenido: 760px
  ("Cobra automático", solo título+párrafo), 820px (comparación antes/después),
  760px (pricing, 2 tarjetas).
- **Hero:** grid de 2 columnas (`1fr 1fr`), `gap: 64px`.
- **Separadores:** línea 1px `#EFEFF1` al ancho del contenedor (1180px),
  entre cada sección.
- **Radios:** tarjetas 18-22px, botones/pills `rounded-full` (completamente
  redondeados — no `rounded-xl` como en el resto de la app), chips internas
  8-12px.

## 5. Elevation (sistema nuevo — landing)

A diferencia del resto de la app (sección 7, completamente plano), la
landing usa sombra deliberada en dos lugares específicos, no como decoración
genérica:
- **Imagen/mockup del panel en el hero:** `box-shadow: 0 10px 40px rgba(15,23,42,.10)`
  — simula profundidad de una captura de pantalla real.
- **Tarjeta "Con Referidoo"** (comparación): `box-shadow: 0 10px 30px rgba(37,99,235,.12)`
  — sombra tintada de azul, refuerza que esa tarjeta es la "ganadora".
- **Burbuja de premios:** `box-shadow: 0 3px 10px rgba(37,99,235,.25)` —
  mismo valor que usa el componente real de burbuja en el portal de cliente
  (`src/app/c/[token]/page.tsx`), no inventado para la landing.

Ningún otro elemento de la landing usa sombra — sigue siendo la excepción
puntual, no el default.

## 6. Componentes específicos de la landing

### Header
Sticky, fondo blanco translúcido (`bg-white/80 backdrop-blur-md`), sin
borde hasta que el usuario hace scroll (`scrollY > 8`), entonces aparece
`border-b border-[#ECEDEF]`. Implementado en
`src/components/LandingHeader.tsx` (client component — necesita el
listener de scroll).

### Banner de acceso anticipado
Barra de ancho completo, `bg-[#2563EB]`, texto blanco centrado, 11px de
padding vertical. Mensaje honesto, nunca una cifra de adopción inventada
(ver sección "Honestidad" más abajo).

### Mockup del hero
Espejo fiel del dashboard real de `/admin` — mismas 4 etiquetas
(`Clientes activos`, `Referidos totales`, `Convertidos`, `Pendientes`) y
mismos 2 tiles de dinero (`Premios pagados` en fondo Ink, `Por pagar
(aprobados)` en fondo gris) que usa `src/app/admin/page.tsx`. Marcado
explícitamente como "ejemplo ilustrativo" — ver Honestidad.

### Features (lista, no tarjetas)
`grid-template-columns: 64px 1fr` por fila — número azul en formato `01`,
`02`... + título + descripción. Separador `border-t` entre filas (no la
primera). Sin iconos, sin fondo de card — reemplaza el patrón de tarjeta-
con-icono del resto de la app.

### Comparación Antes/Después
Dos tarjetas lado a lado (no una tabla ancha): tarjeta gris "Antes" con ✕
en círculo rosa, tarjeta blanca con borde azul de 2px + sombra azul y ✓ en
círculo azul. Badge circular negro "vs" centrado, superpuesto entre ambas
(`absolute`, `-translate-x-1/2 -translate-y-1/2`).

### Burbuja de premios
Visual real de burbuja (círculo con relleno líquido de abajo hacia arriba +
clase `.bubble-shine` ya existente en `globals.css`), no una barra de
progreso genérica — mismo lenguaje visual que el portal de cliente real.

### Footer — wordmark gigante con máscara
Tres capas superpuestas dentro de un contenedor con `overflow: hidden`:
1. Texto negro base ("referidoo", 24.2vw, weight 700).
2. Círculo azul absoluto, `width/height: 34vw`, posicionado en
   `right: -7vw; bottom: -11vw` (entra desde la esquina inferior derecha).
3. Copia blanca del mismo texto, recortada con
   `mask-image: radial-gradient(17vw 17vw at calc(100% - 10vw) calc(100% - 6vw), #000 99.5%, transparent 100%)`
   — el centro y radio del gradiente coinciden exactamente con el círculo de
   la capa 2, así que el texto "se vuelve blanco" justo donde cruza el azul.

Implementado directamente en `src/app/page.tsx` (footer) — no es un
componente reusable todavía porque solo se usa una vez.

### Honestidad (aplica a ambos sistemas)
Cualquier dato ilustrativo en la landing (mockup del hero, "$2,500 en
premios", etc.) debe estar etiquetado como ejemplo — nunca presentado como
real. Ningún número de adopción ("X asesores ya lo usan") se muestra sin
evidencia real; mientras no exista, se usa lenguaje de acceso anticipado
("sé de los primeros en usarlo") en vez de inventar una cifra. Confirmado
explícitamente con Patrick el 29 de junio de 2026 — ver
`~/.gstack/projects/patrickmontiel-Referidoo/patri-master-design-20260629-013637.md`.

## 7. Sistema original — app de producto (`/admin`, `/owner`)

**Creative North Star: "La Herramienta de Confianza"** — vigente en estas
superficies hasta que se propague el sistema nuevo. (`/login`, `/registro`,
`/r/[code]` y `/c/[token]` ya migraron a la sección 2-6.)

Blanco y negro plano, sin decoración que compita con la tarea. No hay
sombras, no hay gradientes, no hay color de marca dominante — el negro y el
blanco cargan toda la jerarquía visual, y el color (azul, ámbar, rojo,
verde) aparece únicamente como señal funcional de estado, nunca como
decoración.

### Colors
- **Ink** `#0a0a0a`, **Paper** `#ffffff`.
- **Neutrales:** `#f9fafb`, `#f3f4f6` (border de cards), `#e5e7eb` (border de
  inputs), `#9ca3af` (solo no-textual), `#6b7280` (texto secundario),
  `#4b5563` (nav inactivo).
- **Accent Blue** `#3b82f6`: único uso decorativo permitido — el punto del
  wordmark. También usado como excepción documentada en gráficas (ver
  Charts).
- **Warning** `#fffbeb` / `#d97706`. **Danger** `#fef2f2` / `#dc2626`.
  **Success** `#16a34a`.

**The Two-Color Rule:** negro y blanco resuelven la jerarquía; un color solo
se introduce para comunicar un estado real.

### Typography
Geist, pesos 400/500/600. **Title** 1.25rem/600. **Body** 0.875rem/400.
**Label** 0.75rem/400, siempre gris. **The No-Display Rule:** el título más
grande de cualquier pantalla de producto es `text-xl` — sin hero, sin
`clamp()` dramático.

### Elevation
**The Flat-By-Default Rule:** cero `box-shadow`. Separación entre
superficies vía `border border-gray-100` de 1px, o sin border si no hace
falta separar.

### Components
- **Buttons:** `rounded-xl` (12px), `rounded-full` solo en pills/badges.
  Primary = Ink/Paper. Ghost = texto Ink sin fondo. `active:scale-95` +
  `transition-transform` como única respuesta táctil.
- **Cards:** `rounded-2xl` contenedores de página, `rounded-xl` elementos
  internos. `border border-gray-100`, nunca color. `p-4` interno estándar.
- **Inputs:** `border-gray-200`, `rounded-xl`, `focus:ring-2 focus:ring-black`.
- **Badges:** `rounded-full`, `px-2 py-1`, `text-xs`, par fondo-claro/texto-
  oscuro del color semántico.
- **Navigation:** activo = Ink/Paper; inactivo = Neutral 600/400.

### Charts
`shadcn/ui` chart (`src/components/ui/chart.tsx`) — `ChartContainer` +
`ChartTooltip`/`ChartTooltipContent`. Paleta fija: `#3b82f6` → `#0a0a0a` →
`#9ca3af` → `#93c5fd` → `#d4d4d8`. Referencia canónica:
`TrendsWidget.tsx` / `BreakdownWidget.tsx` en `src/app/owner/_widgets/`.

### Loading / Empty / Error
Skeletons con forma real del contenido. Empty state específico al widget,
nunca genérico. Error = mensaje directo + "Reintentar" inline, nunca
`window.alert` ni "Oops!".

## 8. Do's and Don'ts

### Do (ambos sistemas):
- Dar feedback táctil (`active:scale-95` o equivalente) en elementos presionables.
- Dar alternativa `prefers-reduced-motion: reduce` a toda animación.
- Etiquetar como ilustrativo cualquier dato de ejemplo — nunca presentarlo como real.
- Usar skeletons con la forma real del contenido, no un spinner genérico.

### Don't (app de producto, sección 7):
- No usar `box-shadow` — sigue siendo plano por decisión ahí.
- No introducir un segundo color de acento de marca distinto a Ink/Blue.
- No cambiar Geist por otra tipografía en `/admin`, `/owner`, `/login`, etc.
- No usar `window.alert()` ni copy genérico tipo "Oops!".

### Don't (landing, sección 2-6):
- No usar sombra fuera de los 3 casos documentados en la sección 5 — sigue
  siendo la excepción, no el default nuevo.
- No inventar cifras de adopción o testimonios — ver Honestidad.
- No usar `rounded-xl` en botones — esta superficie usa pills (`rounded-full`)
  en todos los CTAs.
