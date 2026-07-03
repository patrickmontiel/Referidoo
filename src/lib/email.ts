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
<body style="margin:0;padding:0;background:#f4f3f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e7e4">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function header(sublabel?: string) {
  return `<tr>
    <td style="background:#0d0d0d;padding:22px 32px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <span style="font-size:18px;font-weight:700;letter-spacing:-0.025em;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">referidoo</span><span style="font-size:18px;font-weight:700;color:#2B57F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">.</span>
          </td>
          ${sublabel ? `<td align="right"><span style="font-size:11px;color:#6b727d;font-weight:500;letter-spacing:0.04em">${sublabel}</span></td>` : ""}
        </tr>
      </table>
    </td>
  </tr>`;
}

function footer(text: string) {
  return `<tr>
    <td style="padding:0 32px 28px">
      <p style="margin:0;font-size:12px;color:#9098a2;text-align:center;line-height:1.6">${text}</p>
    </td>
  </tr>`;
}

function pill(href: string, label: string, bg = "#0d0d0d") {
  return `<a href="${href}" style="display:block;background:${bg};color:#ffffff;text-align:center;padding:15px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">${label}</a>`;
}

function metaChip(label: string, value: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:10px">
    <tr><td style="padding:14px 16px">
      <p style="margin:0 0 2px;font-size:11px;color:#9098a2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">${label}</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#0d0d0d">${value}</p>
    </td></tr>
  </table>`;
}

function divider() {
  return `<tr><td style="padding:0 32px"><div style="height:1px;background:#f0ede9"></div></td></tr>`;
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
  const eyebrow = isCreator ? `Sistema · ${p.advisorName}` : `Programa de referidos`;

  return emailShell(`
    ${header(eyebrow)}
    <tr><td style="padding:32px 32px 24px">
      <p style="margin:0 0 8px;font-size:13px;color:#2B57F0;font-weight:600;letter-spacing:0.02em">Nueva oportunidad</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">${p.leadName} quiere saber más</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#52525b;line-height:1.65"><strong style="color:#0d0d0d">${p.referrerName}</strong> acaba de referirte un contacto. Comunícate hoy — los primeros en responder convierten más.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px;margin-bottom:20px">
        <tr><td style="padding:22px 24px">
          <p style="margin:0 0 3px;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Contacto</p>
          <p style="margin:0 0 14px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em">${p.leadName}</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#ffffff">${p.leadPhone}</p>
          ${p.leadEmail ? `<p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">${p.leadEmail}</p>` : ""}
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td width="50%" style="padding-right:6px">${metaChip("Referido por", p.referrerName)}</td>
          <td width="50%" style="padding-left:6px">${metaChip(`Premio #${p.tierPosition}`, formatMXN(p.rewardAmount))}</td>
        </tr>
      </table>

      ${pill(adminUrl, "Abrir en el panel →")}
    </td></tr>
    ${footer("Referidoo — programa de referidos para asesores de seguros")}
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
    <tr><td style="padding:32px 32px 24px">
      <p style="margin:0 0 8px;font-size:13px;color:#d97706;font-weight:600;letter-spacing:0.02em">Límite alcanzado</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">Tienes un lead esperando — y no puedes verlo</h1>
      <p style="margin:0 0 28px;font-size:14px;color:#52525b;line-height:1.65"><strong style="color:#0d0d0d">${p.referrerName}</strong> acaba de referirte un contacto, pero ya alcanzaste los 12 leads del Plan Gratis. Activa Pro para ver sus datos y seguir creciendo.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:20px;border:2px dashed #d4d0c8">
        <tr><td style="padding:24px;text-align:center">
          <p style="margin:0 0 6px;font-size:28px;line-height:1">🔒</p>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0d0d0d">Contacto bloqueado</p>
          <p style="margin:0;font-size:13px;color:#71717a">Referido por ${p.referrerName} — se desbloquea con Plan Pro</p>
        </td></tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:12px;margin-bottom:24px">
        <tr><td style="padding:24px">
          <p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,.4);font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Plan Pro</p>
          <p style="margin:0 0 18px;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.02em">$539 <span style="font-size:14px;font-weight:400;color:rgba(255,255,255,.4)">MXN/mes</span></p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Leads ilimitados, sin tope</span></td></tr>
            <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Datos completos de cada contacto</span></td></tr>
            <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Comisiones escaladas y premios burbuja</span></td></tr>
            <tr><td style="padding:4px 0"><span style="font-size:14px;color:#ffffff">✓&nbsp; Cartera de clientes ilimitada</span></td></tr>
            <tr><td style="padding:4px 0"><span style="font-size:14px;color:#2B57F0;font-weight:600">✓&nbsp; Desbloquea el lead que acaba de llegar</span></td></tr>
          </table>
        </td></tr>
      </table>

      ${pill(upgradeUrl, "Activar Plan Pro →", "#2B57F0")}
      <p style="margin:12px 0 0;font-size:13px;color:#9098a2;text-align:center">Perfil → Actualizar plan · Solo toma un minuto</p>
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
  const bonusNote = p.launchBonusApplied ? " · Bono de inicio aplicado" : "";

  const saleRow = p.saleAmount
    ? `<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,.5)">Valor del plan: <strong style="color:rgba(255,255,255,.8)">${formatMXN(p.saleAmount)}</strong>${p.productType ? ` · ${p.productType}` : ""}</p>`
    : "";

  const commissionBlock = isCreator && p.lessioCommission
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 2px;font-size:11px;color:#9098a2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Comisión Lessio${p.productType ? ` · ${p.productType}` : ""}</p>
          <p style="margin:0;font-size:24px;font-weight:800;color:#0d0d0d;letter-spacing:-0.02em">${formatMXN(p.lessioCommission)}</p>
        </td></tr>
      </table>`
    : "";

  const eyebrow = isCreator ? `Sistema · ${p.advisorName}` : `Notificación de conversión`;

  const heroBlock = isCreator
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px;margin-bottom:20px">
        <tr><td style="padding:22px 24px">
          <p style="margin:0 0 3px;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Cliente convertido</p>
          <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em">${p.leadName}</p>
          <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.5)">${p.leadPhone}</p>
          ${saleRow}
        </td></tr>
      </table>`
    : `<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px;margin-bottom:20px">
        <tr><td style="padding:22px 24px">
          <p style="margin:0 0 3px;font-size:11px;color:rgba(255,255,255,.45);font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Premio ganado</p>
          <p style="margin:0 0 4px;font-size:32px;font-weight:800;color:#ffffff;letter-spacing:-0.03em">${formatMXN(p.rewardAmount)}</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">Premio #${p.tierPosition} · ${p.leadName} contrató un plan</p>
          ${saleRow}
        </td></tr>
      </table>`;

  return emailShell(`
    ${header(eyebrow)}
    <tr><td style="padding:32px 32px 24px">
      <p style="margin:0 0 8px;font-size:13px;color:#16a34a;font-weight:600;letter-spacing:0.02em">Venta cerrada${bonusNote}</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">${p.leadName} contrató un plan</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.65">El referido de <strong style="color:#0d0d0d">${p.referrerName}</strong> se convirtió en cliente.${isCreator ? " El Premio #" + p.tierPosition + " quedó registrado y listo para pagarse." : " Tu premio está registrado — " + p.advisorName + " te lo enviará pronto."}</p>

      ${heroBlock}

      ${isCreator ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
        <tr>
          <td width="50%" style="padding-right:6px">${metaChip("Referido por", p.referrerName)}</td>
          <td width="50%" style="padding-left:6px">${metaChip(`Premio #${p.tierPosition}`, formatMXN(p.rewardAmount))}</td>
        </tr>
      </table>` : ""}

      ${commissionBlock}

      ${pill(adminUrl, isCreator ? "Ver conversión en el panel →" : "Ver mi panel →")}
    </td></tr>
    ${footer("Referidoo · Notificación automática de conversión")}
  `);
}

