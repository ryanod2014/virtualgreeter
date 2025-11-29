import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/actions";
import { PlatformNav } from "./platform-nav";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getCurrentUser();

  // Redirect if not logged in
  if (!auth) {
    redirect("/login");
  }

  // Redirect if not a platform admin
  if (!auth.isPlatformAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Platform Admin Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Platform Dashboard</h1>
                <p className="text-xs text-muted-foreground">
                  PMF Command Center
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {auth.profile.email}
            </div>
          </div>
        </div>
        <PlatformNav />
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

