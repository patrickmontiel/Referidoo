import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import CampanasListClient from "./CampanasListClient";

export default async function CampanasPage() {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");
  return <CampanasListClient />;
}
