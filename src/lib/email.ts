import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Referidoo <noreply@referidoo.com>";
const CREATOR_EMAIL = process.env.EMAIL_NOTIFY_CREATOR ?? "patrick@referidoo.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(amount);
}

type NewReferralPayload = {
  advisorName: string;
  advisorEmail: string;
  referrerName: string;
  leadName: string;
  leadPhone: string;
  leadEmail?: string | null;
  rewardAmount: number;
  tierPosition: number;
};

function newReferralHtml(p: NewReferralPayload, isCreator = false) {
  const adminUrl = `${BASE_URL}/admin/referidos`;
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
        <!-- Header -->
        <tr>
          <td style="background:#000;padding:24px 32px">
            <p style="margin:0;color:#fff;font-size:12px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:500">
              ${isCreator ? `Notificación del sistema · ${p.advisorName}` : "Nuevo referido recibido"}
            </p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0a0a0a;line-height:1.3">
              ${p.leadName} quiere conocer más
            </h1>

            <!-- Lead card -->
            <table width="100%" style="background:#f9fafb;border-radius:12px;margin-bottom:24px">
              <tr><td style="padding:20px">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:2px;text-transform:uppercase">Nuevo contacto</p>
                <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0a0a0a">${p.leadName}</p>
                <table>
                  <tr>
                    <td style="padding:2px 0">
                      <span style="font-size:13px;color:#6b7280">📱 </span>
                      <a href="tel:${p.leadPhone}" style="font-size:13px;color:#0a0a0a;font-weight:600;text-decoration:none">${p.leadPhone}</a>
                    </td>
                  </tr>
                  ${p.leadEmail ? `<tr><td style="padding:2px 0"><span style="font-size:13px;color:#6b7280">✉️ </span><span style="font-size:13px;color:#0a0a0a">${p.leadEmail}</span></td></tr>` : ""}
                </table>
              </td></tr>
            </table>

            <!-- Meta -->
            <table width="100%" style="margin-bottom:28px">
              <tr>
                <td width="50%" style="padding:0 8px 0 0">
                  <table width="100%" style="background:#f9fafb;border-radius:10px">
                    <tr><td style="padding:14px 16px">
                      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:1px;text-transform:uppercase">Referido por</p>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#0a0a0a">${p.referrerName}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 0 8px">
                  <table width="100%" style="background:#f9fafb;border-radius:10px">
                    <tr><td style="padding:14px 16px">
                      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:1px;text-transform:uppercase">Premio #${p.tierPosition}</p>
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0a0a0a">${formatMXN(p.rewardAmount)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <a href="${adminUrl}" style="display:block;background:#000;color:#fff;text-align:center;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none">
              Ver en el panel →
            </a>

            <p style="margin:20px 0 0;font-size:12px;color:#d1d5db;text-align:center">
              ${isCreator ? `Notificación automática de Referidoo · Asesor: ${p.advisorName}` : "Este correo es automático de Referidoo"}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type ApprovedPayload = NewReferralPayload & {
  saleAmount?: number | null;
  launchBonusApplied?: boolean;
  productType?: string | null;
  lessioCommission?: number | null;
};

function referralApprovedHtml(p: ApprovedPayload, isCreator = false) {
  const adminUrl = `${BASE_URL}/admin/referidos`;
  const saleRow = p.saleAmount
    ? `<tr><td style="padding:2px 0"><span style="font-size:13px;color:#6b7280">💼 Valor del plan: </span><span style="font-size:13px;font-weight:700;color:#0a0a0a">${formatMXN(p.saleAmount)}</span></td></tr>`
    : "";
  const commissionBlock = isCreator && p.lessioCommission
    ? `<table width="100%" style="background:#000;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:16px 20px">
          <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:2px;text-transform:uppercase">Tu comisión Lessio${p.productType ? ` · ${p.productType}` : ""}</p>
          <p style="margin:0;font-size:20px;font-weight:800;color:#fff">${formatMXN(p.lessioCommission)}</p>
        </td></tr>
      </table>`
    : "";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr>
          <td style="background:#000;padding:24px 32px">
            <p style="margin:0;color:#fff;font-size:12px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo · Comisión</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:500">Venta cerrada — ${p.advisorName}</p>
            <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#0a0a0a;line-height:1.3">
              ${p.leadName} contrató un plan
            </h1>
            <table width="100%" style="background:#f9fafb;border-radius:12px;margin-bottom:24px">
              <tr><td style="padding:20px">
                <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:2px;text-transform:uppercase">Cliente convertido</p>
                <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#0a0a0a">${p.leadName}</p>
                <table>
                  <tr><td style="padding:2px 0"><span style="font-size:13px;color:#6b7280">📱 </span><a href="tel:${p.leadPhone}" style="font-size:13px;color:#0a0a0a;font-weight:600;text-decoration:none">${p.leadPhone}</a></td></tr>
                  ${p.leadEmail ? `<tr><td style="padding:2px 0"><span style="font-size:13px;color:#6b7280">✉️ </span><span style="font-size:13px;color:#0a0a0a">${p.leadEmail}</span></td></tr>` : ""}
                  ${saleRow}
                </table>
              </td></tr>
            </table>
            <table width="100%" style="margin-bottom:28px">
              <tr>
                <td width="50%" style="padding:0 8px 0 0">
                  <table width="100%" style="background:#f9fafb;border-radius:10px">
                    <tr><td style="padding:14px 16px">
                      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:1px;text-transform:uppercase">Asesor</p>
                      <p style="margin:0;font-size:14px;font-weight:600;color:#0a0a0a">${p.advisorName}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 0 8px">
                  <table width="100%" style="background:#f9fafb;border-radius:10px">
                    <tr><td style="padding:14px 16px">
                      <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:1px;text-transform:uppercase">Premio #${p.tierPosition}</p>
                      <p style="margin:0;font-size:14px;font-weight:700;color:#0a0a0a">${formatMXN(p.rewardAmount)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
            <table width="100%" style="background:#000;border-radius:12px;margin-bottom:20px">
              <tr><td style="padding:16px 20px">
                <p style="margin:0 0 2px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:2px;text-transform:uppercase">Referido por</p>
                <p style="margin:0;font-size:16px;font-weight:700;color:#fff">${p.referrerName}</p>
              </td></tr>
            </table>
            ${commissionBlock}
            <a href="${adminUrl}" style="display:block;background:#000;color:#fff;text-align:center;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none">
              Ver en el panel →
            </a>
            <p style="margin:20px 0 0;font-size:12px;color:#d1d5db;text-align:center">
              Notificación de conversión · Referidoo
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendReferralApprovedNotification(payload: ApprovedPayload) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — conversión no notificada. Payload:", payload);
    return;
  }

  const subject = `[Comisión${payload.launchBonusApplied ? " 🎯 BONO x2" : ""}] ${payload.advisorName} cerró — ${payload.leadName}${payload.saleAmount ? ` · Plan ${formatMXN(payload.saleAmount)}` : ""}`;

  const sends: Promise<unknown>[] = [];

  // Email al asesor — sin comisión de Lessio
  if (payload.advisorEmail && payload.advisorEmail !== CREATOR_EMAIL) {
    sends.push(resend.emails.send({
      from: FROM,
      to: [payload.advisorEmail],
      subject,
      html: referralApprovedHtml(payload, false),
    }));
  }

  // Email al creador (Patrick) — incluye su comisión
  sends.push(resend.emails.send({
    from: FROM,
    to: [CREATOR_EMAIL],
    subject,
    html: referralApprovedHtml(payload, true),
  }));

  await Promise.allSettled(sends).then((results) => {
    results.forEach((r) => { if (r.status === "rejected") console.error("[email] Error enviando conversión:", r.reason); });
  });
}

// ─── Payment sent to referrer ───────────────────────────────────────────────

export type PaymentPayload = {
  referrerName: string;
  referrerEmail: string;
  advisorName: string;
  leadName: string;
  rewardAmount: number;
  portalUrl: string;
  advisorEmail: string;
  tierPosition: number;
  paymentNote?: string | null;
  nextTierPosition?: number | null;
  nextTierAmount?: number | null;
};

function paymentSentHtml(p: PaymentPayload) {
  const nextBlock = p.nextTierAmount && p.nextTierPosition
    ? `<table width="100%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px">
        <tr><td style="padding:16px 20px">
          <p style="margin:0 0 4px;font-size:11px;color:#166534;font-weight:700;letter-spacing:2px;text-transform:uppercase">Siguiente premio</p>
          <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#0a0a0a">Premio #${p.nextTierPosition} — ${formatMXN(p.nextTierAmount)}</p>
          <p style="margin:0;font-size:13px;color:#166534">Confirma que recibiste el #${p.tierPosition} y tu historial quedará al día para seguir acumulando.</p>
        </td></tr>
      </table>`
    : `<p style="margin:0 0 20px;font-size:13px;color:#6b7280;text-align:center">Confirma que lo recibiste para mantener tu historial al día.</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#000;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:12px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:500">¡Te han enviado un premio!</p>
          <h1 style="margin:0 0 4px;font-size:28px;font-weight:800;color:#0a0a0a">${formatMXN(p.rewardAmount)}</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280">Premio #${p.tierPosition} por referir a ${p.leadName}</p>

          <table width="100%" style="background:#f9fafb;border-radius:12px;margin-bottom:20px">
            <tr><td style="padding:18px 20px">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;font-weight:600;letter-spacing:2px;text-transform:uppercase">Detalles</p>
              <p style="margin:0 0 8px;font-size:14px;color:#374151">${p.advisorName} confirmó que <strong>${p.leadName}</strong> contrató un plan. Tu Premio #${p.tierPosition} fue aprobado y enviado.</p>
              ${p.paymentNote ? `<p style="margin:0;font-size:12px;color:#9ca3af">Referencia de pago: ${p.paymentNote}</p>` : ""}
            </td></tr>
          </table>

          ${nextBlock}

          <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0a0a0a;text-align:center">¿Ya lo recibiste?</p>
          <p style="margin:0 0 16px;font-size:13px;color:#6b7280;text-align:center">Confírmalo aquí o en la aplicación — tarda menos de 10 segundos.</p>
          <a href="${p.portalUrl}" style="display:block;background:#000;color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:12px">
            Sí, lo recibí ✓
          </a>
          <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center">¿No lo recibiste? Escríbele directamente a ${p.advisorName}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function confirmationRequestHtml(p: PaymentPayload) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#000;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:12px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo</p>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0a0a0a">¿Ya recibiste tu premio?</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280">${p.advisorName} confirmó el pago de <strong>${formatMXN(p.rewardAmount)}</strong>. Confirma que lo recibiste para mantener tu historial al día.</p>
          <a href="${p.portalUrl}" style="display:block;background:#000;color:#fff;text-align:center;padding:16px;border-radius:12px;font-size:15px;font-weight:700;text-decoration:none;margin-bottom:12px">
            Sí, lo recibí ✓
          </a>
          <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center">Si no recibiste nada, contacta a ${p.advisorName} directamente.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export async function sendPaymentSentNotification(payload: PaymentPayload) {
  if (!resend) { console.log("[email] sin API key — pago no notificado"); return; }
  const results = await Promise.allSettled([
    payload.referrerEmail
      ? resend.emails.send({ from: FROM, to: [payload.referrerEmail], subject: `¡Tu premio de ${formatMXN(payload.rewardAmount)} está en camino!`, html: paymentSentHtml(payload) })
      : Promise.resolve(null),
    resend.emails.send({ from: FROM, to: [CREATOR_EMAIL], subject: `[Pago] ${payload.advisorName} pagó ${formatMXN(payload.rewardAmount)} a ${payload.referrerName}`, html: paymentSentHtml(payload) }),
  ]);
  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`[email] pago email [${i}] falló:`, r.reason);
    else if (r.status === "fulfilled" && r.value && typeof r.value === "object" && "error" in r.value && r.value.error) {
      console.error(`[email] pago email [${i}] error Resend:`, r.value.error);
    }
  });
}

export async function sendConfirmationRequest(payload: PaymentPayload) {
  if (!resend || !payload.referrerEmail) return;
  await resend.emails.send({ from: FROM, to: [payload.referrerEmail], subject: `¿Recibiste tu premio de ${formatMXN(payload.rewardAmount)}?`, html: confirmationRequestHtml(payload) });
}

export async function sendReferrerConfirmedNotification(payload: { referrerName: string; advisorName: string; leadName: string; rewardAmount: number; saleAmount?: number | null }) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: [CREATOR_EMAIL],
    subject: `[Confirmado] ${payload.referrerName} confirmó su premio · ${payload.advisorName}`,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#000;padding:20px 28px"><p style="margin:0;color:#fff;font-size:11px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo · Comisión Verificada</p></td></tr>
  <tr><td style="padding:28px">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0a0a0a">${payload.referrerName} confirmó su premio</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Asesor: <strong>${payload.advisorName}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Lead convertido: <strong>${payload.leadName}</strong></p>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Premio pagado: <strong>${formatMXN(payload.rewardAmount)}</strong></p>
    ${payload.saleAmount ? `<p style="margin:0 0 8px;font-size:14px;color:#6b7280">Valor del plan: <strong style="color:#000">${formatMXN(payload.saleAmount)}</strong></p>` : ""}
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;margin-top:20px">
      <p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ El referente confirmó la recepción de su premio</p>
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  });
}

// ─── Premios burbuja (Auto + GMM) ───────────────────────────────────────────

export type BubbleClaimPayload = {
  referrerName: string;
  referrerEmail?: string | null;
  advisorName: string;
  advisorEmail: string;
  amount: number;
  portalUrl?: string;
};

export async function sendBubbleClaimNotification(payload: BubbleClaimPayload) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — reclamo de burbuja no notificado. Payload:", payload);
    return;
  }

  const subject = `[Premios burbuja] ${payload.referrerName} reclamó ${formatMXN(payload.amount)}`;

  const recipients = [CREATOR_EMAIL];
  if (payload.advisorEmail && payload.advisorEmail !== CREATOR_EMAIL) {
    recipients.push(payload.advisorEmail);
  }

  await resend.emails.send({
    from: FROM,
    to: recipients,
    subject,
    html: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"></head><body style="font-family:-apple-system,sans-serif;background:#f4f4f5;padding:40px 16px">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden">
  <tr><td style="background:#000;padding:20px 28px"><p style="margin:0;color:#fff;font-size:11px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo · Premios burbuja</p></td></tr>
  <tr><td style="padding:28px">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0a0a0a">${payload.referrerName} reclamó su premio burbuja</h1>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280">Asesor: <strong>${payload.advisorName}</strong></p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b7280">Monto acumulado (Auto + GMM): <strong style="color:#000">${formatMXN(payload.amount)}</strong></p>
    <a href="${BASE_URL}/admin/niveles" style="display:block;background:#000;color:#fff;text-align:center;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none">
      Revisar y marcar como pagado →
    </a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`,
  }).catch((err) => console.error("[email] Error enviando reclamo de burbuja:", err));
}

