import Link from "next/link";
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
import { signOut } from "@/lib/auth/actions";

interface AdminSidebarProps {
  user: User;
  organization: Organization;
}

export function AdminSidebar({ user, organization }: AdminSidebarProps) {
  // Sidebar - updated order
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
          <NavLink href="/admin" icon={Rocket}>
            Quick Setup
          </NavLink>
          <NavLink href="/admin/sites" icon={Code}>
            Embed Code
          </NavLink>
          <NavLink href="/admin/agents" icon={Users}>
            Agents
          </NavLink>
          <NavLink href="/admin/pools" icon={Layers}>
            Pools
          </NavLink>
          <NavLink href="/admin/settings/dispositions" icon={Palette}>
            Dispositions
          </NavLink>
          <NavLink href="/admin/analytics" icon={BarChart3}>
            Analytics
          </NavLink>
          <NavLink href="/admin/call-logs" icon={FileText}>
            Call Logs
          </NavLink>
          
          <div className="pt-4 pb-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4">
              Agent Mode
            </div>
          </div>
          
          <NavLink href="/dashboard" icon={Video}>
            Agent Dashboard
          </NavLink>
        </nav>

        {/* Settings & User */}
        <div className="p-4 border-t border-border space-y-1">
          <NavLink href="/admin/settings" icon={Settings}>
            Settings
          </NavLink>
          
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </form>
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
    >
      <Icon className="w-5 h-5" />
      {children}
    </Link>
  );
}

