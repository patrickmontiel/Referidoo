# Plan Ceci — tu primer caso de éxito (modo millón de dólares)

> Un solo objetivo, todo lo demás es ruido: **que un cliente de Ceci refiera a un conocido, ese conocido deje sus datos, y Ceci lo cierre.** Ese loop cerrado = tu primera prueba de que Referidoo funciona + tu primer testimonio. Trátalo como si te pagaran $1M por lograrlo: alto contacto, cero fricción, seguimiento implacable. Ver [[project_auditoria-agentes-ia]] y `activation.md`.

Última actualización: 2026-08-29

---

## La estrella polar
**1 referido real, cerrado por Ceci.** No "que use la app", no "que meta clientes". El aha profundo: le cayó alguien que no persiguió, y lo cerró. Hasta que eso pase, nada más cuenta.

## La verdad que define el plan (activación de dos lados)
El aha de Ceci **depende de que su CLIENTE actúe** (abra, comparta). Son 4 handoffs, cada uno una fuga:
`Ceci mete al cliente → el cliente abre su portal → el cliente comparte → un conocido llena el formulario`.
Tu trabajo de $1M es **blindar cada uno de esos 4 pasos a mano.** No sueltes el proceso hasta que el referido caiga.

---

## Fase 0 — Antes de sentarte con ella (esta semana)
- [ ] **Confirma que Ceci es tu ICP.** Vida/PPR, digital, cree en referidos, <~45. Si es la asesora del mensaje de voz que no habías escuchado — **escúchalo primero** (ver [[project_referidoo_estrategia]] / who-is-this-for). Si no es ICP, elige mejor a quién le apuestas este esfuerzo.
- [ ] **Dale otro mes de Pro** (comp) para que no tenga NINGUNA fricción de pago durante el experimento. (Comando: `npx tsx prisma/comp-advisor.ts --apply <id>` con creds de prod; su id sale de /owner/asesores.)
- [ ] **Ten la app lista** y tu demo corrida una vez (tú como cliente de prueba) para que fluya.
- [ ] **Agenda la sesión 1 en persona o videollamada.** Nada async. Esto se hace hombro con hombro.

## Fase 1 — Sesión 1 (45–60 min, hombro con hombro): onboarding + elegir al cliente correcto
El error #1 de tus asesores fue meter a un **familiar de compromiso** que no refiere. Aquí lo evitas.

1. **Corre el loop CON ella, primero contigo.** Que se agregue a sí misma (el "agrégate a ti mismo" que ya dejamos visible), abra su portal, se mande su link, y sienta el recorrido completo sin arriesgar a nadie. 2 minutos. Que lo VIVA, no que se lo cuentes.
2. **Elijan JUNTOS al cliente ideal — no un favor familiar.** Criterios (escríbelos con ella):
   - Contento con Ceci (le tiene confianza real).
   - **Sociable / con red amplia** (conoce a mucha gente, le gusta recomendar).
   - Del ramo core (su seguro es vida/PPR).
   - Que NO le dé flojera el celular.
   > Uno bueno vale más que diez de relleno. Apunten a 1–2 clientes así, no a la cartera entera.
3. **Métanlo ahí mismo, juntos.**
4. **Fuerza el handoff EN LA SESIÓN.** No "luego le mando el link". Que Ceci le mande el link al cliente **ahí**, con un mensaje que pulan entre los dos (personal, con el premio claro). El fix que shippeamos la empuja a esto ("Mándale su link ahora").

## Fase 2 — Activar al CLIENTE (el lado que se cae, blíndalo)
El cliente no es tu usuario, pero sin él no hay aha. Plan para que ACTÚE:
- **Que Ceci se lo explique en persona/llamada, no con un link frío.** "Te va a llegar un link, mira lo que ganas si me recomiendas: [premio]. Compártelo con 2–3 personas que creas que les sirve."
- **Pídele compartir con personas CONCRETAS, no "con quien quieras".** "¿Quién de tu familia/trabajo crees que necesita un seguro?" → que piense en 2–3 nombres. Lo vago no mueve; lo específico sí.
- **Ventana de 48h:** si el cliente no compartió, Ceci lo contacta (sin pena — es su cliente). Tú le recuerdas a Ceci que lo haga.

## Fase 3 — El referido cae → Ceci cierra
- **Velocidad:** en cuanto entre el referido, Ceci lo contacta rápido (lead fresco convierte). Tú estás encima ese día.
- **Acompáñala al cierre** si titubea. Es tu caso de éxito; no lo dejes a la suerte.
- Al cerrar: que **le pague el premio a su cliente** (cierra el ciclo de confianza y deja al cliente listo para referir otra vez).

## Fase 4 — Captura el testimonio (el activo que enciende todo)
En cuanto cierre, mientras está caliente:
- **Grábala / documenta en SUS palabras:** ¿qué sintió cuando le cayó el referido solo? ¿el antes/después? ¿lo recomendaría?
- Ese testimonio es la **carne de tu historia** (actos 2 y 3 de `positioning.md`) y el combustible de first-50. Sin él, el positioning es esqueleto; con él, vendes.

