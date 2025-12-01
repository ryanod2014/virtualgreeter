import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { AppShell } from "@/features/signaling/app-shell";
import { MobileRedirect } from "@/lib/components/MobileRedirect";

export default async function AppLayout({
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
    <>
      <MobileRedirect />
      <AppShell
        user={auth.profile}
        organization={auth.organization}
        agentProfile={auth.agentProfile}
        isAdmin={auth.isAdmin}
      >
        {children}
      </AppShell>
    </>
  );
}

