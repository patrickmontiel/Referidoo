# 10 · Onboarding V2 — wireframes textuales (pantalla por pantalla)

> Diseño conceptual. **Sin código, sin imágenes.** Copy propuesto (no final). Todo `DATA WRITES` y `EVENTS` es **propuesta**, no implementado. Cruzar con `09-ONBOARDING-PRODUCT-MODEL-AUDIT.md`.
> Leyenda: `[ ]` campo · `( )` opción · `▸` CTA primario · `·` CTA secundario.

---

# A) ASESOR NUEVO — flujo completo (8 bloques)

## S1 · AUTH
- **PURPOSE:** entrar con la mínima fricción posible; que no se sienta "alta de SaaS".
- **COPY:** H1 *"Convierte tus clientes actuales en tu mejor canal de referidos."* · Sub: *"Estamos abriendo Referidoo a un grupo reducido de asesores de Vida y PPR."* (factual: hoy es acceso anticipado real)
- **FIELDS:** — (Google) · alternativa: `[nombre] [correo] [contraseña]`
- **CTA:** ▸ **Continuar con Google**
- **SECONDARY CTA:** · *Usar mi correo* · *Ya tengo cuenta*
- **PROGRESS:** — (aún no empieza el setup)
- **TRUST COPY:** *"Solo usamos tu correo para tu cuenta. Nunca publicamos nada."*
- **DATA WRITES:** Advisor (find-or-create por email); `emailVerified=true` si viene de Google
- **EVENTS:** `signup_started`, `auth_completed` (con `method: google|email`)
- **NEXT:** S2

## S2 · PERFIL DE NEGOCIO (3 preguntas, una pantalla progresiva)
- **PURPOSE:** capturar **solo** lo que personaliza el producto (hoy no se captura NADA).
- **COPY:** *"Cuéntame de tu práctica para dejarte Referidoo listo."* (3 preguntas, ~20 segundos)
- **FIELDS:**
  1. *¿Qué vendes principalmente?* ( PPR ) ( Vida ) ( Ambos ) → **personaliza:** intereses visibles en la landing del referido, copy de premios
  2. *¿Cuántos clientes tienes hoy?* ( <25 ) ( 25–50 ) ( 50–100 ) ( 100–250 ) ( 250+ ) → **personaliza:** framing S3 + tamaño sugerido de la 1ª activación + expectativa de importación
  3. *¿Cómo llegan tus referidos hoy?* ( Los pido personalmente ) ( Por WhatsApp ) ( Llegan solos ) ( Casi nunca los pido ) → **personaliza:** canal por defecto (WhatsApp assisted vs email) y el encuadre ("ya lo haces a mano — automaticémoslo")
- **CTA:** ▸ **Continuar**
- **SECONDARY CTA:** · *Prefiero saltarlo* (permitido; se usan defaults)
- **PROGRESS:** "Paso 1 de 4"
- **TRUST COPY:** *"Nada de esto se comparte. Sirve para configurar tu cuenta."*
- **DATA WRITES:** `products` + `defaultChannel` (AdvisorSettings, propuesto); tamaño de cartera → **evento**, no campo permanente
- **EVENTS:** `business_profile_completed` (o `_skipped`)
- **NEXT:** S3

## S3 · "YA TIENES EL ACTIVO" (momento de encuadre)
- **PURPOSE:** transición psicológica: de "voy a probar una app" a "tengo un activo desaprovechado".
- **COPY (variante según respuesta 2):**
  - 100–250 → *"Ya tienes el activo más importante: tus clientes actuales."* / sub: *"Entre 100 y 250 personas que ya te compraron y confían en ti. Ese es tu canal de referidos — solo hay que activarlo."*
  - <25 → *"No necesitas una cartera enorme para empezar."* / sub: *"Con los clientes que ya tienes alcanza para las primeras recomendaciones."*
