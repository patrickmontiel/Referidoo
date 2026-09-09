# 01 · Experimento 1 — Ceci (primer referido real)

> El experimento **NO** es "que Ceci use Referidoo". Es:
> **conseguir que un cliente real de Ceci comparta y produzca un referido real** — y luego **llevar ese referido hasta cierre**.

## Perfil (lo que sabemos)
- Ceci, ~42 años, vende **Vida y PPR**.
- Ya se registró. Ya agregó varios clientes (<5). Ya mandó links.
- **No tenemos evidencia de qué pasó después.** `UNKNOWN — REQUIERE OBSERVACIÓN REAL`.
- Patrick ya le prometió acompañarla personalmente hasta cerrar uno.

## Hipótesis
> Creemos que un asesor de Vida/PPR con clientes satisfechos puede **provocar un referido** mediante el portal + la recompensa de Referidoo.

Sub-hipótesis que el experimento pone a prueba (cada handoff del loop):
- H1: el cliente **abre** el portal cuando el asesor se lo manda.
- H2: el cliente **entiende** qué es y por qué le conviene.
- H3: el cliente **quiere compartir** (el incentivo/premio es suficiente).
- H4: el share **produce vistas** de la landing.
- H5: la landing **convierte** en formulario iniciado → referido.
- H6: el asesor **trabaja** el referido hasta contacto → conversión → recompensa.

## Unidad de análisis
**No "Ceci".** Cada **cliente real de Ceci** es una unidad. Ceci es el entorno; el sujeto es el cliente-referidor. (En el Experiment Log, una entrada por cliente.)

## Antes de la sesión (Patrick debe saber — hoy UNKNOWN)
Para no volar a ciegas, Patrick debe traer:
- [ ] Qué clientes ya agregó Ceci. — `UNKNOWN — REQUIERE OBSERVACIÓN REAL`
- [ ] A cuáles les mandó el link. — `UNKNOWN`
- [ ] Qué mensaje usó al mandarlo. — `UNKNOWN`
- [ ] Si respondieron / abrieron. — `UNKNOWN` (se podrá ver en `/owner/activacion` una vez desplegada la instrumentación)
- [ ] Cuál considera **el mejor potencial referidor** (cliente satisfecho, activo, con red). — `UNKNOWN`

> Nota: parte de esto se vuelve observable en `/owner/activacion` **después** del deploy. Antes del deploy, es conocimiento que solo Ceci/Patrick tienen.

## La sesión (protocolo de observación)
1. **Elegir UNO** de sus mejores clientes reales. **No** el cliente familiar/de prueba solo porque da menos pena — eso contamina el experimento.
2. Ceci ejecuta en tiempo real, con Patrick observando:
   - Ceci **manda el portal** al cliente.
   - El cliente **recibe** → **abre** → **entiende** → **intenta compartir**.
3. **Patrick observa, no explica de más.** No rescatar al usuario apenas se confunde: **primero observar** la fricción, registrarla textual (qué dijo, dónde dudó), y solo después ayudar si hace falta.
4. Registrar todo en `02-EXPERIMENT-LOG.md` (sin PII): eventos + timestamps de `ProductEvent`, comportamiento, quote textual, fricción, si hubo intervención y cuándo.

## Outcomes (dónde muere el loop) y qué concluir
Para cada outcome: **qué hipótesis gana fuerza**, **qué pierde fuerza**, **qué NO concluir todavía.**

| Outcome | Descripción | Gana fuerza | Pierde fuerza | NO concluir aún |
|---|---|---|---|---|
| **A** | El portal no abre | Fuga técnica/entrega (link, canal) | — | Que el producto no sirve; puede ser el canal de envío |
| **B** | Abre pero no entiende | Problema de **claridad del portal** (H2) | H2 (comprensión) | Que "no sirve"; puede ser copy/onboarding del portal |
| **C** | Entiende pero no quiere compartir | Señal contra el **incentivo/propuesta** (H3) | H3 | Con 1 cliente NO se invalida; ver kill criteria |
| **D** | Share click pero no landing | Fuga de **entrega del share** o link roto | H4 | Que la landing esté mal (aún no se vio) |
| **E** | Landing vista pero no form | Problema del **referred-side** (`/r`) (H5) | H5 | Culpar al cliente/asesor; es lado-referido |
| **F** | Form iniciado pero no referral | Fricción del **formulario** (largo, campos, error) | H5 | Que "nadie quiere"; puede ser UX del form |
| **G** | **Referral real generado** | **ACTIVACIÓN** (North Star) — H1–H5 | — | Que ya hay PMF; es 1 caso |
| **H** | Referral contactado | Ejecución del asesor OK (H6 parcial) | — | — |
| **I** | Referral convertido | Loop de venta funciona | — | Que la economía cierra (falta reward) |
| **J** | **Reward pagado** | **DEEP ACTIVATION** — loop completo | — | Que escala; es 1 caso, falta repetir |

## Kill / Pivot criteria (diagnóstico, NO significancia estadística)
> Muestras chicas **no** invalidan. Estos son umbrales operativos tempranos para saber **dónde mirar**, marcados explícitamente como **diagnóstico, no significancia estadística.**

- **1 cliente que no comparte NO invalida Referidoo.** (Outcome C con n=1 → seguir.)
- **Señal seria contra la propuesta de incentivo:** varios clientes **adecuados** (satisfechos, activos) que **ABREN + ENTIENDEN** y aun así **sistemáticamente no intentan compartir**. Umbral diagnóstico temprano: **≈3–5 clientes adecuados** con ese patrón → cuestionar el incentivo/propuesta (no antes).
- **Problema del referred-side (`/r`):** **muchas vistas de landing con casi ningún form iniciado** (p. ej. ≥8–10 vistas, ~0 form starts) → estudiar `/r` (Conversion Audit).
- **Problema de ejecución del asesor (no del loop):** **referrals generados que el asesor no trabaja** (no `contactedAt` en días) → es advisor execution, NO el referral loop.
- **Fuga técnica:** shares/abre con caída inmediata (A/D) repetida → revisar entrega/canal, no la propuesta.

Ninguno de estos es una prueba estadística; son señales para dirigir la siguiente observación. No inventar falsa precisión.

## Precondición
Este experimento **requiere la instrumentación en producción** para tener trazabilidad (`/owner/activacion`). Mientras el deploy esté bloqueado, la sesión puede correrse igual pero la evidencia de eventos será parcial (solo lo que Ceci/Patrick observen a mano). **Preferible: desplegar primero.**

## Qué NO hacer en este experimento
No cambiar el producto a media sesión, no agregar features, no "arreglar" el portal en vivo, no elegir un cliente de prueba fácil, no rescatar al usuario antes de observar la fricción, no registrar PII.
