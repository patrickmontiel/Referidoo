# 01 · Producto y Journeys — mapa de superficies + recorridos de punta a punta

> Verificado contra código (`[CV]` = código verificado, `[INF]` = inferencia). Rutas relativas a la raíz del repo. Screenshots en `screenshots/`.

## Índice de superficies
Landing · Registro/Login/Verificación · Onboarding · Dashboard `/admin` · Clientes · Referidos/pipeline · Conversión · Premios/niveles · Perfil/billing · Portal cliente `/c/[token]` · Landing referido `/r/[code]` · Loop asesor→asesor `/unete/[slug]` · Owner (ver `02`).

---

## 1. Landing pública `/` (`src/app/page.tsx`) — Server Component
- **Para quién:** visitante no logueado. `if (session) redirect("/admin")` (`page.tsx:126-127`) → un asesor logueado nunca ve la landing. `[CV]`
- **Trabajo:** convencer al asesor de registrarse (gratis).
- **Secciones:** banner "acceso anticipado" (:134); hero + CTAs `/registro` "Crear cuenta gratis" (:152) y `/login` (:155); `HeroDemo` (:172); 3 pasos → `/como-funciona`; escalera de premios (siempre visible :249); **premios burbuja gated por `SHOW_BUBBLE_REWARDS`** (:276, oculto); `BolaDeNieveCard` proyección (:325); mock del portal (:375); FAQ (11 items, :485); **pricing `#precios`** (:502) Freemium vs Pro `/registro?plan=pro`. `[CV]`
- **Free vs Pro (marketing):** Freemium = "Clientes ilimitados · Hasta 5 leads · Escalera PPR/Vida · Portal", 0.25%; Pro = $539/mes, 30 días gratis, leads ilimitados, 0.15%; bullet "Premios Burbuja" oculto por flag. Sin APIs (todo SSR). `[CV]`
- **Callejones sin salida `[CV]`:** `LandingHeader.tsx:29` — nav (incl. login/registro) en `hidden sm:flex` **sin hamburguesa** → en móvil <640px **no hay acceso a login/registro desde el header**. `LandingFooter.tsx` — anclas rotas `#paso-3`/`#paso-4` (no existen; IDs reales son `#asesor/#cliente/#referido`); teléfono WhatsApp personal de Patrick hardcodeado (:4). Código muerto: `landing/ReferralMath.tsx` no se importa.
- **Estáticas:** `/como-funciona` (IDs `#asesor/#cliente/#referido`, burbuja gated); `/terminos` ($539, "hasta 5 leads", MP); `/aviso-de-privacidad` (dice "nunca pedimos cuentas bancarias" — **contradicción**, el portal sí pide CLABE).
- Screenshot: `01-landing.png`, `03-como-funciona.png`.

## 2. Registro / Login / Verificación
- **`/registro`** (`registro/page.tsx`, client): lee `?ref` y `?plan=pro`; POST `/api/auth/register`; éxito → `sessionStorage["referidoo_welcome"]="1"` + redirect `/admin` (o `/admin/perfil?upgrade=pro`). Password minLength 8. `[CV]` · Screenshot `02-registro.png`.
- **`POST /api/auth/register`** `[CV]`: email existente no-borrado → 409; email soft-deleted → renombra `_baja_{id}_{email}`; crea `Advisor` con **`plan:"paid"`, `paidUntil=now+30d`, `emailVerified:false`, `verificationToken`**; si `ref` → `PlanEvent "unete:{slug}"`; email de verificación fire-and-forget (un fallo NO bloquea el 201); firma JWT + cookie (**auto-login**). **Sin rate-limiting.**
- **`/login`**: **[RIESGO]** precarga password desde query `?p=` en texto plano (`login/page.tsx:24-26`). POST `/api/auth/login`; `isOwner` → `/owner`, si no `/admin`. Sin "olvidé contraseña" ni link a registro. `[CV]`
- **`POST /api/auth/login`**: mismo error para user inexistente/password malo (bien); **no valida `deletedAt` ni `emailVerified`**; **sin rate-limiting/lockout**. `[CV]`
- **`POST /api/auth/refresh`**: recalcula `billingStatus` ∈ {paid, trial, trial_expired, freemium}; valida `deletedAt`. `[CV]`
- **`/api/auth/verify-email`** (GET que muta estado): éxito → `emailVerified:true`, `verificationToken:null`, `setAdvisorCookie` (auto-login cross-device). `/correo-verificado` usa `BroadcastChannel` + `localStorage` para avisar a otras pestañas. `/verificar` usa `useSearchParams` sin `<Suspense>` `[INF]` (posible warning de prerender). `[CV]`

