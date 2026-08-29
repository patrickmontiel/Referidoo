# Auditoría de Onboarding — Referidoo

**Fecha:** 2026-08-29
**Método:** lectura de los componentes del camino de primer uso del asesor (`AdminOverviewClient`, `PrimerosPasosCard`, `ClientesClient`) + superficies del cliente. No navegación en vivo — el hallazgo #1 es de estructura/copy, no visual.
**Lente:** ¿qué frena a un asesor entre "me registré" y "un cliente compartió y me cayó un referido"? (la activación de dos lados de `activation.md`).

---

## Veredicto de primera impresión: 4/5 en pulido, 2/5 en enfoque

El app **no está vacío de onboarding**: tiene tarjeta de Primeros Pasos con barra de progreso, tour guiado (`data-tour`), estados vacíos con copy, el "agrégate a ti mismo", tarjeta de cliente de prueba, y CTAs de WhatsApp por cliente. El problema no es ausencia — es **jerarquía**: las tres piezas que curan tu activación están escondidas o compiten con ruido, y todo el primer uso define el éxito como *"agregar clientes"* en vez de *"que un cliente comparta"*.

---

## Los 4 hallazgos que frenan el loop (ordenados por impacto en TU tarea)

### 🥇 1. El "agrégate a ti mismo" — tu mejor herramienta de activación — está escondido y se AUTODESTRUYE
**Dónde:** `ClientesClient.tsx:611-619`. Es un link de texto chico (`text-xs`) dentro del header del formulario de "Nuevo cliente", y solo aparece si `clients.length === 0`.

**Por qué mata tu loop:** tú mismo dijiste que los asesores meten primero a un familiar de confianza. **En el instante que agregan a ese familiar, `clients.length` deja de ser 0 y el link "agrégate a ti mismo" DESAPARECE para siempre.** O sea: la única herramienta que les deja probar el loop sin arriesgar a un cliente real se esfuma justo cuando cometen el error que tú describes (meter al familiar que no refiere). El miedo a "pasar pena con mi cliente" nunca se cura porque la salida privada está oculta y es efímera.

**Impacto:** ALTO. Es la raíz de tu problema de activación descrito en tu propio diagnóstico.

### 🥈 2. Tras agregar un cliente, NO se fuerza el handoff — el asesor cae en "mete otro"
**Dónde:** `ClientesClient.tsx:206-210`. Al crear un cliente, el form se cierra (`setShowForm(false)`) y el cliente aparece en la lista con WhatsApp + Copiar link como **dos botones iguales entre varios** (menú, chevron, etc.).

**Por qué mata tu loop:** el paso que importa —que el cliente **comparta**— no está elevado. El asesor acaba de hacer su parte y el sistema no le grita "AHORA mándale su link para que empiece a recomendarte". Cae de vuelta en una lista que invita a "agregar otro cliente" (callejón sin salida de `activation.md`, fix #3). Mete 2-3 y se para, porque nada pasó.

**Impacto:** ALTO. Es el segundo lado de la activación sin disparar.

### 🥉 3. Todo el primer uso define el éxito como "clientes", no como "un cliente que comparte"
**Dónde:** dashboard `AdminOverviewClient.tsx:124-128` (las 3 stats lideran con "Clientes activos"); estado vacío `:175-181` ("Aun no hay referidos" → "Agrega tu primer cliente"); estado vacío de clientes `:699` ("Agrega tu primer cliente para comenzar").

**Por qué importa:** el asesor aprende que la meta es *acumular clientes*. Pero el aha —lo que lo convence— es *un referido que le cae solo*. El copy nunca nombra esa meta real, así que el asesor optimiza lo incorrecto (agregar) y se frustra cuando "agregar" no produce magia.

**Impacto:** MEDIO. No bloquea, pero desalinea toda la sesión.

### 4. El auto-test no tiende puente al cliente real
**Dónde:** `ClientesClient.tsx:657-692`. La tarjeta de cliente de prueba dice "Cuando termines, elimínalo" — y ahí muere el momentum.

**Por qué importa:** el asesor acaba de sentir el loop completo (¡el mejor momento!) y el sistema lo despide con "elimínalo" en vez de "ahora hazlo con un cliente real que te recomendaría". Se pierde el pico de convicción.

**Impacto:** MEDIO.

---

## Lo que YA está bien (no tocar)
- La barra de Primeros Pasos con progreso y tour guiado — buena estructura.
- La tarjeta de cliente de prueba (existe y es clara) — solo está mal enganchada (hallazgos 1 y 4).
- Los CTAs de WhatsApp con mensaje prellenado por cliente — buenos, solo mal jerarquizados (hallazgo 2).
- El corte obligatorio de pago y el resumen de deuda — sólido.

---

## Quick wins (orden de impacto en cerrar UN loop)
1. **Rescatar el "agrégate a ti mismo"**: sacarlo del link efímero → tarjeta de estado vacío prominente Y una tarea permanente en Primeros Pasos ("Corre el loop una vez"). Que NO dependa de `clients.length === 0`.
2. **Forzar el handoff post-creación**: al crear un cliente, un estado de éxito con UN CTA héroe: "Mándale su link por WhatsApp ahora".
3. **Reencuadrar el copy de éxito**: de "agrega tu primer cliente" → "logra que un cliente comparta su link".
4. **Puente del auto-test**: cambiar "elimínalo" por "ahora hazlo con un cliente real".

Ver `soluciones.md` para el copy y el código listo de cada uno.