- **FIELDS:** —
- **CTA:** ▸ **Conectar mi cartera**
- **SECONDARY CTA:** · *¿Cómo funciona?* (abre explicación corta, no sale del flujo)
- **PROGRESS:** "Paso 2 de 4"
- **TRUST COPY:** —
- **DATA WRITES:** —
- **EVENTS:** — (o `asset_framing_viewed`)
- **NEXT:** S4
- **NOTA anti-hype:** el número viene de **su** respuesta; no se inventan proyecciones de dinero aquí. Sin countdowns ni escasez falsa.

## S4 · CONECTA TU CARTERA (la acción de activación clave)
- **PURPOSE:** que sienta *"conecté mi cartera"*, no *"importé una hoja de cálculo"*.
- **COPY:** H1 *"Conecta tu cartera"* · Sub: *"Súbela una vez. A partir de aquí, Referidoo la mantiene trabajando para ti."*
  - Si ya tiene clientes: banner *"Ya tienes **4 clientes conectados**. Agrega el resto."*
- **FIELDS:** zona **drag & drop CSV** · `· Descargar plantilla CSV` · `· Agregar a mano` (nombre/teléfono/correo)
- **CTA:** ▸ **Subir archivo**
- **SECONDARY CTA:** · *Lo hago después* (permitido; queda pendiente en el dashboard)
- **PROGRESS:** "Paso 3 de 4"
- **TRUST COPY (crítico, justo aquí):** *"Tu cartera sigue siendo tuya. Solo tú la ves — no la vendemos ni la compartimos, y puedes borrarla cuando quieras."*
- **DATA WRITES:** Client (upsert — ver S4b)
- **EVENTS:** `portfolio_import_started`
- **NEXT:** S4b
- **FUTURO (no construir):** Google Contacts, import de CRM.

## S4b · PREVIEW DE IMPORTACIÓN (antes de escribir)
- **PURPOSE:** que la importación sea **revisable** y **idempotente** (hoy re-importar duplica).
- **COPY:** *"Revisa antes de conectar"* · resumen: *"86 listos · 4 ya estaban (se actualizan) · 3 sin teléfono ni correo"*
- **FIELDS:** tabla de preview (nombre · teléfono · correo · estado: **Nuevo / Ya existe (actualiza) / Falta dato**) · mapeo de columnas si el CSV no coincide
- **CTA:** ▸ **Conectar 86 clientes**
- **SECONDARY CTA:** · *Corregir archivo* · *Omitir filas incompletas*
- **PROGRESS:** "Paso 3 de 4"
- **TRUST COPY:** *"No creamos duplicados: si el cliente ya está, actualizamos sus datos y conserva su mismo link."*
- **DATA WRITES:** **upsert** por `(advisorId, teléfono normalizado)` → luego email; conserva `referralCode`/`accessToken` existentes
- **EVENTS:** `portfolio_import_completed` (con `created`, `updated`, `skipped`)
- **NEXT:** S5
- **EDGE CASES a resolver en UI:** sin teléfono **y** sin correo → no contactable (avisar, permitir importar igual); mismo correo con teléfono distinto → marcar como "posible duplicado" y dejar decidir (ver Open Questions en `09`).

## S5 · PREMIOS (default recomendado, editable)
- **PURPOSE:** no hacerlo configurar desde cero, **pero sin esconder** la decisión económica. *(Opción C del análisis.)*
- **COPY:** *"Así premias a quien te recomienda."* · sub: *"Este es el arreglo que mejor funciona. Puedes cambiarlo ahora o después."*
- **FIELDS:** escalera pre-llenada `1º $1,500 · 2º $1,500 · 3º $3,500 (bono)` · después del último: ( Vuelve a empezar ) ( Se queda fijo ) ( Monto plano )
- **CTA:** ▸ **Usar estos premios**
- **SECONDARY CTA:** · *Ajustar montos*
- **PROGRESS:** "Paso 4 de 4"
- **TRUST COPY:** *"Tú pagas el premio directo a tu cliente. Referidoo no mueve dinero — solo lleva la cuenta de a quién le toca."*
- **DATA WRITES:** RewardTier (defaults si no los toca)
- **EVENTS:** `reward_setup_completed` (`used_default: true|false`)
- **NEXT:** S6

