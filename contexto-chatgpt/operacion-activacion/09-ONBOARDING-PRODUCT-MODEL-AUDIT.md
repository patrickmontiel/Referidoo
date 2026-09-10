# 09 · Onboarding & Product-Model Audit + Rediseño conceptual

> Fase de **análisis y diseño únicamente** (sin código, sin schema, sin push, sin migraciones). Verificado contra código (`file:line`). No se tira nada de Portfolio Campaigns V1. Snapshot 2026-09-10.

---

## 1. Current journey (reconstruido del código)
```
Landing (page.tsx) — "Deja de perseguir clientes…", banner "Acceso anticipado"
  → /registro — name, email, password, (empresa opcional)
  → auto-login (emailVerified=false, plan=paid trial 30d) + sessionStorage welcome
  → Welcome screen 4s ("Tu cuenta está lista")
  → Tour ONBOARDING_FLOW (registrar 1er cliente)
  → "Primeros Pasos" 5 tareas (BLOQUEADAS hasta verificar correo):
       1 verificar correo · 2 agregar cliente · 3 configurar escalera
       · 4 conseguir 1er referido · 5 poner link de agenda
  → Dashboard (/admin) — TODO en ceros hasta que el asesor haga el trabajo
```
Cada pantalla, qué pide / qué valor da: **Landing** (no pide nada / explica el modelo) → **Registro** (name+email+password / cuenta + trial) → **Welcome** (nada / celebración vacía) → **Tour+Tareas** (verifica, agrega cliente, tiers, referido, agenda / valor **diferido** tras el trabajo) → **Dashboard** (nada / ceros + proyección). Pasos "antes de valor": 5 tareas manuales.

