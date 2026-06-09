import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM ?? "Referidoo <noreply@referidoo.mx>";
const CREATOR_EMAIL = process.env.EMAIL_NOTIFY_CREATOR ?? "patrick@lessio.ai";
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
