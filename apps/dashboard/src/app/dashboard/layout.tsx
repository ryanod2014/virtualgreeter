import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { AgentSidebar } from "@/features/workbench/agent-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser();

  // Redirect if not logged in
  if (!auth) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <AgentSidebar 
        user={auth.profile} 
        organization={auth.organization} 
        agentProfile={auth.agentProfile}
        isAdmin={auth.isAdmin}
      />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}

