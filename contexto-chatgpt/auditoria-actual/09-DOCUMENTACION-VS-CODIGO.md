# 09 · Documentación vs Código — contradicciones

> Regla: **si documentación y código se contradicen, manda el código** (salvo feature apagada por flag, que es intención). `[CV]` = verificado en código.

| # | Tema | Documento dice | Código actual dice | Verdad vigente | Evidencia |
|---|---|---|---|---|---|
| 1 | **Tope de leads freemium** | `NEGOCIO.md:23`: "Gratis hasta **2 clientes** activos" | `FREEMIUM_LEAD_LIMIT=5`; clientes **ilimitados** | **5 leads en pipeline; clientes ilimitados** | `lib/plan.ts:3`, `plan.test.ts:61` |
| 1b | Tope (inconsistencia interna) | Comentario `plan.ts:9-11` dice "**12** totales"; `PerfilClient.tsx:224` muestra al usuario "**Leads {n}/12**" | Constante real = **5**, aplicada en `api/referrals/route.ts:99` | **5** (el /12 en perfil es copy viejo — bug de UI) | `plan.ts:3`, `ReferidosClient.tsx:414`, `PerfilClient.tsx:224` |
| 2 | **Trial** | `NEGOCIO.md:31,137`: "Free trial **14 días**" | `TRIAL_MS = 30 días` | **30 días** | `register/route.ts:12`, `billing-downgrade/route.ts:6` |
| 3 | **Precio Pro** | `NEGOCIO.md:14`: $539 | `MONTHLY_PRICE_MXN=539` | **$539** ✔ coinciden | `mercadopago.ts:8` |
| 4 | **Comisión no-core** (Auto/GMM) | `NEGOCIO.md` Fase 1/2: "% sobre la **comisión del asesor**" (25%/10%) | Fase 0 cobra **% sobre la prima/monto reportado** (1.5%/0.8%) | **% sobre `saleAmount`** (el propio NEGOCIO:140 lo reconoce para Fase 0) | `rewards.ts:25-31` |
| 5 | **Auto / Daños / GMM** | README/PRODUCT/NEGOCIO los describen como oferta | **Ocultos por flag** (`SHOW_NON_CORE_PRODUCTS=false`, `VISIBLE_PRODUCT_TYPES`) — backend intacto | **Ocultos hoy** (reversibles, no bug) | `product-visibility.ts`, `CLAUDE.md` |
| 6 | **Premios burbuja** | README:20-21, PRODUCT los describen como feature activa | **Ocultos por flag** (`SHOW_BUBBLE_REWARDS=false`); no acumulan en la práctica | **Ocultos/latentes hoy** | `product-visibility.ts:15` |
| 7 | **Montos de escalera** | Comentario `rewards.ts:76-77`: "1,500/1,500/**2,500**" | Default UI **1,500/1,500/3,500**; default sin-tiers **1,500 plano** | Lo que el asesor configure (default UI **3,500** el tercero) | `niveles/page.tsx:63-67`, `rewards.ts:112` |
| 8 | **Fases del producto** | `NEGOCIO.md`: Fase 1 freemium/app $189, Fase 2 B2B $99/asiento, Fase 3 API | Solo existe **Fase 0** en código ($539 + comisión); Fases 1-3 **no construidas** | **Fase 0** es lo real; Fases 1-3 son roadmap | `NEGOCIO.md:22-61` vs código |
| 9 | **Mercado Pago** | `CLAUDE.md`: "Fase 0… sin self-service de pagos **todavía**" | El flujo MP completo **está construido y funciona** (subscribe + webhooks + trial 30d a todos) | **MP self-service SÍ existe** (aunque la narrativa diga Fase 0 asistida) | `UpgradeCardForm`, `api/billing/subscribe`, `register/route.ts` |
| 10 | **Trial (14 días pendiente)** | `NEGOCIO.md:137`: "[ ] Implementar free trial de 14 días" (pendiente) | Ya hay trial de **30 días** implementado | **30 días implementado** (el pendiente está obsoleto) | `register/route.ts:12` |
| 11 | **IA / advisor referral** | Docs describen "IA de conversión" (moat, aprender qué convierte) | Solo hay IA de **lectura de carátula + mensaje sugerido + briefing owner**; el moat de aprendizaje **no está construido** | IA actual = carátula/mensaje/briefing; el moat es **diseñado no construido** | `caratula-ai.ts`, `owner-narrative-ai.ts` |
| 12 | **Privacidad / CLABE** | `/aviso-de-privacidad:25` + FAQ: "**Nunca pedimos cuentas bancarias**" | El portal **sí captura CLABE** (18 dígitos) y sube carátulas de pólizas | **Sí se pide CLABE** — la promesa de privacidad es falsa hoy | `portal/[token]/clabe/route.ts`, `como-funciona:115` |
| 13 | **QStash** | README lista `QSTASH_TOKEN` / webhook diferido | No hay cliente QStash en el código; todo es Vercel Cron | **No hay QStash real** | grep (sin cliente) |

## Nota de método
Los documentos `../00-REFERIDOO-MAESTRO.md` y `../REFERIDOO-TODO-EN-UNO.md` (paquete previo para ChatGPT) fueron escritos con el estado en vivo y ya corrigen la mayoría de estas contradicciones; esta tabla es la verificación exhaustiva línea-por-línea. `NEGOCIO.md`, `README.md` y `PRODUCT.md` son los que más drift acumulan (describen fases futuras y la burbuja/Auto como activos).