## S6 · PREVIEW DEL CLIENTE (trust real)
- **PURPOSE:** responder *"¿qué le va a llegar a mi cliente?"* **antes** de activar. Reusa portal + plantilla reales, no un mock.
- **COPY:** *"Esto es exactamente lo que va a recibir tu cliente."*
- **FIELDS:** dos paneles — **(1) el mensaje** (WhatsApp o correo, con `{nombre}` resuelto a un cliente real de su cartera) · **(2) su portal** (render real de `/c/[token]`, con su nombre y sus premios)
- **CTA:** ▸ **Se ve bien, continuar**
- **SECONDARY CTA:** · *Editar el mensaje* · **· Enviármelo a mí primero** (usa el patrón "agrégate a ti mismo" que ya existe)
- **PROGRESS:** — (revisión, no paso nuevo)
- **TRUST COPY:** *"Tu cliente no necesita crear cuenta ni descargar nada."* (cierto: el portal es sin login)
- **DATA WRITES:** — (solo lectura; si pide "enviármelo a mí", crea/usa su cliente de prueba)
- **EVENTS:** `preview_viewed`
- **NEXT:** S7

## S7 · TU MOTOR ESTÁ LISTO (personalización REAL)
- **PURPOSE:** cerrar la sensación "esto ya es mío y ya funciona". Cada línea debe ser **verdad configurada**, no cosmética.
- **COPY:** H1 *"Tu motor de referidos está listo."*
- **FIELDS (resumen, todo real):**
  - Productos: **Vida + PPR** *(de S2)*
  - Cartera: **86 clientes conectados** *(conteo real tras import)*
  - Portales: **86 listos** *(uno por cliente, ya existen)*
  - Premios: **configurados** *(tiers reales)*
  - Canal inicial: **WhatsApp** *(de S2.3)*
- **CTA:** ▸ **Activar mis primeros 30 clientes**
- **SECONDARY CTA:** · *Ir a mi panel*
- **PROGRESS:** setup completo (4/4)
- **TRUST COPY:** —
- **DATA WRITES:** —
- **EVENTS:** `setup_completed`
- **NEXT:** S8
- **REGLA:** si un ítem no está configurado de verdad, **no se muestra** (nada de personalización falsa).

## S8 · PRIMERA ACTIVACIÓN
- **PURPOSE:** la culminación es una **activación real**, no "entrar al dashboard".
- **COPY:** *"Empieza con un grupo, no con toda tu cartera."* · sub: *"Así ves cómo responden y afinas el mensaje antes de mandarlo a los 86."*
- **FIELDS:** selector de tamaño **sugerido** (`<25`→todos · `25–100`→~30 · `100+`→~30–50), lista con selección editable, canal (WhatsApp/Email), mensaje (editable, con preview)
- **CTA:** ▸ **Activar estos 30 clientes**
- **SECONDARY CTA:** · *Cambiar selección* · *Activar después*
- **PROGRESS:** —
- **TRUST COPY:** *"Tú decides quién recibe cada activación."* (+ si es WhatsApp: *"Los mandas tú, desde tu WhatsApp."*)
- **DATA WRITES:** ReferralCampaign + CampaignRecipient (backend V1 **tal cual**)
- **EVENTS:** `first_activation_created`, `first_activation_started`
- **NEXT:** S9

## S9 · DASHBOARD (ya con valor creado)
- **PURPOSE:** entrar a un panel que **ya tiene algo que contar** (no ceros).
- **COPY:** *"¿Qué está haciendo tu cartera por ti?"*
- **FIELDS (jerarquía de `09` §9):** Cartera total → Clientes activados → Portales abiertos → Compartieron → Referidores productivos → Oportunidades → Ventas
- **CTA:** ▸ **Activar más clientes** (los 56 restantes)
- **SECONDARY CTA:** · *Ver la activación en curso*
- **TRUST COPY:** —
- **EVENTS:** (ya cubiertos por ProductEvent)
- **NEXT:** operación normal

