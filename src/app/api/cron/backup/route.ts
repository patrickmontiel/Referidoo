import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";

// Respaldo diario: exporta todas las tablas a JSON y lo manda por correo al
// dueño de la plataforma. La base es chica (fase beta) — un adjunto basta.
// Se excluyen los hashes de contraseña: si algún día se restaura desde este
// respaldo, los asesores recuperan acceso con "olvidé mi contraseña", y el
// respaldo no viaja con material sensible de más.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const to = process.env.PLATFORM_OWNER_EMAIL;
  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
  if (!to || !resend) {
    console.log("[backup] sin PLATFORM_OWNER_EMAIL o RESEND_API_KEY — respaldo omitido");
    return NextResponse.json({ skipped: true });
  }

  const [advisors, settings, tiers, clients, referrals, bubbleClaims, planEvents] = await Promise.all([
    db.advisor.findMany(),
    db.advisorSettings.findMany(),
    db.rewardTier.findMany(),
    db.client.findMany(),
    db.referral.findMany(),
    db.bubbleClaim.findMany(),
    db.planEvent.findMany(),
  ]);

  const dump = {
    generatedAt: new Date().toISOString(),
    counts: {
      advisors: advisors.length,
      settings: settings.length,
      tiers: tiers.length,
      clients: clients.length,
      referrals: referrals.length,
      bubbleClaims: bubbleClaims.length,
      planEvents: planEvents.length,
    },
    data: {
      advisors: advisors.map(({ password: _password, ...rest }) => rest),
      settings,
      tiers,
      clients,
      referrals,
      bubbleClaims,
      planEvents,
    },
  };

  const fecha = new Date().toISOString().slice(0, 10);
  const resumen = Object.entries(dump.counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Referidoo Team <noreply@referidoo.com>",
    to,
    subject: `Respaldo Referidoo — ${fecha}`,
    text: `Respaldo automático diario de la base de datos.\n\n${resumen}\n\nGuarda este correo — es tu copia de seguridad. Las contraseñas no viajan en el respaldo; una restauración implica "olvidé mi contraseña" para los asesores.`,
    attachments: [
      {
        filename: `referidoo-backup-${fecha}.json`,
        content: Buffer.from(JSON.stringify(dump, null, 1)).toString("base64"),
      },
    ],
  });

  if (error) {
    console.error("[backup] Error enviando respaldo:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counts: dump.counts });
}