## 3. Onboarding del asesor (`AdminLayoutShell.tsx` — el motor real; `src/components/Tour.tsx` NO se usa)
- **Welcome screen** (:583): Strict-Mode-safe (useRef, sin cleanup por diseño); lee `sessionStorage["referidoo_welcome"]`; fade 3.2s→4s; luego `ONBOARDING_FLOW` si `!onboardedAt`. `[CV]`
- **Tour engine**: flows `CLIENT_STEPS`, `TIERS_STEPS` (paso burbuja gated), `ONBOARDING_FLOW`. `goStep` reintenta el target 14×150ms antes de saltar; sella `onboardedAt` vía `POST /api/advisor/onboarded` solo si el flow arrancó con seal (reabrir con "?" no sella). `[CV]`
- **Primeros Pasos — 5 tareas** (`GET /api/advisor/onboarding-tasks`), todas bloqueadas hasta verificar correo: `[CV]`

| # | Tarea | done si… |
|---|---|---|
| 1 | Verifica tu correo | `emailVerified` |
| 2 | Agrega tu primer cliente | `client.count>0` (**cuenta inactivos**) |
| 3 | Configura tu escalera | `rewardTier.count>0` |
| 4 | Consigue tu primer referido | `referral.count(deletedAt:null)>0` |
| 5 | Pon tu link de agenda | `!!settings.schedulingUrl` |

5/5 → confetti "¡Todo listo!". Chip↔card sync por evento `referidoo:tasks-updated`.

## 4. Dashboard `/admin` (`AdminOverviewClient.tsx`) — screenshot `04-admin-resumen.png`
- SSR: advisor, referrals (`deletedAt:null`), `client.count(active:true)`. `[CV]`
- Stats (Referidos/Clientes/Convertidos/Pendientes); card negra Premios pagados/por pagar; **LeadFestejo** (celebra leads nuevos vs `localStorage`, idempotente); **BolaDeNieveCard** (proyección client-side, close rate 0.26 hardcoded); referidos recientes (empty: "Aún no te cae ningún referido"); **tarjeta freemium** (comisión freemium vs pro − $539, si ≥1 conversión); **link de invitación** `referidoo.com/unete/{slug}`. `[CV]`

## 5. Clientes `/admin/clientes` (`ClientesClient.tsx`) — screenshot `05-admin-clientes.png`
- **Agregar cliente**: requiere name+phone+**email** (client-side); `POST /api/clients` — gate `canAdvisorAddClients` = **solo `emailVerified`** (403 si no); genera `referralCode`+`accessToken`; **NO envía ningún email/portal**. Clientes **ilimitados** en freemium. `[CV]`
- **Handoff `justCreated`** (:505): card negra "Mándale su link ahora" → WhatsApp con `DEFAULT_ADVISOR_INVITE_MESSAGE`, link `/c/{accessToken}`. `[CV]`
- **"Agrégate a ti mismo"**: prefill con datos del asesor; empty state "Pruébalo contigo primero"; botón "Ya lo entendí, ahora con un cliente real". `[CV]`
- **Import CSV** (`/api/clients/import`, chunks de 20, gate = email verificado). **Enviar link a todos (PRO)**: gate cliente + servidor (`send-links` 403 si no Pro); solo a clientes **con email**; marca `PlanEvent linksent:{id}`. `[CV]`
- **Pagar premio / CLABE**: `computeOwed` (premios aprobados + bubbleClaims); muestra CLABE si el cliente la capturó; `pay-rewards` marca `paid` (registro, **no es rail de pago**). `[CV]`
- **Gap `[CV/INF]`**: `GET /api/admin/clients-data` omite `linkSent`, `advisor.email`, `advisor.plan` → tras un `load()` in-place se degradan el gate Pro y el banner self-test.

## 6. Referidos / pipeline `/admin/referidos` (`ReferidosClient.tsx`) — screenshot `06-admin-referidos.png`
- Refresca vía `GET /api/referrals`. Filtros Todos/Nuevos/En proceso/Convertidos/Rechazados. `[CV]`
- **Leads bloqueados (freemium)**: `FREEMIUM_LEAD_LIMIT=5` **hardcodeado en cliente** (`:414`, duplica `lib/plan.ts:3`); ordena por `createdAt` asc, bloquea los **excedentes más nuevos** (`.slice(5)`), blur escalonado 3/6/10px, overlay "Lead bloqueado · Actualiza a Pro". `[CV]`
- **Paywall banner** (:459): solo si `freemium && lockedCount>0` → CTA `/admin/perfil?upgrade=pro`. `[CV]`
- **Drawer de detalle**: contacto, edición inline de `saleAmount`, verificación de carátula, interés del lead editable (solo contacted/in_process, desde `VISIBLE_PRODUCT_TYPES`), sugerir mensaje IA, delete bloqueado si approved/paid/billedAt. `[CV]`
- **Bug menor `[CV]`:** `load()` sin `.catch` → un fallo de red deja el spinner colgado.

