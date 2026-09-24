import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { encryptBackup } from "@/lib/backup-crypto";

// Respaldo diario: exporta todas las tablas a JSON y lo manda por correo al
// dueño de la plataforma. La base es chica (fase beta) — un adjunto basta.
// Se excluyen los hashes de contraseña: si algún día se restaura desde este
// respaldo, los asesores recuperan acceso con "olvidé mi contraseña", y el
// respaldo no viaja con material sensible de más.
//
// EL ADJUNTO VA CIFRADO. Aunque no lleve contraseñas, sí lleva la CLABE de los
// referidos, teléfonos y correos de clientes, y los `accessToken` de los
// portales — y con un token se abre el portal de ese cliente, donde se ve su
// CLABE. En claro, una bandeja comprometida sería una filtración de datos
// bancarios de terceros.
//
// Sin `BACKUP_ENCRYPTION_KEY` configurada NO se adjuntan datos: se manda solo el
// resumen y un aviso. Es deliberado — quedarse un día sin copia es preferible a
// mandar CLABEs en claro todos los días, y el aviso llega por el mismo correo.
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

  const passphrase = process.env.BACKUP_ENCRYPTION_KEY;

  // Sin llave no se manda ni un dato: solo el resumen y cómo arreglarlo.
  if (!passphrase) {
    console.error("[backup] BACKUP_ENCRYPTION_KEY no configurada — respaldo SIN datos");
    const { error: avisoError } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Referidoo Team <noreply@referidoo.com>",
      to,
      subject: `⚠️ Respaldo Referidoo SIN datos — ${fecha}`,
      text:
        `No se adjuntó el respaldo porque falta la variable BACKUP_ENCRYPTION_KEY.\n\n` +
        `${resumen}\n\n` +
        `El respaldo lleva CLABE de referidos y los tokens de acceso a los portales ` +
        `de clientes, así que no se manda sin cifrar.\n\n` +
        `Para reactivarlo: genera una passphrase larga, guárdala en un gestor de ` +
        `contraseñas (sin ella los respaldos son irrecuperables) y ponla como ` +
        `BACKUP_ENCRYPTION_KEY en las variables de entorno del proyecto.`,
    });
    if (avisoError) console.error("[backup] Error avisando de la llave faltante:", avisoError);
    return NextResponse.json({ ok: false, reason: "missing_encryption_key", counts: dump.counts }, { status: 500 });
  }

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "Referidoo Team <noreply@referidoo.com>",
    to,
    subject: `Respaldo Referidoo — ${fecha}`,
    text:
      `Respaldo automático diario de la base de datos (cifrado).\n\n${resumen}\n\n` +
      `Guarda este correo — es tu copia de seguridad.\n\n` +
      `Para abrirlo:\n` +
      `  npx tsx scripts/decrypt-backup.ts referidoo-backup-${fecha}.json.enc\n\n` +
      `Pide la passphrase de BACKUP_ENCRYPTION_KEY. Sin ella el archivo no se ` +
      `puede recuperar: guárdala en un gestor de contraseñas, no en este buzón.\n\n` +
      `Las contraseñas de los asesores no viajan en el respaldo; una restauración ` +
      `implica "olvidé mi contraseña" para cada uno.`,
    attachments: [
      {
        filename: `referidoo-backup-${fecha}.json.enc`,
        content: encryptBackup(JSON.stringify(dump, null, 1), passphrase).toString("base64"),
      },
    ],
  });

  if (error) {
    console.error("[backup] Error enviando respaldo:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, counts: dump.counts });
}
