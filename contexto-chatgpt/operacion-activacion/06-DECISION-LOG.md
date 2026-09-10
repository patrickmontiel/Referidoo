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
| D14 | **Portfolio Activation Campaign = unidad principal de validación.** Cada `Client` sigue siendo la unidad diagnóstica DENTRO de la campaña | Cambio de tesis: probar si un asesor puede activar su cartera y convertir una fracción en canal recurrente de referidos. Ver `08`. | Vigente |
| D15 | **~10% productive referrer rate = HIPÓTESIS, no target demostrado** | No hardcodear como umbral de éxito; se valida con Ceci. | Vigente |
| D16 | **WhatsApp = ASSISTED** (wa.me, el asesor manda); no hay API oficial y no se integra todavía | Evita automation frágil/prohibida y el problema de consentimiento; honesto: acción de envío ≠ entrega. Ver `07`. | Vigente |
| D17 | **Campaigns NO se gatea por Pro en V1** (envío disponible a asesor verificado) | No decidir pricing antes de evidencia de valor; gating diferido. | Vigente |
| D18 | **Atribución de campaña por ID opaco de recipient (`?cr=`), validado server-side** contra el cliente resuelto; sin FKs en los modelos nuevos | Un cliente puede estar en varias campañas → hace falta atribución explícita; sin relaciones para sobrevivir soft-delete (mismo criterio que `ProductEvent`). | Vigente |
| D19 | **Un número de Owner solo existe si se puede explicar** (registros, denominador, cuentas incluidas, significado). Sin dato real → `0` o "Sin datos suficientes" | Los números visibles eran humo: MRR fantasma, referidos borrados contados, benchmark sin fuente. Ver `12`. | Vigente |
| D20 | **Aislamiento de cuentas internas por propiedad explícita** (`Advisor.analyticsExcluded`), nunca por email hardcodeado en queries | No existía NINGÚN mecanismo: seeds, e2e y la cuenta del owner contaban como negocio real. | Vigente |
| D21 | **MRR real = suscripción MP viva.** `plan='paid'` sin `mpPreapprovalId` es trial/comp, NO ingreso | Un backfill histórico convirtió a todos los advisors legacy en "paid" → $539 fantasma por cabeza. | Vigente |
| D22 | **Privacy boundary:** Owner ve *performance* de la cartera, NUNCA *identidad* de los clientes de sus asesores | El nombre de clientes/leads salía en 24 lugares e incluso llegaba al prompt de OpenAI. Operaciones (abrir un documento) es la única excepción, explícita y separada. | Vigente |
| D23 | **Se elimina todo benchmark sin fuente verificable** (empezando por "industria 25.6% · Focus Digital 2025") | Grep exhaustivo: la afirmación existe, la fuente no. Además comparaba denominadores distintos. | Vigente |
| D24 | **La cartera es un activo persistente:** identidad por `(advisorId, normalizedPhone)` → email; reimportar ACTUALIZA, nunca duplica, y conserva `referralCode`/`accessToken` | Sin dedupe, reimportar rompía los links ya compartidos y empujaba la metáfora Mailchimp. Ver `11`. | Vigente |
| D25 | **Posible duplicado (email igual, teléfono distinto) NUNCA se auto-fusiona** — lo resuelve el asesor (default: omitir) | Fusionar a dos personas distintas es irreversible y destruye historial. | Vigente |
| D26 | **Scripts destructivos solo contra base local** (`prisma/_guard.ts`); `prisma.seed` desenganchado; `/api/demo/reset` 404 en prod | `reset-demo.ts` hacía `DELETE` sin WHERE contra Turso PROD y `prisma db seed` auto-invocaba un script que borra 5 tablas. | Vigente |
| D27 | **No se borra nada de producción sin aprobación explícita**; lo que no se pueda demostrar falso se marca UNKNOWN | Eduardo Neri aparece como asesor real Y como cuenta de seed — no se adivina. Ver `13`. | Vigente |

## Pendientes de decisión (requieren evidencia real, NO decidir aún)
- Pricing / estructura de comisión → depende de Economics Audit (trigger en `00`).
- Canal de adquisición y ICP fino → depende de GTM Audit (trigger en `00`).
- Forma del producto B2B (si existe) → depende de `05-B2B-READINESS.md` + evidencia del loop individual.
- Qué trust gaps se endurecen y cuándo → ver `03-TRUST-AUDIT.md` (clasificados, sin construir todavía).

## Historial de cambios
- 2026-09-09 — Creación del log con D1–D13.