export async function sendBubbleClaimPaidNotification(payload: BubbleClaimPayload & { paymentNote?: string | null }) {
  if (!resend || !payload.referrerEmail) return;

  await resend.emails.send({
    from: FROM,
    to: [payload.referrerEmail],
    subject: `¡Tu premio burbuja de ${formatMXN(payload.amount)} fue enviado!`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#000;padding:24px 32px">
          <p style="margin:0;color:#fff;font-size:12px;letter-spacing:3px;font-weight:600;text-transform:uppercase">Referidoo</p>
        </td></tr>
        <tr><td style="padding:32px">
          <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:500">¡Tu premio burbuja fue enviado!</p>
          <h1 style="margin:0 0 24px;font-size:28px;font-weight:800;color:#0a0a0a">${formatMXN(payload.amount)}</h1>
          <table width="100%" style="background:#f9fafb;border-radius:12px;margin-bottom:20px">
            <tr><td style="padding:18px 20px">
              <p style="margin:0;font-size:14px;color:#374151">${payload.advisorName} envió tu premio acumulado por referir seguros de auto y gastos médicos mayores.</p>
              ${payload.paymentNote ? `<p style="margin:8px 0 0;font-size:12px;color:#9ca3af">Referencia de pago: ${payload.paymentNote}</p>` : ""}
            </td></tr>
          </table>
          <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center">Notificación automática de Referidoo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  }).catch((err) => console.error("[email] Error enviando pago de burbuja:", err));
}

export async function sendVerificationEmail(payload: { advisorEmail: string; advisorName: string; verificationToken: string }) {
  const verifyUrl = `${BASE_URL}/api/auth/verify-email?token=${payload.verificationToken}`;

  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — verificación no enviada. Link:", verifyUrl);
    return;
  }

  console.log("[email] enviando verificación a:", payload.advisorEmail, "url:", verifyUrl);
  const result = await resend.emails.send({
    from: FROM,
    to: [payload.advisorEmail],
    subject: "Confirma tu correo en Referidoo",
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#ffffff;padding:28px 32px;border-bottom:1px solid #f3f4f6">
          <span style="font-size:21px;font-weight:800;letter-spacing:-0.02em;color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">referidoo</span><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#3b82f6;margin-left:3px"></span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0a0a0a">Hola ${payload.advisorName}, confirma tu correo</h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280">Falta un paso para empezar a agregar clientes en Referidoo — confirma tu correo con el botón de abajo.</p>
          <a href="${verifyUrl}" style="display:block;background:#000;color:#fff;text-align:center;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:600;text-decoration:none">
            Verificar mi correo →
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#d1d5db;text-align:center">Si no creaste esta cuenta, ignora este correo.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
  if (result.error) {
    console.error("[email] Resend rechazó verificación:", JSON.stringify(result.error));
  } else {
    console.log("[email] verificación enviada OK. id:", result.data?.id);
  }
}

export async function sendNewReferralNotification(payload: NewReferralPayload) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — email no enviado. Payload:", payload);
    return;
  }

  const subject = `Nuevo referido: ${payload.leadName} vía ${payload.referrerName}`;

  await Promise.allSettled([
    // Email al asesor
    resend.emails.send({
      from: FROM,
      to: [payload.advisorEmail],
      subject,
      html: newReferralHtml(payload, false),
    }),
    // Email al creador (Patrick)
    resend.emails.send({
      from: FROM,
      to: [CREATOR_EMAIL],
      subject: `[Referidoo] ${subject}`,
      html: newReferralHtml(payload, true),
    }),
  ]);
}
