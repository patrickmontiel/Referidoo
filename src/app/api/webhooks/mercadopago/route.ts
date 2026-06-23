import { NextRequest, NextResponse } from "next/server";
import { Invoice } from "mercadopago";
import { db } from "@/lib/db";
import { verifyWebhookSignature, getMercadoPagoConfig } from "@/lib/mercadopago";

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Topics confirmados contra la tabla oficial de eventos de Mercado Pago
// (Webhooks → Configurar notificaciones) y contra los tipos del SDK
// instalado (mercadopago@3.1.0):
//   - "subscription_preapproval"       → alta/autorización/cancelación de la
//     suscripción misma (recurso PreApproval).
//   - "subscription_authorized_payment" → cada cobro recurrente. El data.id
//     NO es un Payment — es un "Invoice" (factura de suscripción), que se
//     consulta vía GET /authorized_payments/{id} (client `Invoice` del SDK,
//     no `Payment`). InvoiceResponse trae external_reference directo y
//     payment.status anidado (approved/rejected/pending).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const dataId = req.nextUrl.searchParams.get("data.id") ?? body?.data?.id ?? null;

  const validSignature = verifyWebhookSignature({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId,
  });

  if (!validSignature) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const type = body?.type;

  if (type === "subscription_authorized_payment" && dataId) {
    await handleAuthorizedPaymentNotification(dataId);
  }

  if (type === "subscription_preapproval" && dataId) {
    await handlePreapprovalNotification(dataId);
  }

  return NextResponse.json({ ok: true });
}

async function handleAuthorizedPaymentNotification(invoiceId: string) {
  const config = getMercadoPagoConfig();
  if (!config) return;

  const invoice = await new Invoice(config).get({ id: invoiceId }).catch((err) => {
    console.error("[mp-webhook] Error obteniendo invoice:", err);
    return null;
  });
  if (!invoice) return;

  const advisorId = invoice.external_reference;
  if (!advisorId) return;

  const status = invoice.payment?.status;

  if (status === "approved") {
    await db.advisor.update({
      where: { id: advisorId },
      data: { plan: "paid", paidUntil: new Date(Date.now() + ONE_MONTH_MS), paymentFailedAt: null },
    }).catch((err) => console.error("[mp-webhook] Error registrando pago aprobado:", err));
    return;
  }

  if (status === "rejected") {
    // Solo marcar el inicio de la gracia si no había una marca ya activa —
    // un segundo rechazo dentro de los 3 días de gracia no debe reiniciar el reloj.
    const advisor = await db.advisor.findUnique({ where: { id: advisorId }, select: { paymentFailedAt: true } });
    if (advisor && !advisor.paymentFailedAt) {
      await db.advisor.update({
        where: { id: advisorId },
        data: { paymentFailedAt: new Date() },
      }).catch((err) => console.error("[mp-webhook] Error registrando pago rechazado:", err));
    }
  }
}

async function handlePreapprovalNotification(preapprovalId: string) {
  const advisor = await db.advisor.findUnique({ where: { mpPreapprovalId: preapprovalId } });
  if (!advisor || advisor.plan === "paid") return;

  // Primera autorización del checkout — el primer cobro real llega después
  // vía "subscription_authorized_payment", pero activamos el plan de
  // inmediato para no dejar al asesor esperando.
  await db.advisor.update({
    where: { id: advisor.id },
    data: { plan: "paid", paidUntil: new Date(Date.now() + ONE_MONTH_MS) },
  }).catch((err) => console.error("[mp-webhook] Error activando suscripción:", err));
}
