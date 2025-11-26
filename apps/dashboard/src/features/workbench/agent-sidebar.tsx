"use client";

import Link from "next/link";
import {
  Ghost,
  Video,
  Film,
  Settings,
  LogOut,
  LayoutDashboard,
  BarChart3,
} from "lucide-react";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

interface AgentSidebarProps {
  user: User;
  organization: Organization;
  agentProfile: AgentProfile | null;
  isAdmin: boolean;
}

export function AgentSidebar({ user, organization, agentProfile, isAdmin }: AgentSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card/50 backdrop-blur-xl z-40">
      <div className="flex h-full flex-col">
        {/* Logo & Org */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Ghost className="w-7 h-7 text-primary" />
            <span className="font-bold text-lg">Ghost-Greeter</span>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {organization.name}
          </div>
          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
            Agent
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/dashboard" icon={Video} pathname={pathname} exact>
            Bullpen
          </NavLink>
          <NavLink href="/dashboard/videos" icon={Film} pathname={pathname}>
            Pre-recorded Intro
          </NavLink>
          <NavLink href="/dashboard/stats" icon={BarChart3} pathname={pathname}>
            Stats
          </NavLink>
          <NavLink href="/dashboard/settings" icon={Settings} pathname={pathname}>
            Settings
          </NavLink>
          
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
                  Admin Mode
                </div>
              </div>
              <NavLink href="/admin" icon={LayoutDashboard} pathname={pathname}>
                Admin Dashboard
              </NavLink>
            </>
          )}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {agentProfile?.display_name ?? user.full_name}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
  pathname,
  exact = false,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  pathname: string;
  exact?: boolean;
}) {
  const isActive = exact ? pathname === href : pathname.startsWith(href);
  
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      }`}
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );
}