---

## Cadencia de seguimiento (implacable)
Check-in con Ceci **cada 1–2 días** hasta que el loop cierre. No la sueltes. Un mensaje corto: "¿ya abrió su portal tu cliente? ¿te ayudo a recordarle?".

## Tablero de contingencias (los 4 handoffs)
| Se atora en… | Tu jugada de $1M |
|---|---|
| Ceci no mete al cliente | Métanlo juntos en la sesión, no la dejes salir sin eso. |
| El cliente no abre el link | Que Ceci le llame y se lo explique de viva voz. |
| El cliente no comparte | Pídele compartir con 2–3 personas concretas; ofrece redactar el mensaje. |
| Nadie llena el formulario | Revisa que el mensaje/landing sea claro; que el cliente comparta con más gente; prueba otro cliente. |

## Cómo sabes que ganaste
**Un referido real, cerrado por Ceci, y su premio pagado.** Ahí tienes: producto validado, el loop asesor→asesor listo para dispararse, y tu primer testimonio. Ese día, todo lo demás (hero-gratis, barrera, first-50) arranca con viento a favor.

---

# Capa 1 — Acompañamiento (skill `customer-success`)

Trata a Ceci como tu cliente #1 en onboarding de alto contacto. La meta de la fase de "launch" en customer-success es literal: **"first value achieved"** = tu aha. Y su gatillo de "health improvement" es literal: al lograr valor, **pide el testimonio/referido.**

## Plan de éxito de Ceci (una hoja, compártela con ella)
| Hito | Qué significa | Dueño | Fecha |
|---|---|---|---|
| Kickoff | Corrió el loop consigo misma + eligió al cliente ideal | Tú + Ceci | Sesión 1 |
| Handoff | El cliente recibió su link (mensaje pulido) | Ceci | Sesión 1, ahí mismo |
| Activación del cliente | El cliente abrió su portal y compartió con 2–3 | Cliente (Ceci empuja) | +48–72 h |
| **Primer valor** | Cayó un referido real | El sistema | cuando pase |
| Cierre | Ceci cerró al referido y pagó el premio | Ceci | +días |
| Testimonio | Documentado en sus palabras | Tú | mismo día del cierre |

## Señales de salud de Ceci (revísalas en cada check-in)
- 🟢 **Verde:** metió al cliente, mandó el link, el cliente abrió el portal. Va.
- 🟡 **Amarillo:** metió al cliente pero no mandó el link, o el cliente no abrió en 48 h. → llamada de re-enganche (tú a Ceci, Ceci al cliente).
- 🔴 **Rojo:** no metió a nadie / metió a un familiar de compromiso / dejó de contestarte. → interviene directo: siéntate de nuevo, re-elige cliente, no la sueltes.

> El objetivo de las señales: detectar la fuga ANTES de que se enfríe, no después.

# Capa 2 — Cierre de fundador (skill `founder-sales`)

Aunque a Ceci la estás compando (sin cobrarle aún), esto es una venta: le vendes **hacer el trabajo** y la confianza de que va a funcionar. Principios:

- **Tú eres el producto.** Sin marca ni casos aún, lo que cierra es Patrick presente, confiable, hombro con hombro. Tu involucramiento no es "soporte", es el producto en esta etapa.
- **Construye confianza humana.** "Mírala a los ojos" y hazle creer que va a funcionar — porque adoptar algo no probado exige una relación de alta confianza.
- **Pesimismo interno / optimismo externo.** Por fuera, total convicción. Por dentro, caza señales que descalifiquen: ¿Ceci de verdad va a hacerlo? ¿su cliente de verdad refiere? Si ves banderas rojas, corrígelas ya — no las ignores por optimismo.
- **Vende la visión y el dolor, no las features.** No le enumeres funciones; véndele el mundo donde sus clientes felices le traen clientes solos. El feature es el cómo, no el porqué.
- **Haz el "ask" de compromiso** (versión del $1 Invoice Test — cruza la barrera de pedir). No cierres la sesión sin un compromiso concreto y con fecha: *"¿Te comprometes a mandarle el link a [cliente] hoy y a recordarle en 2 días?"* El "sí" con fecha es tu contrato.
- **El ask financiero viene DESPUÉS del valor.** Cuando Ceci cierre su primer referido y pague el premio, ahí haces el ask real: *"¿le entras a Pro para seguir sin límite?"*. El valor primero, el cobro después — pero el cobro sí llega (valida intención real).

## El error de fundador que NO debes cometer
De `founder-sales`: **no te quedes eternamente en "discovery/acompañamiento" sin pedir el compromiso.** Es fácil ser el amigo que ayuda y nunca pide nada. Pide el compromiso de acción en cada sesión, y el de pago después del primer éxito.
