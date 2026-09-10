import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import CampanaResultadosClient from "./CampanaResultadosClient";

export default async function CampanaResultadosPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <CampanaResultadosClient campaignId={id} />;
}
