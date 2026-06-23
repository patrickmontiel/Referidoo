import { MercadoPagoConfig, PreApproval, WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const MONTHLY_PRICE_MXN = 539;

export function getMercadoPagoConfig(): MercadoPagoConfig | null {
  if (!ACCESS_TOKEN) return null;
  return new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
}

function getClient() {
  return getMercadoPagoConfig();
}

// Crea una suscripción recurrente mensual en Mercado Pago y devuelve el link
// de checkout (init_point) al que se redirige al asesor para autorizarla.
// Body verificado contra PreApprovalRequest del SDK instalado (mercadopago@3.1.0)
// — los nombres de campo son correctos. Falta probar contra el sandbox real
// una vez haya credenciales (MP_ACCESS_TOKEN/MP_WEBHOOK_SECRET).
export async function createSubscription(advisor: { id: string; email: string; name: string }) {
  const client = getClient();
  if (!client) {
    throw new Error("MP_ACCESS_TOKEN no configurado — falta conectar Mercado Pago");
  }

  const preapproval = new PreApproval(client);
  const result = await preapproval.create({
    body: {
      reason: "Referidoo — plan mensual",
      external_reference: advisor.id,
      payer_email: advisor.email,
      back_url: `${BASE_URL}/admin?billing=success`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: MONTHLY_PRICE_MXN,
        currency_id: "MXN",
      },
      status: "pending",
    },
  });

  return { preapprovalId: result.id as string, initPoint: result.init_point as string };
}

export async function cancelSubscription(preapprovalId: string) {
  const client = getClient();
  if (!client) {
    throw new Error("MP_ACCESS_TOKEN no configurado — falta conectar Mercado Pago");
  }

  const preapproval = new PreApproval(client);
  await preapproval.update({ id: preapprovalId, body: { status: "cancelled" } });
}

// Verificación de firma de webhook usando el validador oficial del SDK
// (constant-time, con tolerancia de replay). Requiere MP_WEBHOOK_SECRET del
// dashboard de Mercado Pago ("Tus integraciones" → la app → Webhooks).
export function verifyWebhookSignature(params: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean {
  if (!WEBHOOK_SECRET) return false;

  try {
    WebhookSignatureValidator.validate({
      xSignature: params.xSignature,
      xRequestId: params.xRequestId,
      dataId: params.dataId,
      secret: WEBHOOK_SECRET,
      toleranceSeconds: 300,
    });
    return true;
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) return false;
    throw err;
  }
}