## 7. Conversión ("Marcar como convertido")
- **Upload carátula** → `POST /api/referrals/caratula` (Vercel Blob; 503 si no configurado; el `<input accept>` omite PDF). **Lectura IA** → `read-caratula` (gpt-4o-mini visión; rechaza PDF y >15MB → null). `[CV]`
- **Candado**: si la IA leyó `prima`, el monto es `readOnly`; si `caratulaRequired && !prima` → **bloquea la conversión**; si `unavailable`, permite captura manual (cola del owner). `[CV]`
- **`PATCH /api/referrals/[id]`** `[CV]`: sin `saleAmount` → 400; con Blob y sin carátula → 400. Escribe `status:converted`, `rewardStatus:approved`, `saleAmount`, `productType`, `tierPosition`, `rewardAmount`, `lessioCommission`, `caratulaStatus:pendiente`, `contactedAt`. Nivel/premio solo Vida/PPR; comisión según plan; launch bonus (+$1000); `grantUneteRewardsIfFirstConversion`; antifraude en `after()`; email al asesor. Ver `04`.

## 8. Premios / niveles `/admin/niveles` (titulado "Premios") — screenshot `07-admin-niveles.png`
- Escalera default `[1500,1500,3500 "¡Bono especial!"]`; add/remove tiers; "después del último" cycle/stop/flat; `PUT /api/tiers` (deleteMany + createMany). `[CV]`
- **Burbuja gated** (`SHOW_BUBBLE_REWARDS`, no se renderiza la config), **pero** el fetch `/api/bubble-settings` y las **claims históricas NO están gated** — se mostrarían si existieran datos. `[CV]`
- Link de agenda (`schedulingUrl`); 3 mensajes personalizados (welcome/invite/whatsapp). `[CV]`

## 9. Perfil `/admin/perfil` (`PerfilClient.tsx`) — screenshot `08-admin-perfil.png`
- Plan display: Free ("hasta 5 leads"), Trial (badge N días), Paid ("$539/mes · próximo cobro"). **Data row muestra "Leads {n}/12"** (`:224`) — **contradice el cap real de 5**. `[CV]`
- **Upgrade (`UpgradeCardForm`)**: MercadoPago SDK React; campos hosted; `createCardToken` (PAN nunca toca el backend); POST `/api/billing/subscribe {cardTokenId}`. Cancel: `/api/billing/cancel` no toca plan/paidUntil (cron degrada al expirar). **Dead-end**: `handleCancel` en éxito solo cierra el confirm, no refresca → sigue viendo "Activo". `[CV]`
- **Credibilidad**: cédula/años/personas → `PUT /api/advisor/credibility` (lo consume `/r/[code]`). **Comisiones pendientes** (si !trial): total = `$539 + pendingCommissionTotal`. `[CV]`

## 10. Portal del cliente `/c/[token]` (`ClientPortalPage.tsx`, SIN login) — screenshot `09-portal-cliente.png`
- Acceso = poseer el `accessToken`. `GET /api/portal/[token]` (404 si `!active`); polling 30s. `[CV]`
- Ve: saludo, tabs Inicio/Mis Referidos, **Bono de inicio** (7 días → +$1000 si invita 3), premios pendientes de confirmar, saldos, escalera, **CLABE**, **enlace personal + WhatsApp**. Tour en 1ª visita. `[CV]`
- **Burbuja OCULTA** por flag (tour, card, badge). El endpoint `claim-bubble` sigue vivo pero inalcanzable desde UI. `[CV]`
- **Compartir**: link es **`/r/{referralCode}`** (no el portal). **CLABE**: valida `^\d{18}$`; `POST /api/portal/[token]/clabe`. **Confirmar recepción**: `POST /api/portal/[token]/confirm` → `confirmedByReferrer` + email al asesor. `[CV]`
- **Inconsistencia `[CV]`:** `claim-bubble/route.ts:13` valida solo `!client` (no `active`) — un cliente inactivo podría reclamar burbuja vía API directa (impacto nulo hoy por el flag).

## 11. Landing del referido `/r/[code]` (`ReferralLandingPage.tsx`) — screenshot `10-referido-landing.png`
- SSR `getReferralInfo(code)` (null si `!active`). Muestra "{firstName} pensó en ti", card de recomendación, **card de credibilidad** (cédula/años/personas) solo si el asesor las capturó. `[CV]`
- **Form**: requeridos name/phone/email; opcionales interés (**PPR/Vida/"Aún no sé"** — Auto/GMM ocultos por flag), días/horas. **`POST /api/referrals`** (público): dedup por teléfono (409); crea `Referral`; **el referral SIEMPRE se crea** aunque el asesor freemium haya topado 5 (solo cambia que al asesor le llega email de upgrade en vez del lead). `[CV]`
- **Éxito**: si `schedulingUrl` → botón agenda prellenado; si no, "te va a escribir por WhatsApp". `[CV]`

