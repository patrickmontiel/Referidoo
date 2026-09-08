# 02 · Owner y Operación — el cockpit de Patrick

> `/owner/*`, gated por `PLATFORM_OWNER_EMAIL` (`proxy.ts` + re-chequeo en cada page/api server). `[CV]` = código verificado, `[INF]` = inferencia.

## Pregunta guía: ¿puede el fundador abrir esto y saber qué requiere su atención HOY?
**Parcialmente sí.** La cola de problemas y de carátulas es en vivo y accionable; pero el **funnel viral es 100% ciego** y el **briefing IA puede tener hasta 14 días** de antigüedad.

---

## Páginas (`src/app/owner/`)
Layout `owner/layout.tsx`: 6 pestañas (Resumen, Asesores, Pagos, Inteligencia, Documentos, Configuración). El nombre viene de `/api/advisor/me`.

### `/owner` — Resumen (`owner/page.tsx`, client)
- **Datos:** `GET /api/owner/overview?period=` + `GET /api/owner/narrative`. `[CV]`
- **Briefing IA** (narrativa GPT-4o-mini "qué necesita tu atención") — **cacheada 14 días** (`owner-narrative-ai.ts:12`), puede estar desactualizada. `[CV]`
- **KPIs** (`overview/route.ts:244-262`): Prima referida (GWP), Comisión Referidoo (desde 2026-06-24), **MRR = proCount × 539**, Asesores activos. Selector mes/90d/todo. `[CV]`
- Gráficas comisión por semana/mes + pie por producto; **ranking de asesores** con chip rojo "Premio vencido" (morosos); **problemas operativos** (`computeOwnerProblems`); actividad reciente (8 eventos). `[CV]`

### `/owner/pagos` (`owner/pagos/page.tsx`, server) — **la pantalla operativa clave**
- MRR + **Comisión por facturar** (`billedAt:null`). `[CV]`
- **Cola de carátulas por validar** (`CaratulasQueue.tsx`): estados `pendiente`/`discrepancia`; botones "Coincide/No coincide" → `POST /api/owner/caratulas`; visor `/api/caratula-view`. **Acción manual antifraude central.** `[CV]`
- Suscripciones Pro (activa / cobro rechazado), comisión pendiente por asesor, últimos 12 `planEvents` (solo mapea `activated/failed/cancelled`; otros como `trial_ending_notified`/`unete_*`/`linksent:` caen a fallback con el string crudo). `[CV]`

### `/owner/asesores` (`owner/asesores/page.tsx`, client)
- **Datos:** `GET /api/admin/advisors` (paginado por cursor). `[CV]`
- **Acciones manuales:** toggle plan paid↔freemium (`PATCH /api/admin/advisors/[id]`), dar de baja (soft `DELETE`), reenviar verificación. Fila expandible: próximo cobro, último cobro fallido, `mpPreapprovalId`. `[CV]`
- **⚠️ Hallazgo:** el toggle manual de plan **NO crea PlanEvent** → los cambios manuales son invisibles en el historial y en la serie `trends`. `[CV]`

### `/owner/inteligencia` (server)
- Benchmarks agregados en vivo (de `referral`+`client`): tasa de cierre vs industria (**25.6% hardcodeado** `:11`), % cartera que comparte, días a cierre, **horas a primer contacto** (usa `contactedAt`), prima promedio, GWP histórico, top referidores, mix por producto. `[CV]`

### `/owner/documentos` (server)
- Inventario **hardcodeado** de artifacts de Claude (whitepaper, decks, playbooks) con URLs `claude.ai/code/artifact/...` privadas. `[CV]`

### `/owner/configuracion` (server)
- Solo lectura: precio Pro ($539), tabla de comisiones (**hardcode espejo de `rewards.ts`**, `:7-13`), correo del dueño. Nada editable. `[CV]`

---

## Lógica de problemas operativos (`src/lib/owner-problems.ts`) `[CV]`
`computeMorosos` + `computeOwnerProblems` detectan: **morosidad de premios** (aprobado y sin pagar tras `REWARD_CUTOFF_DAYS`=30), conversiones sin monto, montos atípicamente bajos (**sospecha de subreporte**), cuentas duplicadas, cobros MP rechazados, asesores inactivos con leads >7 días. Recordatorios previos día 7 y 14 vía cron `reward-reminders`. **Sin tests** (lógica crítica no cubierta).

## APIs del owner y su estado `[CV/INF]`
| API | Usada por UI hoy |
|---|---|
| `overview`, `narrative`, `caratulas`, `resend-verification`, `backfill-trials` | **Sí** (`backfill-trials` sin UI, solo POST manual) |
| `summary`, `breakdown`, `ranking`, `trends`, `problems` | **NO conectadas a ninguna página actual** `[INF]` — endpoints legacy del dashboard viejo (`summary` sí tiene test) |

---

## Owner PUEDE saber HOY `[CV]`
- Morosidad de premios (chip + problema + briefing).
- Conversiones sin monto / montos sospechosamente bajos (subreporte), cuentas duplicadas, cobros MP rechazados, asesores inactivos con leads viejos.
- Carátulas pendientes/discrepancia por validar (cola manual).
- MRR, comisión por facturar, GWP, ranking, verificaciones pendientes.
- Briefing IA priorizado (pero hasta 14 días viejo).

## Owner NO puede saber HOY `[CV]`
- **Nada del funnel del referido**: portal abierto, link compartido, WhatsApp clickeado, landing vista, formulario iniciado → **NO EXISTE INSTRUMENTACIÓN** (ver `03`).
- **Cambios manuales de plan** (no generan evento).
- Estado de suscripción en tiempo real más allá de `paidUntil`/`paymentFailedAt`.
- Métricas de activación/retención por cohorte (PlanEvent sin backfill + toggle manual sin evento → serie incompleta).

## Operaciones manuales que Patrick hace hoy `[CV]`
- Validar carátulas (Coincide/No coincide) → antifraude.
- Togglear plan / dar de baja / reenviar verificación de asesores.
- **Comp de trial "a mano"**: el toggle a "paid" NO fija `paidUntil` (el cron lo revierte). El comp correcto es SQL/script (ver `prisma/comp-advisor.ts`): `plan='paid'` + `paidUntil=+30d` + `paymentFailedAt=null`.
- Backup diario JSON llega por email (`cron/backup`).
