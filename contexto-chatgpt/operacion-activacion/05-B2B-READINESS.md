# 05 · B2B Readiness — preguntas, no producto

> **NO se construye B2B.** Este documento solo lista las preguntas que **debemos poder responder antes** de construir para agencias. Cada punto se marca:
> - **UNKNOWN** — no lo sabemos y no tenemos cómo saberlo aún.
> - **EVIDENCE** — respaldado por observación real (de experimentos/mercado).
> - **HYPOTHESIS** — creencia razonada, sin evidencia todavía.
>
> **No se propone schema.** Gate: no iniciar B2B build hasta tener evidencia del loop individual (ver `00` y `06`).

## Estado global
**No hay evidencia B2B.** Referidoo hoy es single-advisor (aislamiento lógico por `advisorId`, sin concepto de organización/agencia). Por lo tanto casi todo es **UNKNOWN**; algunos puntos son **HYPOTHESIS** derivadas de la auditoría.

## Preguntas por responder

| Tema | Pregunta clave | Estado | Nota |
|---|---|---|---|
| **Buyer** | ¿Quién firma/paga en una agencia? (dueño, director comercial) | UNKNOWN | Recolectar en `04` si surge. |
| **User** | ¿Quién lo usa día a día? ¿El asesor, igual que hoy? | HYPOTHESIS | Probablemente el mismo asesor individual; el loop base no cambiaría. |
| **Admin** | ¿Existe un rol administrador de agencia? ¿Qué puede hacer/ver? | UNKNOWN | Hoy solo hay rol asesor + owner (Patrick). |
| **Data ownership** | ¿De quién son los datos: del asesor o de la agencia? | UNKNOWN | Sin definición legal/producto hoy (ver `03`). |
| **Client ownership** | ¿La cartera de clientes es del asesor o de la agencia? | UNKNOWN | Determina qué pasa al salir un asesor. |
| **Advisor departure** | ¿Qué pasa con la cartera y los referidos cuando un asesor deja la agencia? | UNKNOWN | Hoy no hay flujo de salida ni transferencia. |
| **Agency hierarchy** | ¿Estructura plana o multinivel (director → equipos → asesores)? | UNKNOWN | Define el modelo de tenancy. |
| **Permissions** | ¿Qué ve cada rol? ¿La agencia ve datos de clientes de sus asesores? | UNKNOWN | Choca con la promesa de "solo tú ves tu cartera" (ver `03`). |
| **Reporting** | ¿La agencia quiere reportes agregados? ¿De qué? | UNKNOWN | Owner ya tiene métricas; agencia necesitaría scope propio. |
| **Billing** | ¿Por asiento, por agencia, o híbrido? ¿Quién recibe la factura? | UNKNOWN | Hoy el billing es por asesor individual vía MP. |
| **Reward configuration** | ¿La agencia estandariza la escalera de premios o cada asesor la suya? | UNKNOWN | Hoy es 100% por asesor (`RewardTier`). |
| **Compliance / privacy** | ¿Requisitos de privacidad/retención/consentimiento a nivel org? | UNKNOWN | Sin política formal hoy (ver `03`). |
| **Data isolation** | ¿Aislamiento garantizado entre asesores de la misma agencia y entre agencias? | HYPOTHESIS | Hoy solo aislamiento lógico por `advisorId`; falta tenancy real. |
| **Imports** | ¿Importación masiva a nivel agencia (varios asesores)? | HYPOTHESIS | Existe import CSV por asesor; no a nivel org. |
| **Exports** | ¿Export/portabilidad de datos? | UNKNOWN | Hoy **no existe export**. |
| **Audit log** | ¿Registro de quién hizo qué (para confianza de la agencia)? | UNKNOWN | Hoy no hay audit log. |
| **SSO** | ¿La agencia exige SSO / gestión centralizada de accesos? | UNKNOWN | Hoy auth propia por asesor. |
| **Offboarding** | ¿Cómo se da de baja una agencia completa y qué pasa con sus datos? | UNKNOWN | Sin flujo hoy. |

## Regla
Ninguna de estas preguntas se responde "construyendo". Se responden con **evidencia del mercado** (reuniones como la del `04`) y **solo después** de probar el loop individual. Hasta entonces: no schema, no roles, no tenancy.