## 2. Problems (los diagnósticos duros)
1. **Cero personalización.** El onboarding **no captura NADA** de negocio (productos, tamaño de cartera, cómo consigue referidos). `companyName` se guarda pero no personaliza nada; `ref` solo es atribución. → se siente **SaaS genérico**, no "hecho para asesores".
2. **Trabajo antes que valor.** El dashboard son ceros hasta completar 5 tareas manuales. El "aha" (un referido real) está a muchos pasos.
3. **Cartera NO persistente (riesgo Mailchimp).** `Client` **no tiene dedupe**: sin unique en email/phone, `normalizePhone` existe pero **no se usa**, reimportar el mismo CSV **crea filas duplicadas**. La metáfora actual invita a "crear campaña → seleccionar → enviar → repetir".
4. **Duplicación de concepto.** "Agregar primer cliente" aparece en **≥5 lugares** (tour, tarea #2, empty state, "agrégate a ti mismo", y el nuevo CTA "Activar mi cartera"). "Primeros Pasos" vive duplicado (chip + card).
5. **Empty dashboard.** `AdminOverviewClient` muestra puros ceros + proyección para cuenta nueva.
6. **Pantallas sobrecargadas / genéricas.** `/admin/niveles` mezcla escalera + 3 editores de mensaje + link de agenda; el top-bar tiene buscador y campana **no funcionales**.
7. **Verificación de correo bloquea todo** (tareas 2–5) — fricción alta antes de cualquier valor.

## 3. New mental model
> **Actual (equivocado):** "Estoy creando una cuenta SaaS y configurando campañas de correo."
> **Correcto:** "Conecto mi cartera **una vez** y Referidoo convierte esa cartera en un **canal permanente** de referidos."

La cartera es un **activo persistente**. Las **activaciones** apuntan a Clients ya existentes; un Client **nunca** se reimporta. El asesor no piensa en "campañas" — piensa en **su cartera** y en **activarla**.

**Error principal de modelo mental (respuesta 1):** tratar el onboarding como *"da de alta una cuenta y haz una checklist de tareas"* y la cartera como *"una tabla de Clients que agregas/importas por cada campaña"* (Mailchimp). Lo correcto es *"conecta tu activo existente una vez; Referidoo lo activa y lo mantiene produciendo referidos"*.

## 4. Persistent portfolio model (qué significa TÉCNICAMENTE)
Hoy `Client` = `id/referralCode/accessToken` (todos aleatorios/cuid), `name` req, `email?/phone?`, `active`, **sin `updatedAt`, sin dedupe**. `CampaignRecipient` ya referencia `clientId` con `@@unique([campaignId, clientId])` → **un Client YA puede estar en N activaciones sin duplicarse** (ese lado está bien).

"Import once" es **verdad de producto** con estos cambios (Phase A, NO ahora):
- **Identity key por asesor:** `normalizePhone(phone)` (últimos 10 dígitos) como clave primaria de dedupe; `lower(email)` como secundaria cuando no hay teléfono.
- **Upsert en create/import:** buscar Client existente del asesor por phone-normalizado (luego email); si existe → **actualizar** (merge de campos) **conservando `referralCode`/`accessToken`** (para que links/portales existentes sobrevivan); si no → crear. Nunca duplicar.
- **`updatedAt` en Client** (hoy ausente) para rastrear cambios.
- **No** hard-unique en DB (teléfonos pueden ser null o repetirse en edge cases y romper imports); dedupe **a nivel app** + índice no único; documentado.
- Resultado: reimportar el mismo CSV **actualiza en sitio**; la cartera es un activo que crece/se corrige, no se re-crea.

## 5. Google Auth feasibility → **MEDIUM**
Auth actual: JWT **HS256 self-issued**, cookie `advisor_token` 30d, bcrypt, `getAdvisorSession`/`signToken`/`setAdvisorCookie`, owner por `PLATFORM_OWNER_EMAIL`. **No hay NextAuth/Auth.js.** `Advisor.password` es **NOT NULL**.

Diseño (conserva nuestra sesión, sin reescribir):
```
Google (OIDC) valida identidad → id_token (email + name, email_verified)
  → findOrCreate Advisor por email
  → mint MISMO signToken + setAdvisorCookie (nuestra sesión de siempre)
```
- **Provider:** Google OAuth 2.0 / OpenID Connect. Hand-rolled callback (pequeño) en vez de adoptar NextAuth entero — encaja con el JWT propio. Rutas nuevas: `/api/auth/google/start` (redirect) y `/api/auth/google/callback` (verifica id_token, findOrCreate, cookie).
- **Schema:** `Advisor.password` → **nullable** (o hash aleatorio inutilizable) para cuentas Google-first; opcional `authProvider`/`googleId`. `emailVerified = true` (Google ya lo verificó).
- **Account linking:** Advisor con mismo email (creado con password) → **es el mismo advisor** (email es la clave) → se loguea. Google-first sin password → login por password no funciona hasta que ponga una (o queda Google-only). **Owner** sin cambios (`isPlatformOwner` por email, da igual el provider). **Logout** sin cambios (`clearAdvisorCookie`).
- **Env vars (NOMBRES):** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, redirect URI (deriva de `NEXT_PUBLIC_BASE_URL`).
- **Por qué MEDIUM (no EASY/HARD):** EASY sería si ya hubiera NextAuth (no lo hay) o si password fuera nullable (no lo es). HARD sería si la sesión dependiera de un provider externo (no — es self-issued, así que reusamos `signToken`). Es MEDIUM: 1 cambio de schema (password nullable + provider), 2 rutas, 2 env vars, cero cambios a la sesión. **Riesgos:** confiar en `email_verified` de Google; colisión de linking (dos cuentas mismo email); manejar el caso "Google-first sin password intenta login por password".

## 6. Onboarding V2 (≤8 pasos, ACTIVACIÓN no educación)
1. **Landing → Continuar con Google** (o email). *(auth simple)*
2. **3 preguntas de negocio** (productos · tamaño de cartera · cómo llegan tus referidos hoy). *(progressive profiling, personaliza de verdad)*
3. **Momento "ya tienes el activo"** (framing según el tamaño de cartera).
4. **Conecta tu cartera** (CSV / manual / detecta los que ya existen). *(la acción de activación más importante)*
5. **Premios: default recomendado editable** (no configurar desde cero).
6. **Preview del cliente** (el asesor se ve a sí mismo como cliente: mensaje + portal reales). *(trust)*
7. **"Tu motor está listo"** (resumen con personalización real: productos, N clientes, premios, canal, portal listo).
8. **Primera activación** ("Activar mis primeros N clientes" — N sugerido, editable) → dashboard **con valor ya creado**.

Detalle pantalla-por-pantalla en `10-ONBOARDING-V2-WIREFRAME.md`.

## 7. Existing advisor recovery flow (Ceci)
Un asesor ya registrado (Ceci, ~4 clients, conoce Referidoo) **NO repite signup**. Entra a **"Completa tu configuración"**:
```
"Ya tienes 4 clientes conectados." → "Agrega el resto de tu cartera" (import)
  → (perfil de negocio solo si falta; inferir lo posible: productos de sus tiers/referidos)
  → revisar sistema → primera activación
```
No preguntar lo que ya se puede inferir o que no aporta. La diferencia con el asesor nuevo: **arranca desde su cartera existente**, no desde cero.

## 8. First activation (culminación)
No es "ir al dashboard". Es:
> **Tu motor de referidos está listo.** Cartera: N conectados · Portales: N listos · Primera activación: lista.
> CTA: **"Activar mis primeros [sugerido] clientes"**

- **Tamaño sugerido (NO hardcodear 30):** deriva de la cartera — `<25` → todos; `25–100` → ~30; `100+` → ~30–50. Empezar chico **para afinar el mensaje** antes de mandarlo a toda la cartera.
- **Control del asesor:** él ajusta el número y la selección; se explica el porqué ("prueba con un grupo, mide, luego escala").

## 9. Dashboard IA (¿qué hace mi cartera por mí?)
Jerarquía (información, no funnel 1:1 — semántica honesta):
```
Cartera total
 → Clientes activados          (recibieron su activación)
 → Portales abiertos           (únicos)
 → Clientes que compartieron   (clic, NO envío comprobado)
 → Referidores productivos     (≥1 referido)
 → Oportunidades               (referidos/leads)
 → Ventas
```
Notas de honestidad: *landing views ≠ personas únicas*; *share click ≠ entrega*; opens/shares/productive = únicos, landing/form = brutos. **Solo IA, no build.**

## 10. Campaign → Activation language
| Technical term | Current UI | Proposed user term | Rationale |
|---|---|---|---|
| `ReferralCampaign` | "Campaña" | **Activación** | El asesor "activa" una parte de su cartera; no manda "campañas de correo" |
| `CampaignRecipient` | (interno) | **Cliente activado** / referidor | Es un cliente de su cartera al que se activó |
| "Crear campaña" (wizard) | botón/flow | **Activar mi cartera / Activar clientes** | Centra el activo, no la herramienta |
| "Campañas" (nav) | pestaña | **Activaciones** (o dentro de "Cartera") | Historial de activaciones, no un módulo de marketing |
| "Campaign Results" | página `[id]` | **Resultados de la activación** | — |
| productive referrer | métrica | **Referidor productivo** | Ya es el término correcto |
| referral | "Referido" | **Oportunidad** (lead) / Referido | "Oportunidad" en el dashboard de valor |

**Interno se queda `ReferralCampaign`/`CampaignRecipient`** (no romper backend/tests); solo cambia lo que ve el usuario.

## 11. Trust moments (just-in-time, cruzado con `03-TRUST-AUDIT.md`)
Solo afirmaciones **verificables**:
- **Antes de importar:** "Tu cartera sigue siendo tuya. Solo tú la ves — no la vendemos ni la compartimos." *(cierto: aislamiento por advisorId)*
- **Antes de activar:** "Tú decides quién recibe cada activación." *(cierto: el asesor selecciona)*
- **CLABE (si aparece):** "Referidoo no mueve dinero. Tú le pagas a tu cliente por fuera; nosotros solo llevamos la cuenta." *(cierto)*
- **"¿Referidoo contacta a mis clientes?":** Email → "Referidoo manda el correo con tu link, de tu parte." WhatsApp → "Los mandas tú, desde tu WhatsApp." *(cierto por canal)*
- **Owner:** ser honesto sobre qué ve Patrick (de `03`: BEFORE CECI = explicarlo). No prometer cifrado at-rest ni certificaciones (ya corregido en el copy público).

## 12. Data capture (qué guardar)
| Dato (pregunta) | Decisión | Por qué |
|---|---|---|
| Productos (Vida/PPR/ambos) | **DB** (`AdvisorSettings.products` o similar) | Personaliza superficies de producto (interests, copy) — REAL |
| Tamaño de cartera (bucket) | **ProductEvent** (señal de onboarding), NO campo permanente | El conteo real de clientes lo supera tras importar; útil para el framing + benchmark del owner |
| Cómo llegan referidos hoy | **DB** (default de canal en `AdvisorSettings`) | Decide canal inicial (WhatsApp assisted vs email) — REAL |
| Preferencia de canal | **derivada** de la anterior | No preguntar dos veces |
| `companyName` (ya existe) | se queda; hoy no personaliza | Podría usarse en el portal/landing (mejora futura) |
**Regla:** no pedir nada que no cambie la experiencia. Mínimo schema nuevo: `products` + `defaultChannel` (en AdvisorSettings) + eventos.

## 13. Product IA
- **Merge:** `Clientes` + `Campañas` → **Cartera** (con "Activaciones" como historial dentro). `Referidos` → **Oportunidades**.
- **Pestañas (activado):** Resumen · **Cartera** · **Oportunidades** · Premios · (Perfil secundario). **Activaciones** = sección dentro de Cartera, no pestaña que compite.
- **Usuario nuevo ve:** Cartera como héroe (conectar + activar).
- **Usuario activado ve:** Resumen ("¿qué hace mi cartera?") primero.
- **Secundario:** Premios, Perfil. **Quitar** buscador/campana no funcionales del top-bar.

## 14. Behavioral onboarding principles (sin dark patterns)
| Principio | Cómo aplica | Beneficio | Riesgo | Cómo evitar manipulación |
|---|---|---|---|---|
| Activation onboarding | Onboarding termina en una activación real, no en un tour | TTV corto | Empujar a activar cartera sin querer | El asesor elige a quién; preview antes |
| Progressive profiling | 3 preguntas que **sí** personalizan | Relevancia sin fricción | Pedir de más | Regla: solo lo que cambia el producto |
| Commitment & consistency | Responde productos/cartera → coherente que la conecte | Continuidad natural | Coacción | Todo skippable; sin castigo |
| Endowed progress | "Ya tienes 4 clientes conectados" (progreso inicial real) | Motivación a completar | Progreso falso | Solo mostrar progreso **real** (clientes reales) |
| Time-to-value | Valor (portales listos) visible en minutos | Retención temprana | Prometer valor no entregado | El valor mostrado debe existir (portales reales) |
| Perceived customization | "Tu motor: Vida+PPR, 86 clientes, WhatsApp" | "Hecho para mí" | Personalización cosmética/falsa | Solo reflejar config real |
| Perceived exclusivity | "Acceso anticipado · para asesores de Vida y PPR" | Sentido de acceso especial | Fake scarcity | **Solo si es factual** (lo es hoy); nada de countdowns/"quedan 3" |
| Setup completion | Barra "Tu configuración: 3/4" | Cierre de gestalt | Presión | Sin penalización; puede seguir después |
| Sunk effort / investment | Importó cartera + configuró premios → invertido | Menos churn | Explotar la inversión | La inversión produce valor real (referidos), no solo lock-in |

## 15. Trust (resumen)
Just-in-time, no FAQ gigante. Ubicaciones exactas en `10`. Todo cruzado con `03-TRUST-AUDIT.md`: los gaps "BEFORE CECI" (explicar acceso del owner, copy CLABE veraz — ya hecho) se cubren con micro-copy en el punto de fricción; los "BEFORE NEXT ADVISOR" (backup con PII, token del portal) **no** bloquean a Ceci pero se documentan.

## 16. Measurement plan
Eventos de onboarding (extienden `ProductEvent`, **sin modelo nuevo**): `signup_started`, `auth_completed`, `business_profile_completed`, `portfolio_import_started`, `portfolio_import_completed`, `reward_setup_completed`, `preview_viewed`, `first_activation_created`, `first_activation_started`. **Milestones de activación:** signup → **cartera conectada** → **first activation** → first portal open → productive referrer → referral. Se miden con lo que ya existe (ProductEvent + campaign attribution).

## 17. Technical implications
- **Portfolio persistence:** app-level upsert por `(advisorId, normalizedPhone|email)` + `updatedAt` en Client (Phase A). Sin hard-unique.
- **Google:** `Advisor.password` nullable + `authProvider?` + 2 rutas + 2 env vars; reusa `signToken`.
- **Business profile:** `products` + `defaultChannel` en `AdvisorSettings`; portfolio-size como evento.
- **Reframe:** solo copy/routing/nav; backend de campaigns intacto (ver Parte 20).
- **Onboarding V2:** nuevo flujo `/registro`/`/bienvenida` que reusa import, tiers defaults, portal preview, y crea la primera activación con las APIs de campaigns existentes.
- **Migraciones (cuando se aprueben):** estilo Turso `add-*.ts`, aditivas; corridas por Patrick en prod.

## 18. Risks
- **Dedupe app-level** puede fallar si el teléfono varía (formato) — mitigado con `normalizePhone`; documentar edge cases (mismo email, teléfonos distintos → ¿merge o dos clientes? decisión: match por email si no hay match por teléfono, pero avisar en el preview de import).
- **Google `email_verified`**: confiar solo si Google lo marca true.
- **Reframe** puede confundir a usuarios existentes (Campañas→Activaciones) — migrar wording con cuidado.
- **Onboarding V2** más largo que el actual si no se controla — límite duro ≤8 bloques.
- **Preview del cliente** debe ser real (no mock) o rompe la confianza que busca generar.

## 19. Open questions (requieren decisión de Patrick / evidencia)
- ¿`products` y `defaultChannel` viven en `AdvisorSettings` o en `Advisor`?
- Dedupe: cuando email igual y teléfono distinto → ¿merge o dos clientes? (propuesta: match por teléfono primero; si solo coincide email, preguntar/avisar).
- ¿Google-only o siempre ofrecer también email/password? (propuesta: ambos; Google primario).
- ¿"Activaciones" es pestaña o subsección de Cartera? (propuesta: subsección).
- Tamaño de la primera activación: ¿regla fija por bucket o el asesor decide siempre? (propuesta: sugerencia + control).
- ¿Verificación de correo sigue bloqueando el envío por email? (propuesta: sí para email; WhatsApp assisted no lo necesita).

## 20. Keep / Refactor / Kill (Portfolio Campaigns V1)
| Parte | Veredicto | Nota |
|---|---|---|
| `ReferralCampaign` (modelo) | **KEEP AS-IS** | Es la "activación" internamente |
| `CampaignRecipient` (modelo) | **KEEP AS-IS** | Ya referencia clientId con unique; base de "cartera persistente en N activaciones" |
| `?cr` attribution | **KEEP AS-IS** | Server-side, testeado; núcleo del diagnóstico |
| campaign metrics | **KEEP AS-IS** | Productive Referrer Rate / Lead Yield / Multiplier |
| Email transport | **KEEP AS-IS** | Resend real, idempotente |
| WhatsApp assisted | **KEEP AS-IS** | Honesto; API oficial diferida |
| owner campaigns | **KEEP AS-IS** (relabel) | Tabla + drilldown; solo ajustar labels a "activaciones" |
| advisor campaign pages | **KEEP BACKEND / CHANGE UX** | Resultados/lista se reencuadran como "activación" dentro de Cartera |
| wizard `/campanas/nueva` | **REFACTOR** | Se convierte en el flujo "Activar mi cartera" (y en el paso 8 del onboarding) |
| copy ("campaña") | **REFACTOR** | → "activación" en toda la UI |
| nav "Campañas" | **REFACTOR/KILL como pestaña** | Se fusiona en "Cartera" (+ Activaciones como historial) |
| tests | **KEEP AS-IS** | 213 verdes; renombrar solo si cambia API pública |
**Nada se mata a nivel de modelo/backend — no se pierde trabajo útil por cambiar wording.**

## 21. Recommended implementation order (evaluado, no aceptado automáticamente)
El orden propuesto (A persistence → B auth → C onboarding → D rename → E dashboard) lo **ajusto**:

1. **Phase A — Portfolio persistence/dedupe** (upsert en import/create, `updatedAt`, identity key). **PRIMERO**: hace verdad "importa una vez", y **Ceci va a importar su cartera pronto** → sin esto duplicaría. Es la base del modelo mental nuevo.
2. **Phase B — Language/IA reframe** (campaña→activación, fusionar nav Cartera/Activaciones, quitar buscador/campana muertos). **Barato, alto leverage, sin schema** — se puede hacer casi en paralelo con A.
3. **Phase C — Recovery flow del asesor existente** ("Completa tu configuración" para Ceci) + **business-profile** (3 preguntas + schema mínimo). Antes que el onboarding nuevo completo, porque Ceci ya existe y es el experimento inmediato.
4. **Phase D — Onboarding V2 completo** (asesor nuevo: profile → conectar cartera → premios default → preview → primera activación). Depende de A y del business-profile de C.
5. **Phase E — Google Auth** (MEDIUM, independiente). Se puede hacer en cualquier momento tras B; no bloquea nada. Ponerla aquí para no retrasar lo de Ceci.
6. **Phase F — Dashboard hierarchy** (¿qué hace mi cartera por mí?). Al final; reencuadre de `AdminOverviewClient` sobre datos que ya existen.

**Diferencia clave con el orden propuesto:** subí "recovery flow de Ceci" (parte de C) por delante del onboarding nuevo completo, porque el experimento con Ceci es lo inmediato y ella no necesita el signup nuevo; y bajé Google (D→E) porque es independiente y no debe bloquear la activación de Ceci.

---

**Sin código. Sin schema. Sin push. Sin migraciones. Solo análisis + diseño, para tu aprobación.**
