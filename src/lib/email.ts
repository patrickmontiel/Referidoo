import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.EMAIL_FROM || "Referidoo Team <noreply@referidoo.com>";
const CREATOR_EMAIL = process.env.EMAIL_NOTIFY_CREATOR ?? "patrick@referidoo.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://referidoo.com";

function formatMXN(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function emailShell(body: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ECEDEF">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function header(sublabel?: string) {
  return `<tr>
    <td style="background:#0B0B0C;padding:22px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-size:18px;font-weight:700;letter-spacing:-0.025em;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">referidoo</span><span style="font-size:18px;font-weight:700;color:#2563EB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">.</span>
          </td>
          ${sublabel ? `<td align="right"><span style="font-size:11px;color:#6B727D;font-weight:500;letter-spacing:0.04em">${sublabel}</span></td>` : ""}
        </tr>
      </table>
    </td>
  </tr>`;
}

function footer(text: string) {
  return `<tr>
    <td style="padding:0 32px 28px">
      <p style="margin:0;font-size:12px;color:#9098A2;text-align:center;line-height:1.6">${text}</p>
    </td>
  </tr>`;
}

function pill(href: string, label: string, bg = "#0B0B0C") {
  return `<a href="${href}" style="display:block;background:${bg};color:#ffffff;text-align:center;padding:15px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">${label}</a>`;
}

function metaChip(label: string, value: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:10px">
    <tr><td style="padding:14px 16px">
      <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">${label}</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#0B0B0C">${value}</p>
    </td></tr>
  </table>`;
}

// ─── 1. Nuevo referido ────────────────────────────────────────────────────────

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
  const eyebrow = isCreator
    ? `Sistema · ${p.advisorName}`
    : `Programa de referidos`;

  return emailShell(`
    ${header(eyebrow)}
    <tr><td style="padding:32px 32px 20px">
      <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Nueva oportunidad</p>
      <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${p.leadName} quiere saber más</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">${p.referrerName} acaba de referir a un contacto interesado. Comunícate pronto — los leads frescos convierten mejor.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Contacto</p>
          <p style="margin:0 0 14px;font-size:19px;font-weight:700;color:#0B0B0C;letter-spacing:-0.01em">${p.leadName}</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:3px 0">
              <a href="tel:${p.leadPhone}" style="font-size:14px;color:#0B0B0C;font-weight:600;text-decoration:none">📱 ${p.leadPhone}</a>
            </td></tr>
            ${p.leadEmail ? `<tr><td style="padding:3px 0"><span style="font-size:14px;color:#5A626E">✉️ ${p.leadEmail}</span></td></tr>` : ""}
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
        <tr>
          <td width="50%" style="padding-right:8px">${metaChip("Referido por", p.referrerName)}</td>
          <td width="50%" style="padding-left:8px">${metaChip(`Premio #${p.tierPosition}`, formatMXN(p.rewardAmount))}</td>
        </tr>
      </table>

      ${pill(adminUrl, "Abrir en el panel →")}
    </td></tr>
    ${footer(`Referidoo — programa de referidos para asesores de seguros`)}
  `);
}

// ─── 2. Límite freemium ───────────────────────────────────────────────────────

type FreemiumLimitPayload = {
  advisorName: string;
  advisorEmail: string;
  referrerName: string;
  leadName: string;
  totalLeads: number;
};

function freemiumLimitHtml(p: FreemiumLimitPayload) {
  const upgradeUrl = `${BASE_URL}/admin/perfil`;

  return emailShell(`
    ${header("Plan Gratis")}
    <tr><td style="padding:32px 32px 20px">
      <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Límite de leads alcanzado</p>
      <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">Tienes un lead esperando — y no puedes verlo</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6"><strong style="color:#0B0B0C">${p.referrerName}</strong> acaba de referirte un contacto, pero ya alcanzaste los 12 leads del Plan Gratis. Necesitas Plan Pro para desbloquear sus datos y seguir recibiendo referidos.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px;border:2px dashed #DADCE0">
        <tr><td style="padding:24px;text-align:center">
          <p style="margin:0 0 8px;font-size:28px;line-height:1">🔒</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0B0B0C">Contacto bloqueado</p>
          <p style="margin:0;font-size:13px;color:#9098A2">Referido por ${p.referrerName} — se desbloquea al activar Pro</p>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0C;border-radius:12px;margin-bottom:24px">
        <tr><td style="padding:24px">
          <p style="margin:0 0 4px;font-size:11px;color:#6B727D;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Plan Pro</p>
          <p style="margin:0 0 18px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em">$539 <span style="font-size:14px;font-weight:400;color:#6B727D">MXN/mes</span></p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:5px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Leads ilimitados, sin tope</span></td></tr>
            <tr><td style="padding:5px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Datos completos de cada contacto</span></td></tr>
            <tr><td style="padding:5px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Comisiones escaladas y premios burbuja</span></td></tr>
            <tr><td style="padding:5px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Cartera de clientes ilimitada</span></td></tr>
            <tr><td style="padding:5px 0"><span style="font-size:14px;color:#2563EB;font-weight:600">✓&nbsp; Desbloquea el lead que acaba de llegar</span></td></tr>
          </table>
        </td></tr>
      </table>

      ${pill(upgradeUrl, "Activar Plan Pro →", "#2563EB")}
      <p style="margin:12px 0 0;font-size:13px;color:#9098A2;text-align:center">Perfil → Actualizar plan · Solo toma un minuto</p>
    </td></tr>
    ${footer("Este correo es automático de Referidoo")}
  `);
}

// ─── 3. Conversión cerrada ────────────────────────────────────────────────────

type ApprovedPayload = NewReferralPayload & {
  saleAmount?: number | null;
  launchBonusApplied?: boolean;
  productType?: string | null;
  lessioCommission?: number | null;
};

function referralApprovedHtml(p: ApprovedPayload, isCreator = false) {
  const adminUrl = `${BASE_URL}/admin/referidos`;

  const saleRow = p.saleAmount
    ? `<tr><td style="padding:3px 0"><span style="font-size:14px;color:#5A626E">💼&nbsp; Valor del plan: <strong style="color:#0B0B0C">${formatMXN(p.saleAmount)}</strong></span></td></tr>`
    : "";

  const commissionBlock = isCreator && p.lessioCommission
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Tu comisión Lessio${p.productType ? ` · ${p.productType}` : ""}</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#0B0B0C;letter-spacing:-0.02em">${formatMXN(p.lessioCommission)}</p>
        </td></tr>
      </table>`
    : "";

  const eyebrow = isCreator ? `Sistema · ${p.advisorName}` : `Notificación de conversión`;

  return emailShell(`
    ${header(eyebrow)}
    <tr><td style="padding:32px 32px 20px">
      <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Venta cerrada${p.launchBonusApplied ? " · Bono de lanzamiento aplicado" : ""}</p>
      <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${p.leadName} contrató un plan</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">El referido de <strong style="color:#0B0B0C">${p.referrerName}</strong> se convirtió en cliente. El Premio #${p.tierPosition} quedó registrado y listo para pagarse.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Cliente convertido</p>
          <p style="margin:0 0 14px;font-size:19px;font-weight:700;color:#0B0B0C;letter-spacing:-0.01em">${p.leadName}</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:3px 0">
              <a href="tel:${p.leadPhone}" style="font-size:14px;color:#0B0B0C;font-weight:600;text-decoration:none">📱 ${p.leadPhone}</a>
            </td></tr>
            ${p.leadEmail ? `<tr><td style="padding:3px 0"><span style="font-size:14px;color:#5A626E">✉️ ${p.leadEmail}</span></td></tr>` : ""}
            ${saleRow}
          </table>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td width="50%" style="padding-right:8px">${metaChip("Referido por", p.referrerName)}</td>
          <td width="50%" style="padding-left:8px">${metaChip(`Premio #${p.tierPosition}`, formatMXN(p.rewardAmount))}</td>
        </tr>
      </table>

      ${commissionBlock}

      ${pill(adminUrl, "Ver conversión en el panel →")}
    </td></tr>
    ${footer("Referidoo · Notificación automática de conversión")}
  `);
}

export async function sendReferralApprovedNotification(payload: ApprovedPayload) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — conversión no notificada. Payload:", payload);
    return;
  }

  const subject = `[Comisión${payload.launchBonusApplied ? " 🎯 BONO x2" : ""}] ${payload.advisorName} cerró — ${payload.leadName}${payload.saleAmount ? ` · Plan ${formatMXN(payload.saleAmount)}` : ""}`;

  const sends: Promise<unknown>[] = [];

  if (payload.advisorEmail && payload.advisorEmail !== CREATOR_EMAIL) {
    sends.push(resend.emails.send({
      from: FROM,
      to: [payload.advisorEmail],
      subject,
      html: referralApprovedHtml(payload, false),
    }));
  }

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

// ─── 4 & 5. Premio enviado + Solicitud de confirmación ───────────────────────

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
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px">
        <tr><td style="padding:18px 22px">
          <p style="margin:0 0 4px;font-size:11px;color:#166534;font-weight:700;letter-spacing:0.08em;text-transform:uppercase">Siguiente premio disponible</p>
          <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0B0B0C;letter-spacing:-0.02em">Premio #${p.nextTierPosition} — ${formatMXN(p.nextTierAmount)}</p>
          <p style="margin:0;font-size:13px;color:#166534;line-height:1.5">Confirma el #${p.tierPosition} y tu historial queda al día para seguir acumulando.</p>
        </td></tr>
      </table>`
    : `<p style="margin:0 0 20px;font-size:13px;color:#6B727D;text-align:center">Confirma que lo recibiste para mantener tu historial al día.</p>`;

  return emailShell(`
    ${header()}
    <tr><td style="padding:32px 32px 20px">
      <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">¡Tu premio llegó!</p>
      <h1 style="margin:0 0 4px;font-size:32px;font-weight:800;color:#0B0B0C;letter-spacing:-0.03em">${formatMXN(p.rewardAmount)}</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#6B727D">Premio #${p.tierPosition} por referir a ${p.leadName}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:18px 22px">
          <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Detalles del premio</p>
          <p style="margin:0 0 6px;font-size:14px;color:#3F4651;line-height:1.5">${p.advisorName} confirmó que <strong style="color:#0B0B0C">${p.leadName}</strong> contrató un plan. Tu Premio #${p.tierPosition} fue aprobado y enviado.</p>
          ${p.paymentNote ? `<p style="margin:0;font-size:12px;color:#9098A2">Referencia: ${p.paymentNote}</p>` : ""}
        </td></tr>
      </table>

      ${nextBlock}

      <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#0B0B0C;text-align:center">¿Ya lo recibiste?</p>
      <p style="margin:0 0 16px;font-size:13px;color:#6B727D;text-align:center">Confírmalo aquí — tarda menos de 10 segundos.</p>
      ${pill(p.portalUrl, "Sí, ya lo recibí ✓")}
      <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">¿No lo recibiste aún? Escríbele directamente a ${p.advisorName}.</p>
    </td></tr>
    ${footer("Referidoo — programa de referidos para asesores de seguros")}
  `);
}

function confirmationRequestHtml(p: PaymentPayload) {
  return emailShell(`
    ${header()}
    <tr><td style="padding:32px 32px 20px">
      <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">¿Ya recibiste tu premio?</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">${p.advisorName} confirmó el pago de <strong style="color:#0B0B0C">${formatMXN(p.rewardAmount)}</strong>. Confírmalo para que tu historial quede al día.</p>
      ${pill(p.portalUrl, "Confirmar que lo recibí ✓")}
      <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">¿No recibiste nada? Contacta a ${p.advisorName} directamente.</p>
    </td></tr>
    ${footer("Referidoo — notificación automática")}
  `);
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
      console.error(`[email] pago email [${i}] error Resend:`, (r.value as { error: unknown }).error);
    }
  });
}

