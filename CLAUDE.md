@AGENTS.md

## Proyecto

Referidoo — dashboard de referidos para asesores de seguros. Ver [README.md](./README.md) (arquitectura, stack, setup) y [NEGOCIO.md](./NEGOCIO.md) (modelo de negocio). Estado: MVP, Fase 0 (asistido por Patrick, sin self-service de pagos todavía — no proponer/construir pasarela de pagos o UI de suscripción salvo que se pida explícitamente).

## Productos ocultos a propósito (NO es bug)

Decisión de producto (ago-2026): la etapa actual de venta muestra **solo el core, PPR y Vida**. Están **ocultos intencionalmente** — no faltan, no están rotos:

- Los tipos de producto **Daños/Auto** y **GMM** como opción seleccionable y en el marketing.
- Todo el sistema de **premios burbuja** (Pro, ligado a Auto/GMM) en asesor, portal del cliente y landing.

Gateado por flags en [`src/lib/product-visibility.ts`](./src/lib/product-visibility.ts): `SHOW_BUBBLE_REWARDS`, `SHOW_NON_CORE_PRODUCTS`, `VISIBLE_PRODUCT_TYPES`, `VISIBLE_INTERESTS`. El **backend, `COMMISSION_RATES` y los datos siguen intactos** — los registros históricos con gmm/auto se siguen mostrando bien; solo se ocultan selección y superficies visibles.

**Para agentes (QA / investigate / review / design-review):** que no aparezca la burbuja, ni Auto/GMM en dropdowns/precios, es lo esperado — **no lo reportes como defecto ni lo "restaures".** Reactivar (cuando se pida): flags a `true` + devolver los tipos a `VISIBLE_PRODUCT_TYPES` / `VISIBLE_INTERESTS`. (Ojo: "Fase 1" en `NEGOCIO.md` es otra cosa — el freemium/app —, no confundir con esta ocultación.)

## Convenciones específicas de este repo

- **Sin flujo de PRs.** Un solo desarrollador, push directo a `master`. No crear branches/PRs salvo que se pida.
- **Prisma + Turso, nunca `prisma migrate dev`.** Cambios de esquema vía scripts SQL puntuales (`prisma/add-*.ts`) corridos contra `dev.db` local. Sin credenciales de escritura a producción — los cambios de esquema en Turso se entregan como SQL de una línea para que el usuario los corra él mismo en el SQL shell de Turso.
- **`src/proxy.ts`** (no `middleware.ts` — Next 16 renombró el archivo) protege `/admin/:path*` vía cookie+JWT, redirige a `/login` si falta o es inválido.
- **Cuidado con `useEffect` + Strict Mode.** Next dev corre en Strict Mode (doble invocación de efectos). Un efecto que (a) consume un recurso externo de un solo uso (ej. `sessionStorage`) y (b) agenda timers debe: usar un `useRef` para evitar releer el recurso en la segunda invocación, y NO devolver una función de cleanup que cancele esos timers — si no, Strict Mode cancela los timers de la primera invocación antes de que disparen. Ver `src/app/admin/layout.tsx` (welcome screen) como referencia ya corregida.
- **Verificación visual: usar `gstack browse`, no solo lectura de código.** Antes de dar por terminado cualquier cambio de UI/responsive, levantar `npm run dev` y verificar con el navegador headless de `gstack` (`~/.claude/skills/gstack/browse/dist/browse`) en al menos 375px de ancho — no basta con calcular anchos leyendo clases de Tailwind. Patrones encontrados así que la lectura de código no detectó: filas `flex justify-between` con 2 botones de confirmación que se encimaban con el texto en mobile, y un botón "Cancelar" cortado fuera de una tabla con scroll horizontal (resuelto con columna `sticky right-0`).
  - **El daemon de `browse` se reinicia solo entre llamadas separadas de Bash**, perdiendo cookies/viewport/navegación. Encadenar login + navegación + screenshot en **una sola llamada** de Bash (no dividir en varias), o re-verificar el estado (`$B cookies`, `$B url`) antes de confiar en el resultado.
  - Para probar `/admin/*` u `/owner/*` autenticado: usar las cuentas QA en `dev.db` (`qa-asesor-demo@local.test` / `qa-owner-test@local.test`, password `OwnerTest2026!`) — para `/owner` hay que levantar el dev server con `$env:PLATFORM_OWNER_EMAIL = "qa-owner-test@local.test"` primero (override de variable de entorno, no tocar `.env`).
  - Un screenshot de página completa (`--viewport` ausente) puede mostrar artefactos de *stitching* en elementos `position: fixed` (ej. nav inferior "duplicada" a mitad de página) — no es un bug real; usar `--viewport` para confirmar antes de reportar algo como roto.

## Health Stack

- typecheck: tsc --noEmit
- lint: npx eslint .
- test: npx vitest run
