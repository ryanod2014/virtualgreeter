import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { DashboardLayoutClient } from "./dashboard-layout-client";

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
    <DashboardLayoutClient
      user={auth.profile}
      organization={auth.organization}
      agentProfile={auth.agentProfile}
      isAdmin={auth.isAdmin}
    >
      {children}
    </DashboardLayoutClient>
  );
}
