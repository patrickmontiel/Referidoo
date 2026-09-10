import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import NuevaCampanaClient from "./NuevaCampanaClient";

export default async function NuevaCampanaPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const [advisor, clients] = await Promise.all([
    db.advisor.findUnique({ where: { id: session.advisorId }, select: { name: true } }),
    db.client.findMany({
      where: { advisorId: session.advisorId, active: true },
      select: { id: true, name: true, email: true, phone: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return <NuevaCampanaClient advisorName={advisor?.name ?? ""} clients={clients} />;
}
