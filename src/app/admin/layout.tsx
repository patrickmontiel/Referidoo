import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminLayoutShell from "./AdminLayoutShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  // New JWTs carry advisor data — no DB query needed.
  // Old JWTs (created before this deploy) fall back to one DB query; they are
  // replaced the next time the advisor logs in or verifies email.
  let name = session.name;
  let emailVerified = session.emailVerified;
  let plan = session.plan;
  let onboardedAt = session.onboardedAt;

  if (!name) {
    const advisor = await db.advisor.findUnique({
      where: { id: session.advisorId },
      select: { name: true, emailVerified: true, plan: true, onboardedAt: true },
    });
    if (!advisor) redirect("/login");
    name = advisor.name;
    emailVerified = advisor.emailVerified;
    plan = advisor.plan;
    onboardedAt = advisor.onboardedAt?.toISOString() ?? null;
  }

  return (
    <AdminLayoutShell
      initialAdvisorName={name}
      initialEmailVerified={emailVerified ?? false}
      initialPlan={plan ?? "freemium"}
      initialOnboardedAt={onboardedAt ?? null}
    >
      {children}
    </AdminLayoutShell>
  );
}
