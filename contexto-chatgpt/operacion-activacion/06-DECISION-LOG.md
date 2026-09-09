# 06 · Decision Log — Referidoo

> Registro de decisiones **relevantes / difíciles de revertir**. Append-only: no se borran entradas, se agregan superseding. Formato: fecha · decisión · motivo · estado.

## Decisiones vigentes (arranque 2026-09-09)

| # | Decisión | Motivo | Estado |
|---|---|---|---|
| D1 | **Core actual = PPR + Vida** | Es lo que la asesora principal (Ceci) vende y donde el premio de escalera avanza. | Vigente |
| D2 | **Auto / GMM / Daños / Burbuja = PARKED** (ocultos por flag, backend intacto) | Reducir superficie mientras buscamos PMF; reversible. | Vigente |
| D3 | **Activation antes que acquisition** | No tiene sentido traer asesores si el loop aún no activa a nadie. | Vigente |
| D4 | **Activación = primer referido REAL de un cliente**; deep activation = cerrado + recompensa pagada | Registro/onboarding/cliente-agregado no predicen valor. | Vigente |
| D5 | **Ceci = experimento 1** | Ya registrada, ya con clientes (<5) y links enviados; Patrick la acompaña personalmente. | Vigente |
| D6 | **Prospecto 32 = experimento 2** | Segundo caso individual limpio, mismo ICP Vida/PPR. | Vigente |
| D7 | **No construir B2B hasta tener evidencia del loop individual** | Evitar construir para agencias sin prueba de que el loop base funciona. | Vigente |
| D8 | **No rediseñar pricing hasta tener evidencia de valor** | Cambiar precio/comisión sin loops reales sería adivinar. | Vigente |
| D9 | **`ProductEvent` = fuente de verdad de eventos de activación (tras el deploy)** | Un solo modelo, atribución server-side, sin PII. | Vigente (pendiente deploy a prod) |
| D10 | **`share click` ≠ share verificado** | No hay forma de saber si el mensaje se envió desde WhatsApp. | Vigente |
| D11 | **`landing view` ≠ persona única** | Un share genera varias vistas; no tratarlo como funnel 1:1. | Vigente |
| D12 | **Comp manual de asesores vía `prisma/comp-advisor.ts`, no el toggle de plan del owner** | El toggle es ambiguo (no fija `paidUntil`, el cron lo revierte, no emite PlanEvent). | Vigente |
| D13 | **Deploy con gate obligatorio**: backup Turso + migración additive ANTES del push; el agente NO tiene credenciales de prod → lo ejecuta Patrick | Push dispara deploy que consulta `ProductEvent`; la tabla debe existir antes. | Vigente |

## Pendientes de decisión (requieren evidencia real, NO decidir aún)
- Pricing / estructura de comisión → depende de Economics Audit (trigger en `00`).
- Canal de adquisición y ICP fino → depende de GTM Audit (trigger en `00`).
- Forma del producto B2B (si existe) → depende de `05-B2B-READINESS.md` + evidencia del loop individual.
- Qué trust gaps se endurecen y cuándo → ver `03-TRUST-AUDIT.md` (clasificados, sin construir todavía).

## Historial de cambios
- 2026-09-09 — Creación del log con D1–D13.