export async function sendReferralApprovedNotification(payload: ApprovedPayload) {
  if (!resend) {
    console.log("[email] RESEND_API_KEY no configurado — conversión no notificada. Payload:", payload);
    return;
  }

  const subject = `[Comisión${payload.launchBonusApplied ? " ★ BONO x2" : ""}] ${payload.advisorName} cerró — ${payload.leadName}${payload.saleAmount ? ` · Plan ${formatMXN(payload.saleAmount)}` : ""}`;

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
          <p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0d0d0d;letter-spacing:-0.02em">Premio #${p.nextTierPosition} — ${formatMXN(p.nextTierAmount)}</p>
          <p style="margin:0;font-size:13px;color:#166534;line-height:1.5">Confirma este y tu historial queda al día para seguir acumulando.</p>
        </td></tr>
      </table>`
    : "";

  return emailShell(`
    ${header()}
    <tr><td style="padding:32px 32px 8px">
      <p style="margin:0 0 6px;font-size:13px;color:#16a34a;font-weight:600;letter-spacing:0.02em">¡Tu premio llegó!</p>
    </td></tr>
    <tr><td style="padding:0 32px 24px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px">
        <tr><td style="padding:28px 28px 24px;text-align:center">
          <p style="margin:0 0 6px;font-size:44px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1">${formatMXN(p.rewardAmount)}</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">Premio #${p.tierPosition} por referir a ${p.leadName}</p>
        </td></tr>
      </table>
    </td></tr>
    ${divider()}
    <tr><td style="padding:24px 32px">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:20px">
        <tr><td style="padding:18px 22px">
          <p style="margin:0 0 2px;font-size:11px;color:#9098a2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Detalles del pago</p>
          <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5"><strong style="color:#0d0d0d">${p.advisorName}</strong> confirmó que ${p.leadName} contrató un plan y aprobó tu Premio #${p.tierPosition}.</p>
          ${p.paymentNote ? `<p style="margin:6px 0 0;font-size:12px;color:#9098a2">Referencia: ${p.paymentNote}</p>` : ""}
        </td></tr>
      </table>

      ${nextBlock}

      <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#0d0d0d;text-align:center">¿Ya lo recibiste?</p>
      <p style="margin:0 0 16px;font-size:13px;color:#71717a;text-align:center">Confírmalo para mantener tu historial al día. Tarda menos de 10 segundos.</p>
      ${pill(p.portalUrl, "Sí, ya lo recibí ✓", "#2B57F0")}
      <p style="margin:14px 0 0;font-size:12px;color:#9098a2;text-align:center">¿No lo recibiste aún? Escríbele directamente a ${p.advisorName}.</p>
    </td></tr>
    ${footer("Referidoo — programa de referidos para asesores de seguros")}
  `);
}

function confirmationRequestHtml(p: PaymentPayload) {
  return emailShell(`
    ${header()}
    <tr><td style="padding:32px 32px 24px">
      <p style="margin:0 0 8px;font-size:13px;color:#d97706;font-weight:600;letter-spacing:0.02em">Pendiente de confirmar</p>
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">¿Ya recibiste tu premio?</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.65">${p.advisorName} confirmó que envió <strong style="color:#0d0d0d">${formatMXN(p.rewardAmount)}</strong> por referir a ${p.leadName}. Solo falta que lo confirmes de tu lado.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px;margin-bottom:20px">
        <tr><td style="padding:22px 28px;text-align:center">
          <p style="margin:0 0 4px;font-size:36px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1">${formatMXN(p.rewardAmount)}</p>
          <p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">Premio #${p.tierPosition} · ${p.leadName}</p>
        </td></tr>
      </table>

      ${pill(p.portalUrl, "Confirmar que lo recibí ✓", "#2B57F0")}
      <p style="margin:14px 0 0;font-size:12px;color:#9098a2;text-align:center">¿No recibiste nada? Contacta a ${p.advisorName} directamente.</p>
    </td></tr>
    ${footer("Referidoo · Notificación automática")}
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
    subject: `¿Recibiste tu premio de ${formatMXN(payload.rewardAmount)}? Confírmalo`,
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
      ${header("Ciclo completo")}
      <tr><td style="padding:32px 32px 24px">
        <p style="margin:0 0 8px;font-size:13px;color:#16a34a;font-weight:600;letter-spacing:0.02em">Ciclo de pago cerrado</p>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">${payload.referrerName} confirmó su premio</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.65">El referente verificó la recepción del dinero. El ciclo está completo.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:20px 24px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:6px 0;border-bottom:1px solid #e8e7e4">
                <span style="font-size:13px;color:#71717a">Asesor</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${payload.advisorName}</span>
              </td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #e8e7e4">
                <span style="font-size:13px;color:#71717a">Lead convertido</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${payload.leadName}</span>
              </td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #e8e7e4">
                <span style="font-size:13px;color:#71717a">Premio pagado</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#0d0d0d">${formatMXN(payload.rewardAmount)}</span>
              </td></tr>
              ${payload.saleAmount ? `<tr><td style="padding:6px 0">
                <span style="font-size:13px;color:#71717a">Valor del plan</span>
                <span style="float:right;font-size:13px;font-weight:700;color:#0d0d0d">${formatMXN(payload.saleAmount)}</span>
              </td></tr>` : ""}
            </table>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:14px 20px">
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
    subject: "Confirma tu correo para activar Referidoo",
    html: emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 24px">
        <p style="margin:0 0 8px;font-size:13px;color:#2B57F0;font-weight:600;letter-spacing:0.02em">Un paso más</p>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">Hola ${payload.advisorName}, confirma tu correo</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#52525b;line-height:1.65">Tu cuenta está casi lista. Confirma tu correo para empezar a agregar clientes, compartir tu programa de referidos y recibir notificaciones de nuevos leads.</p>
        ${pill(verifyUrl, "Confirmar mi correo →", "#2B57F0")}
        <p style="margin:14px 0 0;font-size:12px;color:#9098a2;text-align:center">Si no creaste esta cuenta en Referidoo, ignora este correo.</p>
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
      <tr><td style="padding:32px 32px 24px">
        <p style="margin:0 0 8px;font-size:13px;color:#d97706;font-weight:600;letter-spacing:0.02em">Acción requerida</p>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">${payload.referrerName} reclamó su premio burbuja</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.65">El referente acumuló <strong style="color:#0d0d0d">${formatMXN(payload.amount)}</strong> en premios de Auto + GMM y solicitó el pago. Revisa y marca como pagado desde el panel.</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:18px 22px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:5px 0;border-bottom:1px solid #e8e7e4">
                <span style="font-size:13px;color:#71717a">Referente</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${payload.referrerName}</span>
              </td></tr>
              <tr><td style="padding:5px 0;border-bottom:1px solid #e8e7e4">
                <span style="font-size:13px;color:#71717a">Asesor</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${payload.advisorName}</span>
              </td></tr>
              <tr><td style="padding:5px 0">
                <span style="font-size:13px;color:#71717a">Monto acumulado</span>
                <span style="float:right;font-size:14px;font-weight:700;color:#0d0d0d">${formatMXN(payload.amount)}</span>
              </td></tr>
            </table>
          </td></tr>
        </table>

        ${pill(`${BASE_URL}/admin/referidos`, "Revisar y marcar como pagado →")}
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
      <tr><td style="padding:32px 32px 8px">
        <p style="margin:0 0 6px;font-size:13px;color:#16a34a;font-weight:600;letter-spacing:0.02em">¡Premio enviado!</p>
      </td></tr>
      <tr><td style="padding:0 32px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px">
          <tr><td style="padding:28px 28px 24px;text-align:center">
            <p style="margin:0 0 6px;font-size:44px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1">${formatMXN(payload.amount)}</p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">Premio burbuja acumulado</p>
          </td></tr>
        </table>
      </td></tr>
      ${divider()}
      <tr><td style="padding:24px 32px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:18px 22px">
            <p style="margin:0 0 2px;font-size:11px;color:#9098a2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Detalles del pago</p>
            <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5"><strong style="color:#0d0d0d">${payload.advisorName}</strong> envió tu premio acumulado por referir seguros de auto y gastos médicos.</p>
            ${payload.paymentNote ? `<p style="margin:6px 0 0;font-size:12px;color:#9098a2">Referencia: ${payload.paymentNote}</p>` : ""}
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:14px 20px">
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

// ─── Preview helper (solo test/desarrollo) ───────────────────────────────────

export async function sendPreviewEmailsTo(to: string): Promise<Record<string, string>> {
  if (!resend) return { error: "RESEND_API_KEY no configurado" };

  const BASE = BASE_URL;
  const results: Record<string, string> = {};

  const send = async (name: string, subject: string, html: string) => {
    const r = await resend.emails.send({ from: FROM, to: [to], subject, html });
    results[name] = r.error ? `✗ ${JSON.stringify(r.error)}` : `✓ id:${r.data?.id}`;
  };

  const ref: NewReferralPayload = {
    advisorName: "Carlos Méndez",
    advisorEmail: to,
    referrerName: "Ana García",
    leadName: "Roberto Flores",
    leadPhone: "55 1234 5678",
    leadEmail: "roberto@ejemplo.com",
    rewardAmount: 1500,
    tierPosition: 1,
  };

  const pay: PaymentPayload = {
    referrerName: "Ana García",
    referrerEmail: to,
    advisorName: "Carlos Méndez",
    advisorEmail: to,
    leadName: "Roberto Flores",
    rewardAmount: 1500,
    portalUrl: `${BASE}/c/demo-token`,
    tierPosition: 1,
    nextTierPosition: 2 as number | null,
    nextTierAmount: 1500 as number | null,
    paymentNote: "SPEI · Ref. 20240702",
  };

  await send("1-nuevo-referido", `Nuevo referido: ${ref.leadName} vía ${ref.referrerName}`, newReferralHtml(ref, false));
  await send("2-limite-freemium", "Tienes un nuevo lead esperando — activa Plan Pro", freemiumLimitHtml({ advisorName: ref.advisorName, advisorEmail: to, referrerName: ref.referrerName, leadName: ref.leadName, totalLeads: 13 }));
  await send("3-conversion-advisor", `¡${ref.leadName} contrató un plan!`, referralApprovedHtml({ ...ref, saleAmount: 18000, productType: "PPR", lessioCommission: 2700 }, false));
  await send("3-conversion-creator", `[Comisión] ${ref.advisorName} cerró — ${ref.leadName} · Plan ${formatMXN(18000)}`, referralApprovedHtml({ ...ref, saleAmount: 18000, productType: "PPR", lessioCommission: 2700 }, true));
  await send("4-premio-enviado", `¡Tu premio de ${formatMXN(pay.rewardAmount)} está en camino!`, paymentSentHtml(pay));
  await send("5-solicitud-confirmacion", `¿Recibiste tu premio de ${formatMXN(pay.rewardAmount)}? Confírmalo`, confirmationRequestHtml({ ...pay, nextTierPosition: null, nextTierAmount: null }));

  await send("6-referente-confirmo", `[Confirmado] ${ref.referrerName} confirmó su premio · ${ref.advisorName}`,
    emailShell(`
      ${header("Ciclo completo")}
      <tr><td style="padding:32px 32px 24px">
        <p style="margin:0 0 8px;font-size:13px;color:#16a34a;font-weight:600;letter-spacing:0.02em">Ciclo de pago cerrado</p>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">${ref.referrerName} confirmó su premio</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.65">El referente verificó la recepción del dinero. El ciclo está completo.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:20px">
          <tr><td style="padding:20px 24px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:6px 0;border-bottom:1px solid #e8e7e4"><span style="font-size:13px;color:#71717a">Asesor</span><span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${ref.advisorName}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #e8e7e4"><span style="font-size:13px;color:#71717a">Lead convertido</span><span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${ref.leadName}</span></td></tr>
              <tr><td style="padding:6px 0;border-bottom:1px solid #e8e7e4"><span style="font-size:13px;color:#71717a">Premio pagado</span><span style="float:right;font-size:13px;font-weight:700;color:#0d0d0d">${formatMXN(1500)}</span></td></tr>
              <tr><td style="padding:6px 0"><span style="font-size:13px;color:#71717a">Valor del plan</span><span style="float:right;font-size:13px;font-weight:700;color:#0d0d0d">${formatMXN(18000)}</span></td></tr>
            </table>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:14px 20px"><p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ Recepción confirmada por el referente</p></td></tr>
        </table>
      </td></tr>
      ${footer("Referidoo · Notificación interna automática")}
    `)
  );

  await send("7-verificacion-correo", "Confirma tu correo para activar Referidoo",
    emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 24px">
        <p style="margin:0 0 8px;font-size:13px;color:#2B57F0;font-weight:600;letter-spacing:0.02em">Un paso más</p>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">Hola ${ref.advisorName}, confirma tu correo</h1>
        <p style="margin:0 0 28px;font-size:14px;color:#52525b;line-height:1.65">Tu cuenta está casi lista. Confirma tu correo para empezar a agregar clientes, compartir tu programa de referidos y recibir notificaciones de nuevos leads.</p>
        <a href="${BASE}/verificar?token=tok_demo_123abc" style="display:block;background:#2B57F0;color:#ffffff;text-align:center;padding:15px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">Confirmar mi correo →</a>
        <p style="margin:14px 0 0;font-size:12px;color:#9098a2;text-align:center">Si no creaste esta cuenta en Referidoo, ignora este correo.</p>
      </td></tr>
      ${footer("Referidoo — plataforma de referidos para asesores de seguros")}
    `)
  );

  await send("8-burbuja-reclamada", `[Premios burbuja] ${ref.referrerName} reclamó ${formatMXN(1500)}`,
    emailShell(`
      ${header("Premios burbuja")}
      <tr><td style="padding:32px 32px 24px">
        <p style="margin:0 0 8px;font-size:13px;color:#d97706;font-weight:600;letter-spacing:0.02em">Acción requerida</p>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0d0d0d;line-height:1.25;letter-spacing:-0.02em">${ref.referrerName} reclamó su premio burbuja</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#52525b;line-height:1.65">El referente acumuló <strong style="color:#0d0d0d">${formatMXN(1500)}</strong> en premios de Auto + GMM y solicitó el pago.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:24px">
          <tr><td style="padding:18px 22px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr><td style="padding:5px 0;border-bottom:1px solid #e8e7e4"><span style="font-size:13px;color:#71717a">Referente</span><span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${ref.referrerName}</span></td></tr>
              <tr><td style="padding:5px 0;border-bottom:1px solid #e8e7e4"><span style="font-size:13px;color:#71717a">Asesor</span><span style="float:right;font-size:13px;font-weight:600;color:#0d0d0d">${ref.advisorName}</span></td></tr>
              <tr><td style="padding:5px 0"><span style="font-size:13px;color:#71717a">Monto acumulado</span><span style="float:right;font-size:14px;font-weight:700;color:#0d0d0d">${formatMXN(1500)}</span></td></tr>
            </table>
          </td></tr>
        </table>
        <a href="${BASE}/admin/referidos" style="display:block;background:#0d0d0d;color:#ffffff;text-align:center;padding:15px 24px;border-radius:999px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">Revisar y marcar como pagado →</a>
      </td></tr>
      ${footer("Referidoo · Notificación interna automática")}
    `)
  );

  await send("9-burbuja-pagada", `¡Tu premio burbuja de ${formatMXN(1500)} fue enviado!`,
    emailShell(`
      ${header()}
      <tr><td style="padding:32px 32px 8px">
        <p style="margin:0 0 6px;font-size:13px;color:#16a34a;font-weight:600;letter-spacing:0.02em">¡Premio enviado!</p>
      </td></tr>
      <tr><td style="padding:0 32px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;border-radius:14px">
          <tr><td style="padding:28px 28px 24px;text-align:center">
            <p style="margin:0 0 6px;font-size:44px;font-weight:800;color:#ffffff;letter-spacing:-0.03em;line-height:1">${formatMXN(1500)}</p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,.5)">Premio burbuja acumulado</p>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 32px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;border-radius:12px;margin-bottom:16px">
          <tr><td style="padding:18px 22px">
            <p style="margin:0 0 2px;font-size:11px;color:#9098a2;font-weight:600;letter-spacing:0.08em;text-transform:uppercase">Detalles del pago</p>
            <p style="margin:0 0 4px;font-size:14px;color:#52525b;line-height:1.5">${ref.advisorName} envió tu premio acumulado por referir seguros de auto y gastos médicos.</p>
            <p style="margin:6px 0 0;font-size:12px;color:#9098a2">Referencia: SPEI · Ref. 20240702</p>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px">
          <tr><td style="padding:14px 20px"><p style="margin:0;font-size:14px;font-weight:600;color:#166534">✓ Tu premio fue enviado exitosamente</p></td></tr>
        </table>
      </td></tr>
      ${footer("Referidoo — programa de referidos para asesores de seguros")}
    `)
  );

  return results;
}
