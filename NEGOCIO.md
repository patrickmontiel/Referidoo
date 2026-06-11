# Referidoo — Modelo de Negocio

## Propuesta de valor
Plataforma que convierte clientes activos de asesores financieros/seguros en referidores activos, sin que el cliente comparta datos propios ni pase por procesos legales. El asesor gestiona todo desde un dashboard.

**Posición única en el mercado:** No existe ningún competidor directo en México que ofrezca referral tracking específico para asesores de seguros individuales. Referidoo no compite contra otras herramientas — compite contra Excel y WhatsApp.

---

## Fases del producto

### Fase 0 — Servicio asistido (actual)
- **Precio:** $539 MXN/mes por asesor
- **Comisión por producto:**
  - PPRs y seguros de vida (Allianz, Skandia): **0.15% sobre el valor del plan contratado**
  - Seguros de daños, autos y GMM: **15% sobre la comisión del asesor**
- **Modelo:** Atención directa de Patrick (onboarding, soporte, configuración)
- **Perfil:** Asesores individuales que necesitan acompañamiento
- **Objetivo:** Validar el modelo, acumular 20–30 casos de éxito con testimonios
- **Trigger de salida:** Suficiente tracción para justificar desarrollo de app self-service

### Fase 1 — Freemium + self-service (app móvil)
- **Freemium:** Gratis hasta 2 clientes activos (sin límite de tiempo)
- **Paid:** A partir del 3er cliente → **$189 MXN/mes**
- **Comisión por producto (solo plan pagado):**
  - PPRs y seguros de vida (Allianz, Skandia): **0.25% sobre el valor del plan contratado**
  - Seguros de daños, autos y GMM: **25% sobre la comisión del asesor**
- **Canal de distribución:** App móvil en Google Play + App Store — no solo web
- **Modelo:** 100% self-service — sin atención directa de Patrick
- **Soporte:** Chatbot / atención automatizada
- **Free trial:** 14 días sin tarjeta para el plan paid (estándar del sector)
- **Lógica de precio:** $189 MXN/mes es intencionalmente bajo para maximizar adopción en app stores. El ingreso real a escala viene de las comisiones acumuladas en volumen, no de la mensualidad.
- **Nota técnica:** Requiere desarrollo de app nativa o PWA instalable — se justifica con tracción de Fase 0.

### Fase 2 — B2B multi-asesor (despachos)
- **Precio base:** $99 MXN por asiento/mes
- **Comisión por producto:**
  - PPRs y seguros de vida (Allianz, Skandia): **0.10% sobre el valor del plan contratado**
  - Seguros de daños, autos y GMM: **10% sobre la comisión del asesor**
- **Mercado objetivo:** Despachos, grupos de asesores, brokers con 10–200 asesores
- **Add-on White-label:** Personalización de marca (logo, colores, dominio propio) por fee adicional — mismo modelo, nivel superior de customización
- **Modelo de venta:** Contrato con el gerente/dueño del despacho, no con cada asesor individual
- **Diferencia vs Fase 1:** Volumen + precio por asiento + contrato grupal

### Fase 3 — API / Integración enterprise
- **Modelo:** Acceso programático a la plataforma vía API
- **Para quién:** Aseguradoras grandes, sistemas CRM propios, integradores de tecnología
- **Precio:** Por contrato / por volumen de llamadas (a definir cuando llegue el momento)
- **Casos de uso:** Aseguradora que conecta Referidoo a su sistema interno; broker que ya tiene su app y quiere el motor de referidos como backend
- **Trigger:** Solo tiene sentido después de que Fase 2 demuestre volumen y casos enterprise

---

## Resumen de fases

| Fase | Tipo | Mensual | Comisión vida/PPR | Comisión daños/auto/GMM |
|------|------|---------|-------------------|------------------------|
| 0 | Asistido por Patrick | $539 MXN | 0.15% del valor del plan | 15% de comisión del asesor |
| 1 | Freemium → self-service app | Gratis/2 clientes → $189 MXN | 0.25% del valor del plan | 25% de comisión del asesor |
| 2 | B2B por asiento (despachos) | $99 MXN/asiento | 0.10% del valor del plan | 10% de comisión del asesor |
| 3 | API enterprise | Por contrato (TBD) | TBD | TBD |

---

## Cómo se calcula la comisión de Referidoo

La comisión varía por tipo de producto porque la estructura de ingreso del asesor es diferente:

**Productos de largo plazo (PPR, Seguro de Vida — Allianz, Skandia):**
- El valor del plan es conocido y es una cifra grande
- Referidoo cobra un % sobre ese valor del plan
- Ejemplo Fase 0: Plan de $500,000 MXN → Referidoo cobra $750 MXN por ese referido convertido

**Productos de corto plazo / renovación anual (Daños, Auto, GMM):**
- No hay "valor del plan" como tal — hay una prima y una comisión del asesor
- Referidoo cobra un % sobre lo que el asesor gana de comisión
- Ejemplo Fase 0: Asesor gana $3,000 MXN de comisión → Referidoo cobra $450 MXN

---

## Inteligencia competitiva (investigación junio 2026)

### Mercado México / LATAM

| Herramienta | Tipo | Precio/mes | Notas |
|---|---|---|---|
| **Agenthos Plus** | CRM seguros LATAM | $1,987 MXN | Incluye IA, WhatsApp, lector de pólizas — sin referral tracking |
| **SICAS Online** | AMS seguros MX | $484–$798 MXN | Reviewer: "costo-beneficio cuestionable" |
| **Jooylo** | Cotizador multimarca MX | ~$500 MXN | Solo cotizaciones |
| **Sinalix** | Cotizador autos/daños | ~$600 MXN | Solo cotizaciones |
| **Stack completo asesor MX** | Herramientas sueltas | $700–$900 MXN | Jooylo + Kommo + ZapSign |

### Mercado US (referencia de modelos)

| Herramienta | Tipo | Precio/mes (USD) | Notas |
|---|---|---|---|
| **HelloReferrals** | Referidos para seguros | $49–$99 USD | Más cercano a Referidoo — sin comisión |
| **AgencyZoom Growth** | CRM + Referidos | $199 USD (7 seats) | Estándar de agencias US |
| **ReferralCandy** | Referidos ecomm | $47–$79 USD + 1.5–3.5% | Mismo modelo híbrido |

---

## Modelos de pricing evaluados

| Modelo | Decisión |
|---|---|
| Success-only (puro %) | Descartado — revenue garantizado muy bajo |
| Freemium hasta 2 clientes | ✓ Fase 1 (entrada) |
| Flat + comisión asistida | ✓ Fase 0 |
| B2B por asiento | ✓ Fase 2 |
| White-label | ✓ Add-on dentro de Fase 2 |
| API enterprise | ✓ Fase 3 |
| Marketplace inverso | ✗ Descartado (conflictos de interés) |

---

## Framing de venta recomendado

> "Si un asesor pierde 3 referidos al mes por falta de seguimiento, y cada póliza vale $2,000–$5,000 MXN en comisión, el costo de no tener Referidoo es $6,000–$15,000 MXN/mes. Frente a $539 MXN, es invisible."

---

## Decisiones pendientes

- [ ] Definir cap máximo mensual de comisión (sugerido $500 MXN/mes tope)
- [ ] Definir trigger exacto de cobro: ¿emisión de póliza o cobro de prima?
- [ ] Implementar free trial de 14 días en Fase 1
- [ ] Definir precio del add-on white-label en Fase 2
- [ ] Definir estructura de precios API para Fase 3
- [ ] Confirmar si la comisión del 15/25/10% sobre comisión del asesor aplica también a GMM o solo a daños/auto
