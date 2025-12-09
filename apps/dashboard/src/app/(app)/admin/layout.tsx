import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { AdminLayoutClient } from "./admin-layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser();

  // Redirect if not logged in
  if (!auth) {
    redirect("/login");
  }

  // Redirect if not admin
  if (!auth.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <AdminLayoutClient
      user={auth.profile}
      organization={auth.organization}
      agentProfile={auth.agentProfile}
      isAdmin={auth.isAdmin}
    >
      {children}
    </AdminLayoutClient>
  );
}
