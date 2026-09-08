# 07 · Features — estado real (matriz)

> "Existe en código" ≠ "se vende hoy". Estados: **CORE ACTUAL** (se vende y es el foco) · **ACTIVO SECUNDARIO** (funciona, apoyo) · **OCULTO/REVERSIBLE** (código intacto, oculto por flag) · **LEGACY** (existe, no es oferta, riesgo de drift) · **DISEÑADO NO CONSTRUIDO**. `[CV]` = verificado.

## Matriz principal

| Feature | Construida | Visible hoy | Activa en backend | En marketing | Estado |
|---|---|---|---|---|---|
| Loop de referidos (asesor→cliente→referido) | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Dashboard asesor `/admin` | ✅ | ✅ | ✅ | — | **CORE ACTUAL** |
| Clientes + agregar + "agrégate a ti mismo" | ✅ | ✅ | ✅ | — | **CORE ACTUAL** |
| Handoff "Mándale su link ahora" (justCreated) | ✅ | ✅ | ✅ | — | **CORE ACTUAL** |
| Pipeline de referidos + tope 5 leads + paywall banner | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Conversión + carátula obligatoria | ✅ | ✅ | ✅ | — | **CORE ACTUAL** |
| Escalera de premios (Vida/PPR) | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Portal del cliente `/c/[token]` | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Landing del referido `/r/[code]` + credibilidad | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Comisión Referidoo PPR/Vida (0.25%/0.15%) | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Billing Mercado Pago (subscribe/webhooks/cron) | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Trial 30 días → freemium | ✅ | ✅ | ✅ | ✅ | **CORE ACTUAL** |
| Owner dashboard `/owner` | ✅ | ✅ (solo owner) | ✅ | — | **CORE ACTUAL** (interno) |
| IA carátula (lectura + antifraude) | ✅ | ✅ | ✅ | ✅ (PRODUCT.md) | **CORE ACTUAL** |
| Primeros Pasos + tour guiado | ✅ | ✅ | ✅ | — | **ACTIVO SECUNDARIO** |
| Verificación de correo cross-device | ✅ | ✅ | ✅ | — | **ACTIVO SECUNDARIO** |
| LeadFestejo / confetti | ✅ | ✅ | ✅ | — | **ACTIVO SECUNDARIO** |
| BolaDeNieveCard (proyección) | ✅ | ✅ | (client-side) | — | **ACTIVO SECUNDARIO** |
| IA mensaje sugerido al referido | ✅ | ✅ | ✅ | ✅ | **ACTIVO SECUNDARIO** |
| Link de agenda (Calendly/Cal/Google) | ✅ | ✅ | ✅ | — | **ACTIVO SECUNDARIO** |
| Envío masivo de link (Pro) | ✅ | ✅ (Pro) | ✅ | ✅ | **ACTIVO SECUNDARIO** |
| Import CSV de clientes | ✅ | ✅ | ✅ | — | **ACTIVO SECUNDARIO** |
| Loop asesor→asesor `/unete/[slug]` + doble premio | ✅ | ✅ | ✅ | parcial | **ACTIVO SECUNDARIO** |
| Briefing IA del owner | ✅ | ✅ (owner) | ✅ | — | **ACTIVO SECUNDARIO** (cache 14d) |
| CLABE + pagar premio (registro, no rail) | ✅ | ✅ | ✅ | — | **ACTIVO SECUNDARIO** |
| **Tipos Daños/Auto y GMM** (selección/marketing) | ✅ | ❌ | ✅ | ❌ | **OCULTO/REVERSIBLE** (`SHOW_NON_CORE_PRODUCTS`, `VISIBLE_PRODUCT_TYPES`) |
| **Sistema de premios burbuja** (UI asesor/cliente/landing) | ✅ | ❌ | ✅ | ❌ | **OCULTO/REVERSIBLE** (`SHOW_BUBBLE_REWARDS`) |
| Comisión Daños/Auto/GMM (1.5%/0.8%) | ✅ | ❌ | ✅ | ❌ | **OCULTO/REVERSIBLE** (tasas vivas, no seleccionables) |
| Emails burbuja (reclamo/pagado/lista/digest) | ✅ | ❌ (latente) | ✅ | — | **OCULTO/REVERSIBLE** |
| Recordatorios al cliente (client-nudges) | ✅ | ❌ | ✅ | — | **OCULTO** (flag `CLIENT_NUDGES_ENABLED` apagado) |
| `src/components/Tour.tsx` | ✅ | ❌ | ❌ | — | **LEGACY** (motor real está inline en AdminLayoutShell) |
| `landing/ReferralMath.tsx` | ✅ | ❌ | ❌ | — | **LEGACY** (no se importa — código muerto) |
| APIs owner `summary/breakdown/ranking/trends/problems` | ✅ | ❌ | parcial | — | **LEGACY** (no conectadas a UI actual `[INF]`) |
| APIs `admin/referidos-data`, `admin/home-data` | ✅ | ❌ | — | — | **LEGACY** (endpoints no consumidos `[INF]`) |
| Moat "IA de conversión" (aprender qué convierte) | ❌ | ❌ | ❌ | ✅ (docs) | **DISEÑADO NO CONSTRUIDO** |
| App móvil nativa / PWA (Fase 1) | ❌ | ❌ | ❌ | ✅ (NEGOCIO) | **DISEÑADO NO CONSTRUIDO** |
| B2B despachos por asiento (Fase 2) | ❌ | ❌ | ❌ | ✅ (NEGOCIO) | **DISEÑADO NO CONSTRUIDO** |
| API enterprise (Fase 3) | ❌ | ❌ | ❌ | ✅ (NEGOCIO) | **DISEÑADO NO CONSTRUIDO** |
| Instrumentación de funnel viral | ❌ | ❌ | ❌ | — | **NO CONSTRUIDO** (hueco crítico, ver `03`) |
| Rate-limiting en auth | ❌ | — | — | — | **NO CONSTRUIDO** (riesgo, ver `08`) |
| Reset de contraseña ("olvidé mi contraseña") | ❌ | ❌ | ❌ | — | **NO CONSTRUIDO** |

## Feature flags (`src/lib/product-visibility.ts`) `[CV]`
| Flag | Valor | Efecto |
|---|---|---|
| `SHOW_BUBBLE_REWARDS` | `false` | Oculta toda la UI de burbuja (asesor/cliente/landing/tour/emails de config) |
| `SHOW_NON_CORE_PRODUCTS` | `false` | Oculta filas de precios de Daños/Auto/GMM en la landing |
| `VISIBLE_PRODUCT_TYPES` | `["PPR","Vida","Otro"]` | Dropdowns de tipo de producto (convertir / interés) |
| `VISIBLE_INTERESTS` | PPR, Vida, "Aún no sé" | Selector de interés en `/r/[code]` |

Reactivar = poner los flags en `true` y devolver los tipos. Backend, `COMMISSION_RATES` y datos históricos **intactos** — NO es bug (`CLAUDE.md`).

## Nota clave
La **burbuja hoy no acumula puntos en la práctica**: aunque el backend está vivo, solo PPR/Vida/Otro son seleccionables, y de esos únicamente "Otro" daría puntos de burbuja — pero "Otro" no aparece como interés en la landing y la UI de burbuja está oculta. Es **código latente reversible**, no una feature en uso.