export async function sendConfirmationRequest(payload: PaymentPayload) {
  if (!resend || !payload.referrerEmail) return;
  await resend.emails.send({
    from: FROM,
    to: [payload.referrerEmail],
    subject: `¿Recibiste tu premio de ${formatMXN(payload.rewardAmount)}?`,
    html: confirmationRequestHtml(payload),
  });
}

// ─── 6. Referente confirmó recepción ─────────────────────────────────────────

export async function sendReferrerConfirmedNotification(payload: {
  referrerName: string;
  advisorName: string;
  leadName: string;
  rewardAmount: number;
  saleAmount?: number | null;
}) {
  if (!resend) return;
  await resend.emails.send({
    from: FROM,
    to: [CREATOR_EMAIL],
    subject: `[Confirmado] ${payload.referrerName} confirmó su premio · ${payload.advisorName}`,
    html: emailShell(`
      ${header("Comisión verificada")}
      <tr><td style="padding:32px 32px 20px">
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${payload.referrerName} confirmó su premio</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B727D;line-height:1.6">El ciclo de pago está completo — el referente verificó la recepción de su dinero.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:20px 24px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:5px 0;border-bottom:1px solid #ECEDEF">
                <span style="font-size:13px;color:#6B727D">Asesor</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${payload.advisorName}</span>
              </td></tr>
              <tr><td style="padding:5px 0;border-bottom:1px solid #ECEDEF">
                <span style="font-size:13px;color:#6B727D">Lead convertido</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${payload.leadName}</span>
              </td></tr>
              <tr><td style="padding:5px 0;border-bottom:1px solid #ECEDEF">
                <span style="font-size:13px;color:#6B727D">Premio pagado</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#0B0B0C">${formatMXN(payload.rewardAmount)}</span>
              </td></tr>
              ${payload.saleAmount ? `<tr><td style="padding:5px 0">
                <span style="font-size:13px;color:#6B727D">Valor del plan</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#0B0B0C">${formatMXN(payload.saleAmount)}</span>
              </td></tr>` : ""}
            </table>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ Recepción confirmada por el referente</p>
          </td></tr>
        </table>
      </td></tr>
      ${footer("Referidoo · Notificación interna automática")}
    `),
  });
}

