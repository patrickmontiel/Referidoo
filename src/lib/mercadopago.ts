import { MercadoPagoConfig, PreApproval, PreApprovalPlan, WebhookSignatureValidator, InvalidWebhookSignatureError } from "mercadopago";

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;
const PLAN_ID = process.env.MP_PLAN_ID;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const MONTHLY_PRICE_MXN = 539;

export function getMercadoPagoConfig(): MercadoPagoConfig | null {
  if (!ACCESS_TOKEN) return null;
  return new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
}

function getClient() {
  return getMercadoPagoConfig();
}

// Crea la suscripción del asesor CONTRA el Plan de Referidoo ya existente
// (MP_PLAN_ID, creado una sola vez con `scripts/mp-create-plan.ts`), usando
// un card_token_id ya generado en el navegador (Secure Fields / createCardToken
// de @mercadopago/sdk-react) para autorizarla de inmediato — sin redirect.
//
// Probado contra la API real (sandbox) en este orden, hasta encontrar lo que
// funciona en esta cuenta:
//   1. PreApproval sin plan + auto_recurring inline + status:"pending"
//      (redirect, sin card_token_id) → "Internal server error" consistente,
//      con body idéntico al ejemplo oficial de la doc — parece ser que esta
//      cuenta no tiene habilitada "suscripciones sin plan asociado".
//   2. PreApproval CON preapproval_plan_id + status:"pending" (sin token)
//      → "card_token_id is required" — confirma que "suscripciones con plan
//      asociado" SIEMPRE requiere card_token_id + status:"authorized"
//      (documentado: nunca soporta redirect).
//   3. Esta función (plan + card_token_id + status:"authorized") es la que
//      sí funciona en esta cuenta.
export async function createSubscription(advisor: { id: string; email: string }, cardTokenId: string) {
  const client = getClient();
  if (!client) {
    throw new Error("MP_ACCESS_TOKEN no configurado — falta conectar Mercado Pago");
  }
  if (!PLAN_ID) {
    throw new Error("MP_PLAN_ID no configurado — corre scripts/mp-create-plan.ts una vez y guarda el id en .env");
  }

  const preapproval = new PreApproval(client);
  const result = await preapproval.create({
    body: {
      preapproval_plan_id: PLAN_ID,
      external_reference: advisor.id,
      payer_email: advisor.email,
      card_token_id: cardTokenId,
      status: "authorized",
    },
  });

  return { preapprovalId: result.id as string, status: result.status as string };
}

// Crea el Plan de Referidoo en Mercado Pago (una sola vez por cuenta/credencial
// — test y producción son cuentas separadas, así que esto corre una vez por
// cada una). El id resultante se guarda en MP_PLAN_ID.
export async function createPlan(): Promise<{ planId: string; initPoint: string }> {
  const client = getClient();
  if (!client) {
    throw new Error("MP_ACCESS_TOKEN no configurado — falta conectar Mercado Pago");
  }

  const plan = new PreApprovalPlan(client);
  const result = await plan.create({
    body: {
      reason: "Referidoo — plan mensual",
      back_url: `${BASE_URL}/admin?billing=success`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: MONTHLY_PRICE_MXN,
        currency_id: "MXN",
      },
    },
  });

  return { planId: result.id as string, initPoint: result.init_point as string };
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
