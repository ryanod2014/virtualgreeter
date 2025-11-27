import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin layout - recompile trigger
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
    <div className="min-h-screen bg-background">
      <AdminSidebar user={auth.profile} organization={auth.organization} />
      <main className="ml-64 min-h-screen">{children}</main>
    </div>
  );
}