// ─── 7. Verificación de correo ────────────────────────────────────────────────

export async function sendVerificationEmail(payload: {
  advisorEmail: string;
  advisorName: string;
  verificationToken: string;
}) {
  const verifyUrl = `${BASE_URL}/verificar?token=${payload.verificationToken}`;

  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — verificación no enviada. Link:", verifyUrl);
    return;
  }

  console.log("[email] enviando verificación a:", payload.advisorEmail, "url:", verifyUrl);
  const result = await resend.emails.send({
    from: FROM,
    to: [payload.advisorEmail],
    subject: "Confirma tu correo en Referidoo",
    html: emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 20px">
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">Hola ${payload.advisorName}, confirma tu correo</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">Ya casi está listo. Confirma tu correo con el botón de abajo para empezar a agregar clientes y activar tu programa de referidos.</p>
        ${pill(verifyUrl, "Verificar mi correo →")}
        <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">Si no creaste esta cuenta en Referidoo, ignora este correo.</p>
      </td></tr>
      ${footer("Referidoo — plataforma de referidos para asesores de seguros")}
    `),
  });

  if (result.error) {
    console.error("[email] Resend rechazó verificación:", JSON.stringify(result.error));
  } else {
    console.log("[email] verificación enviada OK. id:", result.data?.id);
  }
}

// ─── 7b. Link al cliente (envío masivo Pro) ──────────────────────────────────

// Le manda a un cliente su link de portal para que empiece a referir. Lo usa
// el botón Pro "enviar link a todos". Devuelve ok para saber si contó el envío.
export async function sendClientLinkEmail(payload: {
  clientName: string;
  clientEmail: string;
  portalUrl: string;
  advisorName: string;
  companyName: string | null;
}): Promise<{ ok: boolean }> {
  const first = payload.clientName.split(" ")[0];
  const dePart = payload.companyName ?? payload.advisorName;

  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — link no enviado a", payload.clientEmail);
    return { ok: false };
  }

  const result = await resend.emails.send({
    from: FROM,
    to: [payload.clientEmail],
    subject: `${first}, aquí está tu link para ganar premios`,
    html: emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 20px">
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">Hola ${first} 👋</h1>
        <p style="margin:0 0 22px;font-size:14px;color:#6B727D;line-height:1.6">${dePart} te comparte tu link personal. Compártelo con tus amigos y familiares: cuando alguno contrate, ganas premios. Desde aquí ves tu avance en cualquier momento.</p>
        ${pill(payload.portalUrl, "Ver mi link y mis premios →")}
        <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">Es tu link privado — no lo pierdas.</p>
      </td></tr>
      ${footer("Referidoo — recompensas por recomendar a quienes quieres")}
    `),
  });

  if (result.error) {
    console.error("[email] Resend rechazó link de cliente:", JSON.stringify(result.error));
    return { ok: false };
  }
  return { ok: true };
}

