import { redirect } from "next/navigation";
import { getAdvisorSession } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminLayoutShell from "./AdminLayoutShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdvisorSession();
  if (!session) redirect("/login");

  // New JWTs carry advisor data — no DB query needed for profile fields.
  // However, we always do a minimal DB query to enforce soft delete (deletedAt).
  // Old JWTs (created before this deploy) also need the full profile fallback.
  let name = session.name;
  let emailVerified = session.emailVerified;
  let plan = session.plan;
  let onboardedAt = session.onboardedAt;

  if (name) {
    // New token: only check deletedAt.
    // try/catch guards the migration window before /api/migrate adds the column.
    try {
      const record = await db.advisor.findUnique({
        where: { id: session.advisorId },
        select: { deletedAt: true },
      });
      if (!record || record.deletedAt) redirect("/login");
    } catch {
      // deletedAt column missing — migration not yet run, allow access
    }
  } else {
    // Old token: fetch full profile + deletedAt in one query
    try {
      const advisor = await db.advisor.findUnique({
        where: { id: session.advisorId },
        select: { deletedAt: true, name: true, emailVerified: true, plan: true, onboardedAt: true },
      });
      if (!advisor || advisor.deletedAt) redirect("/login");
      name = advisor.name;
      emailVerified = advisor.emailVerified;
      plan = advisor.plan;
      onboardedAt = advisor.onboardedAt?.toISOString() ?? null;
    } catch {
      // deletedAt column missing — fallback to profile-only query
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
