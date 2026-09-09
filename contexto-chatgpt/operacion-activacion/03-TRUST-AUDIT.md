# 03 · Trust Audit — Referidoo

> **No es otra security audit genérica** (esa vive en `../auditoria-actual/08-RIESGOS-Y-DEUDA.md`). Aquí la pregunta es:
> **"¿Qué tendría que creer un asesor, un cliente o una agencia para confiarle sus datos a Referidoo?"**
>
> Se mapean 3 perspectivas y se clasifica cada gap por **cuándo** hay que resolverlo: **BEFORE CECI · BEFORE NEXT ADVISOR · BEFORE B2B · LATER**. **No se construye ningún fix aquí.**

---

## Perspectiva 1 — ASESOR (el que paga y sube datos de su cartera)

| Qué necesita creer | Verdad actual del producto | Gap / riesgo | Clasificación |
|---|---|---|---|
| "Los datos de mis clientes son míos y están seguros" | Auth propia JWT+bcrypt; mutaciones validan `advisorId===session`; login **no valida `deletedAt`/`emailVerified`** | Cuenta soft-borrada podría re-loguearse | BEFORE NEXT ADVISOR |
| "Solo yo veo mi cartera" | Aislamiento por `advisorId` en queries; sin multi-tenant real (no hay agencias) | OK para individual; sin rol intermedio | LATER (crítico si B2B) |
| "El dueño (Patrick) no anda husmeando mi info" | `/owner/*` gated por `PLATFORM_OWNER_EMAIL`; el owner **sí puede ver** métricas, carátulas, y datos vía backup | Patrick tiene visibilidad amplia; no hay política escrita de qué ve el owner ni por qué | BEFORE CECI (explicarlo verbalmente) / BEFORE B2B (formalizar) |
| "Mis carátulas de pólizas están protegidas" | Upload gated por sesión; visor gated por owner con allowlist de host de Blob | URL de Blob es "pública pero no adivinable"; sin expiración | BEFORE B2B |
| "Mi facturación es correcta y transparente" | Comisión calculada al convertir; se suma al cobro MP; tarjeta tokenizada (Referidoo no ve el PAN) | Toggle manual de plan no emite PlanEvent → historial incompleto | BEFORE NEXT ADVISOR |
| "Si me voy, me llevo/borro mi info" | **No hay export ni delete self-service de cartera**; `/api/demo/reset` borra datos del asesor sin confirmación server-side | Sin flujo de salida/portabilidad; borrado peligroso existe | BEFORE B2B (export/retention) |
| "La cartera es mía, no de Referidoo" | Datos viven en la DB de Referidoo; sin contrato de propiedad explícito | Propiedad de cartera no está escrita en ningún lado | BEFORE B2B |

---

## Perspectiva 2 — CLIENTE (el referidor; recibe el link, captura CLABE)

| Qué necesita creer | Verdad actual | Gap / riesgo | Clasificación |
|---|---|---|---|
| "Sé por qué recibo esto y de quién" | El portal `/c/[token]` muestra al asesor y el premio; pero el **acceso = poseer el token** (sin login) | Si el link se reenvía, cualquiera con el token entra | BEFORE NEXT ADVISOR |
| "Referidoo es de fiar" | Marca visible; landing pública explica; sin sello legal | Confianza depende del asesor que comparte | BEFORE CECI (el asesor es el aval) |
| "Mi CLABE está segura y sé para qué es" | CLABE se captura para que el asesor deposite; **Referidoo no transfiere**; copy ya corregido (no más "nunca pedimos datos bancarios") | `accessToken`=`cuid()` (no cripto-aleatorio) protege un portal que **muestra CLABE/premios**; enumerabilidad teórica | BEFORE NEXT ADVISOR |
| "Solo el asesor correcto ve mi CLABE" | La CLABE la ve el asesor dueño en su panel | Depende de la fuerza del token del portal | BEFORE NEXT ADVISOR |
| "Quién me paga y cómo" | El **asesor paga por fuera** vía CLABE; la app solo registra estado (no es rail de pago) | Claro en producto; sin garantía si el asesor no paga (solo recordatorios + cola del owner) | LATER |
| "Mis datos no se filtran" | `referralCode` de `/r/[code]` = nombre + `Math.random()` (enumerable) → permite spammear leads falsos / descubrir clientes de un asesor; **PII de clientes (incl. CLABE) viaja en el backup diario por email sin cifrar** | Enumerabilidad del código; PII sensible en email | BEFORE NEXT ADVISOR (backup PII) / LATER (referralCode) |

