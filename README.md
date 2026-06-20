# Referidoo

Dashboard de referidos para asesores de seguros y planes financieros. El asesor registra a sus clientes, cada cliente recibe un link/código de referido propio, y cuando ese link convierte en una venta el sistema calcula la recompensa, la trackea, y se la paga al cliente que refirió. Sin que el cliente comparta datos propios ni pase por procesos legales — el asesor gestiona todo desde un dashboard.

Ver [NEGOCIO.md](./NEGOCIO.md) para el modelo de negocio completo (fases, pricing, comisiones).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Prisma 7** sobre **Turso** (libSQL/SQLite) — adapter `@prisma/adapter-libsql`
- **Resend** para emails transaccionales (confirmaciones, recordatorios)
- **JWT propio** (`jsonwebtoken` + `bcryptjs`) para auth de asesores — sin proveedor externo
- **Vitest** + Testing Library para tests, **Playwright** para e2e (ver [TESTING.md](./TESTING.md))

> Next.js 16 tiene cambios importantes respecto a versiones anteriores (`middleware.ts` → `proxy.ts`, entre otros). Antes de escribir código nuevo, revisar `node_modules/next/dist/docs/` — ver [AGENTS.md](./AGENTS.md).

## Cómo funciona

- **Asesor** (`/admin/*`, protegido por `src/proxy.ts`): dashboard con clientes, referidos (pipeline pendiente → contactado → convertido), niveles de recompensa configurables, y ajustes de "burbujas" (premio acumulable por ventas de Auto/Otro/GMM).
- **Cliente referidor** (`/c/[token]`): portal público sin login — accede con un token único, ve su progreso de burbuja, comparte su link de referido (`/r/[code]`), y reclama su premio cuando la burbuja se llena.
- **Lead referido** (`/r/[code]`): landing pública donde el lead que llega por el link de un cliente deja sus datos para que el asesor le dé seguimiento.

### Modelo de datos (`prisma/schema.prisma`)

`Advisor` → `Client` (cada cliente tiene su propio `referralCode` + `accessToken`) → `Referral` (cada lead referido, con su `tierPosition`/`rewardAmount` calculado) y `BubbleClaim` (reclamos del premio acumulable). `AdvisorSettings` y `RewardTier` son configuración por asesor (niveles de premio, puntos de burbuja por tipo de producto).

## Getting Started

```bash
npm install
npm run dev
```

Abre [http://localhost:3050](http://localhost:3050) (o el puerto que indique la consola — el script `dev` no fija puerto).

### Variables de entorno

Crear `.env` (no se commitea) con:

```
DATABASE_URL=        # libSQL/Turso connection string
JWT_SECRET=          # secreto para firmar tokens de sesión del asesor
NEXT_PUBLIC_BASE_URL=
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_NOTIFY_CREATOR=
TURSO_AUTH_TOKEN=    # usado por /api/migrate para aplicar cambios de esquema en prod
CRON_SECRET=         # autentica al cron diario de Vercel (ver "Cron y jobs en background")
QSTASH_TOKEN=        # autentica las llamadas salientes a QStash (webhooks diferidos)
PLATFORM_OWNER_EMAIL= # único correo con acceso a /admin/plataforma (lista de asesores + toggle de plan)
```

### Base de datos

El proyecto usa Prisma sobre Turso. **No usar `prisma migrate dev`** en este proyecto — los cambios de esquema se aplican con scripts SQL puntuales (`prisma/add-*.ts`) para evitar drift-reset contra la base remota. Desde mi entorno de desarrollo no tengo credenciales de escritura directa a producción, así que los cambios de esquema en Turso se entregan como SQL para correr manualmente en el SQL shell de Turso. La aplicación desplegada sí tiene un camino propio de escritura a prod: la ruta `/api/migrate` (protegida por sesión de asesor) usa `TURSO_AUTH_TOKEN` para aplicar migraciones — es una capacidad de la app, no de este entorno de trabajo.

```bash
npm run seed   # prisma/seed.ts — datos de prueba
```

## Cron y jobs en background

- **Cron diario de Vercel** (`vercel.json`, `0 16 * * *`) — llama `GET /api/cron/confirmations`, protegido por `CRON_SECRET`. Manda recordatorios de confirmación pendientes.
- **Webhook diferido vía QStash** — al crear un referido (`POST /api/referrals`), se agenda una llamada a `/api/webhooks/send-confirmation` con 5 minutos de delay (`src/app/api/referrals/[id]/route.ts:240-249`). El webhook entrante está protegido por `CRON_SECRET`/`x-webhook-secret`.
- **`/api/demo/reset`** — endpoint destructivo de un solo uso para demos: borra todos los registros de `Referral` y `Client`. No usar fuera de un entorno de demo controlado.

## Tests

```bash
npm run test         # Vitest, una corrida
npm run test:watch   # Vitest, modo watch
npm run test:e2e     # Playwright
```

Ver [TESTING.md](./TESTING.md) para convenciones y capas de test.

## Deploy

Desplegado en Vercel, push directo a `master` (sin flujo de PRs — proyecto de un solo desarrollador). `npm run build` corre `next build`; `postinstall` corre `prisma generate` automáticamente.