---

# B) ASESOR EXISTENTE — recovery flow (Ceci)

> Ceci ya tiene cuenta y ~4 clientes. **No repite signup ni preguntas que ya podemos inferir.**

## R1 · COMPLETA TU CONFIGURACIÓN
- **PURPOSE:** retomar sin volver a empezar; mostrar **progreso real ya existente** (endowed progress honesto).
- **COPY:** *"Ya tienes 4 clientes conectados."* · sub: *"Vamos a conectar el resto de tu cartera y activarla."*
- **FIELDS:** resumen del estado real: clientes conectados · premios (configurados/pendientes) · canal
- **CTA:** ▸ **Agregar el resto de mi cartera**
- **SECONDARY CTA:** · *Activar solo estos 4* (camino válido para probar rápido)
- **PROGRESS:** "Tu configuración: 2 de 4"
- **TRUST COPY:** *"Tu cartera sigue siendo tuya."*
- **DATA WRITES:** —
- **EVENTS:** `recovery_flow_started`
- **NEXT:** R2

## R2 · AGREGA EL RESTO DE TU CARTERA
- Igual que **S4 + S4b**, con el banner *"Ya tienes 4 conectados"* y el preview de import marcando **"ya existe (actualiza)"** para esos 4 → **no se duplican**.
- **EVENTS:** `portfolio_import_started/completed`
- **NEXT:** R3

## R3 · REVISA TU SISTEMA
- **PURPOSE:** confirmar (no reconfigurar). Solo pregunta lo que **falte**.
- **COPY:** *"Revisa que esté como lo quieres."*
- **FIELDS:** premios (default o los suyos) · canal · **preview del cliente** (S6 real) · perfil de negocio **solo si falta** (y si se puede inferir de sus tiers/referidos, se pre-llena)
- **CTA:** ▸ **Está listo**
- **SECONDARY CTA:** · *Ajustar*
- **EVENTS:** `preview_viewed`, `reward_setup_completed` (si tocó algo)
- **NEXT:** R4

## R4 · PRIMERA ACTIVACIÓN DE CECI
- Igual que **S8**, con el tamaño sugerido calculado sobre su cartera real ya importada.
- **EVENTS:** `first_activation_created`, `first_activation_started`
- **NEXT:** S9 (dashboard)

---

# C) Comparación de journeys
| | **Asesor nuevo (32)** | **Asesor existente (Ceci)** |
|---|---|---|
| Entrada | Landing → Google/email | Login normal → banner "Completa tu configuración" |
| Perfil de negocio | 3 preguntas | Solo lo que falte / inferido |
| Cartera | Importa desde cero | **Parte de 4 ya conectados** → agrega el resto (upsert, sin duplicar) |
| Premios | Default recomendado | Confirma los suyos |
| Preview | Sí (primera vez) | Sí (refuerza confianza antes de activar a su cartera real) |
| Culminación | Primera activación | Primera activación |
| Riesgo principal | Abandono antes de importar | Duplicar cartera al importar (→ **Phase A es prerequisito**) |

---

# D) Momentos de confianza (just-in-time, resumen)
| Momento | Copy (solo verificable) |
|---|---|
| Antes de importar (S4) | "Tu cartera sigue siendo tuya. Solo tú la ves." |
| En el preview de import (S4b) | "No creamos duplicados: si ya está, se actualiza y conserva su link." |
| En premios (S5) | "Tú pagas el premio directo a tu cliente. Referidoo no mueve dinero." |
| En el preview del cliente (S6) | "Tu cliente no necesita crear cuenta ni descargar nada." |
| Antes de activar (S8) | "Tú decides quién recibe cada activación." (+ WhatsApp: "los mandas tú") |
| Cuando aparezca CLABE | "Referidoo registra el premio; la transferencia la haces tú." |

**Prohibido:** fake scarcity, countdowns, "quedan 3 lugares", promesas de cifrado/certificaciones no verificadas.
