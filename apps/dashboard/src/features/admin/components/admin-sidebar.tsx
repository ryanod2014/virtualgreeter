"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Ghost,
  Rocket,
  Users,
  Layers,
  BarChart3,
  Settings,
  Video,
  LogOut,
  Code,
  FileText,
  Palette,
} from "lucide-react";
import type { User, Organization } from "@ghost-greeter/domain/database.types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AdminSidebarProps {
  user: User;
  organization: Organization;
}

export function AdminSidebar({ user, organization }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
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
          <div className="flex items-center gap-3 mb-3">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-10 h-10 rounded-lg object-contain bg-muted/50"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Ghost className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-lg truncate">{organization.name}</div>
              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                Admin
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/admin" icon={Rocket} pathname={pathname} exact>
            Quick Setup
          </NavLink>
          <NavLink href="/admin/sites" icon={Code} pathname={pathname}>
            Embed Code
          </NavLink>
          <NavLink href="/admin/agents" icon={Users} pathname={pathname}>
            Agents
          </NavLink>
          <NavLink href="/admin/pools" icon={Layers} pathname={pathname}>
            Pools
          </NavLink>
          <NavLink href="/admin/settings/dispositions" icon={Palette} pathname={pathname}>
            Dispositions
          </NavLink>
          <NavLink href="/admin/analytics" icon={BarChart3} pathname={pathname}>
            Analytics
          </NavLink>
          <NavLink href="/admin/call-logs" icon={FileText} pathname={pathname}>
            Call Logs
          </NavLink>
          
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Agent Mode
            </div>
          </div>
          
          <NavLink href="/dashboard" icon={Video} pathname={pathname}>
            Agent Dashboard
          </NavLink>
        </nav>

        {/* Settings & User */}
        <div className="p-4 border-t border-border space-y-1">
          <NavLink href="/admin/settings" icon={Settings} pathname={pathname} exact>
            Settings
          </NavLink>
          
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
              <div className="font-medium truncate">{user.full_name}</div>
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