## 12. Loop asesor→asesor `/unete/[slug]`
- Server Component: match `nameToSlug(advisor.name)===slug`; sin inviter → `redirect("/registro")`. CTA `/registro?ref={slug}`. Atribución vía `PlanEvent "unete:{slug}"`. `[CV]`
- **Doble recompensa** (`lib/unete.ts`): en la **1ª** conversión del invitado → 30 días Pro para invitado (`unete_reward_self`) y reclutador (`unete_reward:{id}`), idempotente; sube freemium a Pro sin suscripción MP. Email a ambos. `[CV]`
- **Dead-end `[INF]`:** si el reclutador cambia su nombre, el slug deja de matchear y su premio **se pierde en silencio** (el del invitado sí se paga).

---

# Journeys de punta a punta

## Journey A — Asesor nuevo (registro → cobro)
1. `/` → `/registro` (o `/unete/{slug}` → `/registro?ref={slug}`).
2. **Registro** → crea `Advisor` trial (`paid` + `paidUntil=+30d`, `emailVerified:false`); auto-login; `sessionStorage welcome`; → `/admin`.
3. **Onboarding**: welcome 4s → tour de primer cliente; Primeros Pasos (5 tareas) **bloqueadas hasta verificar correo**. Gate: no se pueden crear clientes sin email verificado.
4. **Primer cliente** → `POST /api/clients` (crea `Client`; **no envía nada**). Banner "Mándale su link ahora" (WhatsApp manual).
5. **Escalera** → `PUT /api/tiers`. Link de agenda opcional.
6. **Primer referido**: alguien llena `/r/{code}` → `POST /api/referrals` (pending) → email al asesor; LeadFestejo.
7. **Contactar** → PATCH status `contacted` (sella `contactedAt`).
8. **Convertir** → carátula + IA + `PATCH /api/referrals/[id]` (converted/approved, calcula premio + comisión + antifraude).
9. **Pago del premio** → `pay-rewards` (registro de estado, **no rail**); email al cliente.
10. **Comisión** → `lessioCommission` (billedAt:null) se acumula; cron `billing-commission` la suma al próximo cobro MP.

**Dónde se detiene el loop (Journey A):** paso 4→siguiente depende de que el asesor comparta el link manualmente; sin eso el cliente nunca activa.

## Journey B — Cliente referidor (ACTIVACIÓN DE DOS LADOS — lo más importante)
1. Asesor crea al cliente → **no se envía nada**; se genera `accessToken`+`referralCode`.
2. **⚠️ FUGA #1:** el cliente **NO recibe acceso automáticamente**. El asesor debe compartir `/c/{accessToken}` **manual por WhatsApp** (o, solo Pro, `send-links` por email a clientes con email). Cron `client-nudges` **apagado por default**. `[CV]`
3. Cliente abre `/c/{token}` (sin login); tour de bienvenida.
4. Entiende el premio (escalera Vida/PPR + bono de inicio 7 días).
5. **Comparte** por WhatsApp; el link es **`/r/{referralCode}`**.
6. Alguien llena el form → `POST /api/referrals` (entra al pipeline).
7. Progreso visible en el portal (polling 30s). Cuando el asesor paga → `paid`.
8. Cliente captura **CLABE** (necesaria para que el asesor deposite por fuera).
9. Cliente **confirma recepción** → email al asesor.

**Fricciones de dos lados (cada una una fuga):**
| Handoff | Estado |
|---|---|
| crear → recibir | **sin envío automático** (fuga mayor) |
| recibir → abrir | link de WhatsApp; sin recordatorios (cron apagado) |
| abrir → compartir | el hero de compartir solo aparece si `referrals.length===0`; único empuje = bono de inicio 7 días |
| compartir → llenar | form exige name/phone/email; si el asesor freemium topó 5 leads, el referido ve "Listo" pero el asesor **no recibe** el lead (solo Patrick) |

## Journey C — Referido (link → pipeline)
1. Recibe link `/r/{code}` (WhatsApp) → SSR instantáneo.
2. Ve **quién lo recomienda** + **credibilidad del asesor** (cédula/años/personas, si se capturaron).
3. Deja datos (name/phone/email req. + interés PPR/Vida/"Aún no sé" + días/horas) → `POST /api/referrals`.
4. Backend valida, dedup por teléfono, crea `Referral` (pending), email al asesor.
5. **Confirmación**: "Listo, {firstName}"; botón de agenda si hay `schedulingUrl`, si no "te va a escribir por WhatsApp".
6. El lead aparece en `/admin/referidos` como "Nuevo".