// ─── 8. Burbuja reclamada (aviso interno) ────────────────────────────────────

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

  const recipients = [CREATOR_EMAIL];
  if (payload.advisorEmail && payload.advisorEmail !== CREATOR_EMAIL) {
    recipients.push(payload.advisorEmail);
  }

  await resend.emails.send({
    from: FROM,
    to: recipients,
    subject: `[Premios burbuja] ${payload.referrerName} reclamó ${formatMXN(payload.amount)}`,
    html: emailShell(`
      ${header("Premios burbuja")}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Acción requerida</p>
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${payload.referrerName} reclamó su premio burbuja</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">El referente acumuló <strong style="color:#0B0B0C">${formatMXN(payload.amount)}</strong> en premios de Auto + GMM y solicitó el pago. Revisa y marca como pagado desde el panel.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:18px 22px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:4px 0;border-bottom:1px solid #ECEDEF">
                <span style="font-size:13px;color:#6B727D">Referente</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${payload.referrerName}</span>
              </td></tr>
              <tr><td style="padding:4px 0;border-bottom:1px solid #ECEDEF">
                <span style="font-size:13px;color:#6B727D">Asesor</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${payload.advisorName}</span>
              </td></tr>
              <tr><td style="padding:4px 0">
                <span style="font-size:13px;color:#6B727D">Monto acumulado</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#0B0B0C">${formatMXN(payload.amount)}</span>
              </td></tr>
            </table>
          </td></tr>
        </table>

        ${pill(`${BASE_URL}/admin/niveles`, "Revisar y marcar como pagado →")}
      </td></tr>
      ${footer("Referidoo · Notificación interna automática")}
    `),
  }).catch((err) => console.error("[email] Error enviando reclamo de burbuja:", err));
}

// ─── 9. Burbuja pagada (al referente) ────────────────────────────────────────

