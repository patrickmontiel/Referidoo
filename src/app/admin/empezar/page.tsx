import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { suggestedFirstActivationSize } from "@/lib/advisor-state";
import { DEFAULT_ADVISOR_INVITE_MESSAGE, renderMessage } from "@/lib/message-templates";
import { EmpezarClient } from "./EmpezarClient";

// "Así quedó tu sistema" — revisión antes de la primera activación.
// Solo muestra valores REALES ya configurados; nada aspiracional.
// El preview del cliente es el portal REAL de un cliente real (no un mock).
export default async function EmpezarPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const [advisor, settings, tiers, clients] = await Promise.all([
    db.advisor.findUnique({ where: { id: session.advisorId }, select: { name: true, companyName: true } }),
    db.advisorSettings.findUnique({
      where: { advisorId: session.advisorId },
      select: { products: true, defaultChannel: true, advisorInviteMessage: true },
    }),
    db.rewardTier.findMany({ where: { advisorId: session.advisorId }, orderBy: { position: "asc" }, select: { amount: true } }),
    db.client.findMany({
      where: { advisorId: session.advisorId, active: true },
      select: { id: true, name: true, phone: true, email: true, accessToken: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (!advisor) redirect("/login");

  const contactables = clients.filter((c) => c.phone || c.email);
  // Cliente de muestra para el preview REAL: uno contactable de su cartera.
  const sample = contactables[0] ?? clients[0] ?? null;
  const maxTier = tiers.length ? Math.max(...tiers.map((t) => t.amount)) : 1500;

  const previewMessage = sample
    ? renderMessage(settings?.advisorInviteMessage || DEFAULT_ADVISOR_INVITE_MESSAGE, {
        nombre: sample.name.split(" ")[0],
        asesor: advisor.name,
        premio: `$${maxTier.toLocaleString("es-MX")}`,
        link: `/c/${sample.accessToken}`,
      })
    : "";

  return (
    <EmpezarClient
      products={settings?.products ?? null}
      channel={settings?.defaultChannel ?? null}
      portfolioCount={clients.length}
      contactableCount={contactables.length}
      tierCount={tiers.length}
      maxTier={maxTier}
      suggestedSize={suggestedFirstActivationSize(clients.length)}
      sampleClientName={sample?.name ?? null}
      samplePortalPath={sample ? `/c/${sample.accessToken}` : null}
      previewMessage={previewMessage}
    />
  );
}
