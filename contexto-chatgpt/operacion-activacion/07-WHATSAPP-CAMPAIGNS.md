# 07 · WhatsApp Campaigns — feasibility (NO integrado todavía)

> Estado real del repo: **no existe integración oficial de WhatsApp.** Lo único que hay es `wa.me` (deep links que abren el chat con texto prellenado) usado en el portal del cliente, la landing y ahora en la campaña WhatsApp-assisted. **No hay** Meta WhatsApp Business Platform ni Twilio ni ningún API de envío. Este doc explica qué haría falta para el envío oficial — **sin construirlo ni elegir proveedor todavía.**

## Qué es hoy: WhatsApp ASSISTED (honesto)
- El asesor abre el `wa.me` prellenado de cada recipient y lo envía **él mismo** desde su WhatsApp.
- Se registra `portal_link_sent` (channel=whatsapp) como **acción de envío** — NO entrega, NO lectura.
- No hay automation/Puppeteer/scraping/macros (prohibido y frágil). No decimos "enviado automáticamente".
- La arquitectura ya permite añadir un `WhatsAppBusinessTransport` después: el envío por email ya está abstraído por canal; agregar un transporte oficial es sustituir el paso "assisted" por llamadas al API, sin tocar atribución ni métricas.

## Qué necesita el envío OFICIAL (WhatsApp Business Platform)
Para mandar mensajes automáticos, de forma cumplida, haría falta:

| Requisito | Detalle | Implicación |
|---|---|---|
| **Meta Business Account** (verificada) | Business Manager + verificación de negocio | Trámite, documentos de la empresa |
| **Número de teléfono dedicado** | No puede ser el WhatsApp personal del asesor; un número por remitente | ¿Un número por asesor? ¿Uno de Referidoo? Decisión de producto |
| **WABA (WhatsApp Business Account)** | Ligada al número y al Business | Onboarding por proveedor |
| **Verificación / display name** | Nombre visible aprobado por Meta | Aprobación previa |
| **Message Templates aprobados** | Mensajes salientes "iniciados por negocio" (fuera de la ventana de 24h) DEBEN ser templates pre-aprobados por Meta (categoría marketing/utility/auth) | El mensaje de campaña tendría que ser un template aprobado, no texto libre |
| **Opt-in / consentimiento** | Meta exige consentimiento explícito del destinatario para recibir mensajes | ¿Tenemos opt-in de los clientes del asesor? Riesgo de cumplimiento **alto** |
| **Conversation windows (24h)** | Fuera de la ventana de 24h solo se pueden enviar templates; dentro, mensajes libres | Cambia el modelo de "campaña masiva" |
| **Webhooks** | Para recibir estados y respuestas | Infra nueva (endpoint + verificación de firma) |
| **Delivery statuses** | sent / delivered / read vía webhook | Recién aquí "entregado"/"leído" serían reales |
| **Costos** | Meta cobra por conversación (varía por país/categoría; MX tiene tarifa) | Modelo de costo por campaña — impacta pricing |
| **Rate limits / calidad** | Tiers de mensajería que suben con buena calidad; el número puede ser degradado por reportes de spam | Enviar a cartera fría = riesgo de baja calidad/baneo |
| **Template approval** | Cada plantilla pasa revisión (horas–días) | No hay "escribe y manda" inmediato |

## Proveedores (NO se elige todavía)
- **Meta Cloud API** (directo con Meta): sin intermediario, pero más setup propio.
- **Twilio / 360dialog / MessageBird / Gupshup** (BSPs): onboarding más fácil, costo por encima de Meta.
- **Decisión diferida**: depende de volumen real, de si el número es de Referidoo o del asesor, y del modelo de costo. No elegir por defecto.

## Riesgos específicos para Referidoo
- **Consentimiento**: la cartera del asesor no necesariamente dio opt-in a recibir WhatsApp de Referidoo → riesgo legal/calidad. El modelo assisted (el asesor manda desde su propio chat con su relación existente) esquiva esto.
- **Templates vs mensaje personal**: el valor del referido está en el mensaje *personal* del asesor; los templates de Meta son rígidos y "de negocio" → puede bajar la conversión.
- **Costo**: pasar de $0 (assisted) a costo por conversación cambia la economía; entra en el Economics Audit, no antes.

## Recomendación (para cuando haya evidencia)
No integrar WhatsApp oficial hasta: (1) tener evidencia de que el loop de campaña produce referidos (Ceci #001+), (2) resolver el consentimiento/opt-in, (3) decidir número (Referidoo vs asesor) y (4) modelar el costo. Mientras tanto, **WhatsApp assisted** es honesto, gratis y suficiente para validar.
