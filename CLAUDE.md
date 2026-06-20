@AGENTS.md

## Proyecto

Referidoo — dashboard de referidos para asesores de seguros. Ver [README.md](./README.md) (arquitectura, stack, setup) y [NEGOCIO.md](./NEGOCIO.md) (modelo de negocio). Estado: MVP, Fase 0 (asistido por Patrick, sin self-service de pagos todavía — no proponer/construir pasarela de pagos o UI de suscripción salvo que se pida explícitamente).

## Convenciones específicas de este repo

- **Sin flujo de PRs.** Un solo desarrollador, push directo a `master`. No crear branches/PRs salvo que se pida.
- **Prisma + Turso, nunca `prisma migrate dev`.** Cambios de esquema vía scripts SQL puntuales (`prisma/add-*.ts`) corridos contra `dev.db` local. Sin credenciales de escritura a producción — los cambios de esquema en Turso se entregan como SQL de una línea para que el usuario los corra él mismo en el SQL shell de Turso.
- **`src/proxy.ts`** (no `middleware.ts` — Next 16 renombró el archivo) protege `/admin/:path*` vía cookie+JWT, redirige a `/login` si falta o es inválido.
- **Cuidado con `useEffect` + Strict Mode.** Next dev corre en Strict Mode (doble invocación de efectos). Un efecto que (a) consume un recurso externo de un solo uso (ej. `sessionStorage`) y (b) agenda timers debe: usar un `useRef` para evitar releer el recurso en la segunda invocación, y NO devolver una función de cleanup que cancele esos timers — si no, Strict Mode cancela los timers de la primera invocación antes de que disparen. Ver `src/app/admin/layout.tsx` (welcome screen) como referencia ya corregida.

## Health Stack

- typecheck: tsc --noEmit
- lint: npx eslint .
- test: npx vitest run
