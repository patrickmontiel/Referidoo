import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";

export default async function Home() {
  const session = await getAdvisorSession();
  if (session) redirect("/admin");
  redirect("/login");
}