---

## Perspectiva 3 — AGENCIA (aún NO cliente; futura, no construir)

> Todo aquí es **para cuando exista B2B**. Hoy Referidoo es single-advisor; no hay jerarquía ni rol de agencia.

| Qué necesitaría creer | Verdad actual | Gap | Clasificación |
|---|---|---|---|
| "Los datos de un asesor están aislados de otro" | Aislamiento lógico por `advisorId`; sin tenant/organización | No hay modelo de agencia ni aislamiento por org | BEFORE B2B |
| "La agencia es dueña de los datos / la cartera" | Sin concepto de propiedad a nivel org | Indefinido | BEFORE B2B |
| "Hay acceso administrativo con roles" | Solo asesor + owner (Patrick) | No hay rol admin de agencia | BEFORE B2B |
| "Si un asesor se va, la agencia conserva/controla su cartera" | Sin flujo de salida ni transferencia | Indefinido | BEFORE B2B |
| "Puedo auditar quién hizo qué" | Sin audit log de acciones | No existe audit log | BEFORE B2B |
| "Cumple privacidad y retención" | Sin política de retención/borrado/export; PII por email en backup | Sin compliance formal | BEFORE B2B |
| "Puedo importar/exportar mi data" | Import CSV de clientes existe; **no hay export** | Falta export/portabilidad | BEFORE B2B |
| "Seguridad operacional / SSO" | Sin SSO; rate limit **in-memory** (no distribuido); tokens débiles | Falta hardening a escala | BEFORE B2B |

---

## Riesgos conocidos revisados conscientemente (no todos bloquean a Ceci)

| Riesgo (de `08`) | ¿Bloquea a Ceci? | Clasificación | Razonamiento |
|---|---|---|---|
| **PII/CLABE en backup por email sin cifrar** | No bloquea la sesión, pero es el más feo | **BEFORE NEXT ADVISOR** | Con 1 asesora es bajo volumen; a partir del 2º asesor real hay PII de terceros acumulándose por email. |
| **`accessToken` = cuid()** (portal expone CLABE) | No | BEFORE NEXT ADVISOR | Riesgo real pero requiere adivinar/enumerar; bajo con pocos usuarios. |
| **`referralCode` con `Math.random()`** (enumerable) | No | LATER | Solo permite spammear leads falsos / descubrir clientes; no expone PII directa. |
| **Rate limit in-memory** (no distribuido) | No | BEFORE B2B | Suficiente como capa barata hoy; a escala requiere Upstash/DB. |
| **Owner access amplio** (Patrick ve mucho) | No — pero **explicarlo a Ceci** | BEFORE CECI (verbal) / BEFORE B2B (formal) | Ceci debe saber qué ve Patrick; con agencias hay que formalizar y limitar. |
| **Carátulas en Blob** (URL no adivinable, sin expiración) | No | BEFORE B2B | Bajo hoy; endurecer antes de multi-tenant. |
| **CLABE capturada / flujo de pago por fuera** | No | BEFORE CECI (copy ya veraz) | El copy ya no miente; el cliente debe entender que el asesor paga. |
| **Sin delete/export/retention self-service** | No | BEFORE B2B | Individual tolera hand-holding; agencia exige portabilidad y borrado. |
| **Login no valida `deletedAt`/`emailVerified`** | No | BEFORE NEXT ADVISOR | Cuenta dada de baja podría re-entrar; bajo con pocos usuarios. |

## Resumen por gate
- **BEFORE CECI:** solo **explicar verbalmente** qué ve Patrick (owner) y confirmar que el copy de CLABE es veraz (ya lo es). Nada que construir.
- **BEFORE NEXT ADVISOR:** backup con PII por email; login que no valida `deletedAt`; fuerza del `accessToken`; PlanEvent en toggle manual.
- **BEFORE B2B:** aislamiento por organización, propiedad de datos/cartera, roles admin, salida de asesor, audit log, export/retention, hardening (rate limit distribuido, tokens cripto, SSO), formalizar acceso del owner.
- **LATER:** `referralCode` cripto, expiración de URLs de Blob, garantías de pago al cliente.

> **No se construye nada aquí.** Esta clasificación alimenta el LATER de `00-ACTIVATION-OS.md` y las decisiones futuras del `06-DECISION-LOG.md`.