export async function sendBubbleClaimPaidNotification(
  payload: BubbleClaimPayload & { paymentNote?: string | null }
) {
  if (!resend || !payload.referrerEmail) return;

  await resend.emails.send({
    from: FROM,
    to: [payload.referrerEmail],
    subject: `¡Tu premio burbuja de ${formatMXN(payload.amount)} fue enviado!`,
    html: emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">¡Premio enviado!</p>
        <h1 style="margin:0 0 4px;font-size:32px;font-weight:800;color:#0B0B0C;letter-spacing:-0.03em">${formatMXN(payload.amount)}</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D">Tu premio burbuja acumulado fue enviado</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:18px 22px">
            <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Detalles</p>
            <p style="margin:0 0 6px;font-size:14px;color:#3F4651;line-height:1.5">${payload.advisorName} envió tu premio acumulado por referir seguros de auto y gastos médicos mayores.</p>
            ${payload.paymentNote ? `<p style="margin:0;font-size:12px;color:#9098A2">Referencia de pago: ${payload.paymentNote}</p>` : ""}
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ Tu premio fue enviado exitosamente</p>
          </td></tr>
        </table>
      </td></tr>
      ${footer("Referidoo — programa de referidos para asesores de seguros")}
    `),
  }).catch((err) => console.error("[email] Error enviando pago de burbuja:", err));
}

// ─── Nuevo referido (exportado) ───────────────────────────────────────────────

export async function sendNewReferralNotification(
  payload: NewReferralPayload,
  options?: { skipAdvisor?: boolean }
) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — email no enviado. Payload:", payload);
    return;
  }

  const subject = `Nuevo referido: ${payload.leadName} vía ${payload.referrerName}`;
  const sends: Promise<unknown>[] = [];

  if (!options?.skipAdvisor) {
    sends.push(resend.emails.send({
      from: FROM,
      to: [payload.advisorEmail],
      subject,
      html: newReferralHtml(payload, false),
    }));
  }

  sends.push(resend.emails.send({
    from: FROM,
    to: [CREATOR_EMAIL],
    subject: `[Referidoo] ${subject}`,
    html: newReferralHtml(payload, true),
  }));

  await Promise.allSettled(sends);
}

// ─── Límite freemium (exportado) ──────────────────────────────────────────────

export async function sendFreemiumLimitEmail(payload: FreemiumLimitPayload) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — email de límite freemium no enviado. Payload:", payload);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to: [payload.advisorEmail],
    subject: `Tienes un nuevo lead esperando — activa Plan Pro`,
    html: freemiumLimitHtml(payload),
  });
}

// ─── 10. Programa de invitados: premio /unete ────────────────────────────────

export async function sendUneteRewardEmail(payload: {
  to: string;
  name: string;
  counterpartName: string;
  until: Date;
  side: "recruiter" | "recruit";
}) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — premio unete no notificado");
    return;
  }

  const firstName = payload.name.split(" ")[0];
  const untilStr = payload.until.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const isRecruiter = payload.side === "recruiter";

  const title = isRecruiter
    ? `${payload.counterpartName} cerró su primer cliente — y tú ganas`
    : "Cerraste tu primer cliente — este mes va por nuestra cuenta";
  const bodyText = isRecruiter
    ? `El colega que invitaste con tu link acaba de cerrar su primera venta en Referidoo. Lo prometido es deuda: <strong style="color:#0B0B0C">1 mes de Referidoo Pro gratis</strong> para ti.`
    : `Bono de arranque del programa de invitados: por cerrar tu primer cliente referido, tu primer mes de <strong style="color:#0B0B0C">Referidoo Pro</strong> corre por nuestra cuenta.`;
  const loopLine = isRecruiter
    ? "¿Otro colega que deba estar aquí? Cada invitado tuyo que cierre su primer cliente = otro mes de Pro gratis."
    : "Tú también puedes invitar: tu link personal está en tu panel — cada colega que cierre su primer cliente te gana 1 mes de Pro.";

  await resend.emails.send({
    from: FROM,
    to: [payload.to],
    subject: isRecruiter
      ? `Te ganaste 1 mes de Pro — ${payload.counterpartName} ya cerró 🎉`
      : "Tu primer mes de Pro es gratis 🎉",
    html: emailShell(`
      ${header("Programa de invitados")}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Hola ${firstName}</p>
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${title}</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B727D;line-height:1.6">${bodyText}</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0C;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:24px">
            <p style="margin:0 0 4px;font-size:11px;color:#6B727D;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Referidoo Pro</p>
            <p style="margin:0 0 4px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em">1 mes gratis</p>
            <p style="margin:0 0 16px;font-size:13px;color:#9098A2">Activo hasta el ${untilStr}</p>
            <table cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Leads ilimitados en tu pipeline</span></td></tr>
              <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Premios burbuja (Auto y GMM)</span></td></tr>
              <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Comisiones reducidas en todos los productos</span></td></tr>
            </table>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:16px 20px">
            <p style="margin:0;font-size:13px;font-weight:600;color:#166534;line-height:1.5">${loopLine}</p>
          </td></tr>
        </table>

        ${pill(`${BASE_URL}/admin`, "Abrir mi panel →", "#2563EB")}
      </td></tr>
      ${footer("Referidoo · Programa de invitados")}
    `),
  }).catch((err) => console.error("[email] Error enviando premio unete:", err));
}

// ─── 11. Recordatorio: premio burbuja listo (al cliente) ─────────────────────

export async function sendBubbleReadyReminder(payload: {
  referrerName: string;
  referrerEmail: string;
  amount: number;
  portalUrl: string;
  advisorName: string;
}) {
  if (!resend) return;
  const firstName = payload.referrerName.split(" ")[0];

  await resend.emails.send({
    from: FROM,
    to: [payload.referrerEmail],
    subject: `${firstName}, tienes ${formatMXN(payload.amount)} listos para reclamar`,
    html: emailShell(`
      ${header("Premios burbuja")}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Tu burbuja se llenó</p>
        <h1 style="margin:0 0 4px;font-size:32px;font-weight:800;color:#0B0B0C;letter-spacing:-0.03em">${formatMXN(payload.amount)}</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">Están esperándote en tu página. Reclámalos con un clic y ${payload.advisorName} te envía tu premio.</p>
        ${pill(payload.portalUrl, "Reclamar mi premio →", "#2563EB")}
        <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">Y tu burbuja se sigue llenando con cada recomendación que hagas.</p>
      </td></tr>
      ${footer("Referidoo — programa de referidos para asesores de seguros")}
    `),
  }).catch((err) => console.error("[email] Error enviando recordatorio de burbuja:", err));
}

// ─── 12. Resumen mensual de progreso (al cliente) ────────────────────────────

export async function sendMonthlyProgressEmail(payload: {
  referrerName: string;
  referrerEmail: string;
  advisorName: string;
  portalUrl: string;
  bubblePoints: number;
  bubbleThreshold: number;
  nextTierPosition?: number | null;
  nextTierAmount?: number | null;
}) {
  if (!resend) return;
  const firstName = payload.referrerName.split(" ")[0];
  const faltan = Math.max(0, payload.bubbleThreshold - (payload.bubblePoints % payload.bubbleThreshold || payload.bubbleThreshold));

  const bubbleChip = payload.bubblePoints > 0
    ? metaChip("Tu burbuja", `${payload.bubblePoints} / ${payload.bubbleThreshold} pts${payload.bubblePoints >= payload.bubbleThreshold ? " — ¡lista para reclamar!" : faltan > 0 ? ` — te faltan ${faltan}` : ""}`)
    : metaChip("Tu burbuja", "Se llena con cada seguro de Auto o GMM que recomiendes");

  const nextPrizeChip = payload.nextTierAmount && payload.nextTierPosition
    ? metaChip(`Tu siguiente premio (#${payload.nextTierPosition})`, formatMXN(payload.nextTierAmount))
    : metaChip("Tu siguiente premio", "Pregúntale a tu asesor");

  await resend.emails.send({
    from: FROM,
    to: [payload.referrerEmail],
    subject: `${firstName}, así va tu premio con ${payload.advisorName}`,
    html: emailShell(`
      ${header("Tu progreso del mes")}
      <tr><td style="padding:32px 32px 20px">
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">Tu premio no se olvida de ti, ${firstName}</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B727D;line-height:1.6">Así vas este mes en el programa de referidos de ${payload.advisorName}:</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
          <tr>
            <td width="50%" style="padding-right:8px">${bubbleChip}</td>
            <td width="50%" style="padding-left:8px">${nextPrizeChip}</td>
          </tr>
        </table>

        <p style="margin:0 0 16px;font-size:14px;color:#3F4651;line-height:1.6;text-align:center">¿Conoces a alguien que necesite un seguro? Compártele tu link desde tu página — <strong style="color:#0B0B0C">cada recomendación te acerca a tu premio</strong>.</p>
        ${pill(payload.portalUrl, "Ver mi progreso →")}
      </td></tr>
      ${footer("Recibes este resumen una vez al mes · Referidoo")}
    `),
  }).catch((err) => console.error("[email] Error enviando resumen mensual:", err));
}

// ─── 13. Premio vencido (recordatorio / morosidad al asesor) ─────────────────

export async function sendRewardOverdueEmail(payload: {
  advisorName: string;
  advisorEmail: string;
  referrerName: string;
  amount: number;
  kind: "escalera" | "burbuja";
  level: "recordatorio" | "firme";
  daysOverdue: number;
}) {
  if (!resend) return;
  const firstName = payload.advisorName.split(" ")[0];
  const firme = payload.level === "firme";
  const que = payload.kind === "burbuja" ? "premio burbuja reclamado" : "premio de escalera aprobado";

  const cuerpo = firme
    ? `El ${que} de <strong style="color:#0B0B0C">${payload.referrerName}</strong> lleva <strong style="color:#0B0B0C">${payload.daysOverdue} días sin pagarse</strong>. A partir de los 14 días esto cuenta como morosidad en la plataforma: aparece marcado en tu historial y, si se repite, pausa tu programa de premios. Tu cliente confió en tu promesa — es lo que sostiene tus referidos.`
    : `El ${que} de <strong style="color:#0B0B0C">${payload.referrerName}</strong> lleva ${payload.daysOverdue} días esperando. Un premio pagado rápido es tu mejor publicidad — es el momento exacto en el que tu cliente decide si te recomienda de nuevo.`;

  await resend.emails.send({
    from: FROM,
    to: [payload.advisorEmail],
    subject: firme
      ? `⚠️ Premio de ${formatMXN(payload.amount)} con ${payload.daysOverdue} días vencido — ${payload.referrerName}`
      : `Recordatorio: ${payload.referrerName} espera su premio de ${formatMXN(payload.amount)}`,
    html: emailShell(`
      ${header(firme ? "Morosidad" : "Recordatorio de pago")}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:${firme ? "#B45309" : "#6B727D"};font-weight:600">${firme ? "Acción requerida hoy" : `Hola ${firstName}`}</p>
        <h1 style="margin:0 0 4px;font-size:30px;font-weight:800;color:#0B0B0C;letter-spacing:-0.03em">${formatMXN(payload.amount)}</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B727D">pendiente de pagar a ${payload.referrerName}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${firme ? "#fdf3e7" : "#F4F5F7"};border-radius:12px;margin-bottom:24px${firme ? ";border:1px solid #f5d0a9" : ""}">
          <tr><td style="padding:18px 22px">
            <p style="margin:0;font-size:14px;color:#3F4651;line-height:1.6">${cuerpo}</p>
          </td></tr>
        </table>
        ${pill(`${BASE_URL}/admin/${payload.kind === "burbuja" ? "niveles" : "referidos"}`, "Pagar y marcar como pagado →", firme ? "#B45309" : "#0B0B0C")}
        <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">Si tu cliente ya guardó su CLABE en su portal, la verás al momento de pagar.</p>
      </td></tr>
      ${footer("Referidoo · Política de premios: recordatorio a los 7 días, morosidad a los 14")}
    `),
  }).catch((err) => console.error("[email] Error enviando premio vencido:", err));
}

// ─── Preview helper (solo test/desarrollo) ───────────────────────────────────

export async function sendPreviewEmailsTo(to: string): Promise<Record<string, string>> {
  if (!resend) return { error: "RESEND_API_KEY no configurado" };

  const BASE = BASE_URL;
  const results: Record<string, string> = {};

  const send = async (
    name: string,
    subject: string,
    html: string,
  ) => {
    const r = await resend.emails.send({ from: FROM, to: [to], subject, html });
    results[name] = r.error ? `✗ ${JSON.stringify(r.error)}` : `✓ id:${r.data?.id}`;
  };

  const ref = {
    advisorName: "Carlos Méndez",
    advisorEmail: to,
    referrerName: "Ana García",
    leadName: "Roberto Flores",
    leadPhone: "55 1234 5678",
    leadEmail: "roberto@ejemplo.com",
    rewardAmount: 800,
    tierPosition: 3,
  };

  const pay = {
    referrerName: "Ana García",
    referrerEmail: to,
    advisorName: "Carlos Méndez",
    advisorEmail: to,
    leadName: "Roberto Flores",
    rewardAmount: 800,
    portalUrl: `${BASE}/c/demo-token`,
    tierPosition: 3,
    nextTierPosition: 4 as number | null,
    nextTierAmount: 1200 as number | null,
    paymentNote: "SPEI · Ref. 20240702",
  };

  await send("1-nuevo-referido", `Nuevo referido: ${ref.leadName} vía ${ref.referrerName}`, newReferralHtml(ref, false));
  await send("2-limite-freemium", "Tienes un nuevo lead esperando — activa Plan Pro", freemiumLimitHtml({ advisorName: ref.advisorName, advisorEmail: to, referrerName: ref.referrerName, leadName: ref.leadName, totalLeads: 13 }));
  await send("3-conversion-cerrada", `[Comisión] ${ref.advisorName} cerró — ${ref.leadName} · Plan ${formatMXN(18000)}`, referralApprovedHtml({ ...ref, saleAmount: 18000, productType: "Vida PPR", lessioCommission: 2700 }, true));
  await send("4-premio-enviado", `¡Tu premio de ${formatMXN(pay.rewardAmount)} está en camino!`, paymentSentHtml(pay));
  await send("5-solicitud-confirmacion", `¿Recibiste tu premio de ${formatMXN(pay.rewardAmount)}?`, confirmationRequestHtml({ ...pay, nextTierPosition: null, nextTierAmount: null }));

  await send("6-referente-confirmo", `[Confirmado] ${ref.referrerName} confirmó su premio · ${ref.advisorName}`,
    emailShell(`
      ${header("Comisión verificada")}
      <tr><td style="padding:32px 32px 20px">
        <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${ref.referrerName} confirmó su premio</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#6B727D;line-height:1.6">El ciclo de pago está completo — el referente verificó la recepción de su dinero.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:20px 24px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:5px 0;border-bottom:1px solid #ECEDEF"><span style="font-size:13px;color:#6B727D">Asesor</span><span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${ref.advisorName}</span></td></tr>
              <tr><td style="padding:5px 0;border-bottom:1px solid #ECEDEF"><span style="font-size:13px;color:#6B727D">Lead convertido</span><span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${ref.leadName}</span></td></tr>
              <tr><td style="padding:5px 0;border-bottom:1px solid #ECEDEF"><span style="font-size:13px;color:#6B727D">Premio pagado</span><span style="float:right;font-size:13px;font-weight:700;color:#0B0B0C">${formatMXN(800)}</span></td></tr>
              <tr><td style="padding:5px 0"><span style="font-size:13px;color:#6B727D">Valor del plan</span><span style="float:right;font-size:13px;font-weight:700;color:#0B0B0C">${formatMXN(18000)}</span></td></tr>
            </table>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:16px 20px"><p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ Recepción confirmada por el referente</p></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:12px;color:#9098A2;text-align:center;line-height:1.6">Referidoo · Notificación interna automática</p></td></tr>
    `)
  );

  await send("7-verificacion-correo", "Confirma tu correo en Referidoo",
    emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 20px">
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">Hola ${ref.advisorName}, confirma tu correo</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">Ya casi está listo. Confirma tu correo con el botón de abajo para empezar a agregar clientes y activar tu programa de referidos.</p>
        <a href="${BASE}/verificar?token=tok_demo_123abc" style="display:block;background:#0B0B0C;color:#ffffff;text-align:center;padding:15px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">Verificar mi correo →</a>
        <p style="margin:14px 0 0;font-size:12px;color:#9098A2;text-align:center">Si no creaste esta cuenta en Referidoo, ignora este correo.</p>
      </td></tr>
      <tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:12px;color:#9098A2;text-align:center;line-height:1.6">Referidoo — plataforma de referidos para asesores de seguros</p></td></tr>
    `)
  );

  await send("8-burbuja-reclamada", `[Premios burbuja] ${ref.referrerName} reclamó ${formatMXN(1500)}`,
    emailShell(`
      ${header("Premios burbuja")}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">Acción requerida</p>
        <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#0B0B0C;line-height:1.25;letter-spacing:-0.02em">${ref.referrerName} reclamó su premio burbuja</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D;line-height:1.6">El referente acumuló <strong style="color:#0B0B0C">${formatMXN(1500)}</strong> en premios de Auto + GMM y solicitó el pago.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:18px 22px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:4px 0;border-bottom:1px solid #ECEDEF"><span style="font-size:13px;color:#6B727D">Referente</span><span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${ref.referrerName}</span></td></tr>
              <tr><td style="padding:4px 0;border-bottom:1px solid #ECEDEF"><span style="font-size:13px;color:#6B727D">Asesor</span><span style="float:right;font-size:13px;font-weight:600;color:#0B0B0C">${ref.advisorName}</span></td></tr>
              <tr><td style="padding:4px 0"><span style="font-size:13px;color:#6B727D">Monto acumulado</span><span style="float:right;font-size:13px;font-weight:700;color:#0B0B0C">${formatMXN(1500)}</span></td></tr>
            </table>
          </td></tr>
        </table>
        <a href="${BASE}/admin/niveles" style="display:block;background:#0B0B0C;color:#ffffff;text-align:center;padding:15px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">Revisar y marcar como pagado →</a>
      </td></tr>
      <tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:12px;color:#9098A2;text-align:center;line-height:1.6">Referidoo · Notificación interna automática</p></td></tr>
    `)
  );

  await send("9-burbuja-pagada", `¡Tu premio burbuja de ${formatMXN(1500)} fue enviado!`,
    emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 20px">
        <p style="margin:0 0 8px;font-size:13px;color:#6B727D;font-weight:500">¡Premio enviado!</p>
        <h1 style="margin:0 0 4px;font-size:32px;font-weight:800;color:#0B0B0C;letter-spacing:-0.03em">${formatMXN(1500)}</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#6B727D">Tu premio burbuja acumulado fue enviado</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:18px 22px">
            <p style="margin:0 0 2px;font-size:11px;color:#9098A2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Detalles</p>
            <p style="margin:0 0 6px;font-size:14px;color:#3F4651;line-height:1.5">${ref.advisorName} envió tu premio acumulado por referir seguros de auto y gastos médicos mayores.</p>
            <p style="margin:0;font-size:12px;color:#9098A2">Referencia de pago: SPEI · Ref. 20240702</p>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:16px 20px"><p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ Tu premio fue enviado exitosamente</p></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 28px"><p style="margin:0;font-size:12px;color:#9098A2;text-align:center;line-height:1.6">Referidoo — programa de referidos para asesores de seguros</p></td></tr>
    `)
  );

  return results;
}
