import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminLayoutShell from "./AdminLayoutShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  const advisor = await db.advisor.findUnique({
    where: { id: session.advisorId },
    select: { name: true, emailVerified: true, plan: true, onboardedAt: true },
  });

  if (!advisor) redirect("/login");

  return (
    <AdminLayoutShell
      initialAdvisorName={advisor.name}
      initialEmailVerified={advisor.emailVerified}
      initialPlan={advisor.plan}
      initialOnboardedAt={advisor.onboardedAt?.toISOString() ?? null}
    >
      {children}
    </AdminLayoutShell>
  );
}
