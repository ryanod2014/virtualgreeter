import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { WorkbenchClient } from "@/features/workbench/workbench-client";

export default async function DashboardPage() {
  const auth = await getCurrentUser();

  if (!auth) {
    redirect("/login");
  }

  return (
    <WorkbenchClient 
      agentProfile={auth.agentProfile}
      user={auth.profile}
      organizationId={auth.organization.id}
    />
  );
}
