"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Rocket,
  Users,
  Layers,
  BarChart3,
  Settings,
  Video,
  LogOut,
  Code,
  Palette,
  ChevronDown,
  Check,
} from "lucide-react";
import { Logo } from "@/lib/components/logo";
import type { User, Organization, AgentProfile } from "@ghost-greeter/domain/database.types";
import type { ActiveCall } from "@ghost-greeter/domain";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AdminSidebarProps {
  user: User;
  organization: Organization;
  agentProfile?: AgentProfile | null;
  isConnected?: boolean;
  isReconnecting?: boolean;
  isMarkedAway?: boolean;
  activeCall?: ActiveCall | null;
  poolVisitors?: number;
  onSetAway?: () => void;
  onSetBack?: () => void;
}

export function AdminSidebar({ 
  user, 
  organization,
  agentProfile,
  isConnected = false,
  isReconnecting = false,
  isMarkedAway = false,
  activeCall = null,
  poolVisitors = 0,
  onSetAway,
  onSetBack,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  
  // Status dropdown
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
          <div className="flex flex-col items-center gap-3 mb-3">
            {organization.logo_url ? (
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-12 h-12 rounded-lg object-contain bg-muted/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Logo size="sm" />
              </div>
            )}
            <div className="text-center">
              <div className="font-bold text-lg truncate">{organization.name}</div>
              <div 
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  poolVisitors > 0 
                    ? 'bg-emerald-500/10 text-emerald-500' 
                    : 'bg-zinc-500/10 text-zinc-500'
                }`}
                title={`${poolVisitors} visitor${poolVisitors !== 1 ? 's' : ''} on your sites`}
              >
                {poolVisitors > 0 && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                )}
                <Users className="w-3 h-3" />
                <span className="tabular-nums">{poolVisitors}</span>
                <span className="opacity-70">{poolVisitors === 1 ? 'visitor' : 'visitors'}</span>
              </div>
            </div>
          </div>
          
          {/* Status indicator - only show for admins who are active agents */}
          {agentProfile?.is_active && isConnected && !activeCall && onSetAway && onSetBack && (
            <div className="relative" ref={statusDropdownRef}>
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all ${
                  isMarkedAway
                    ? "bg-muted/50 border-border hover:bg-muted"
                    : "bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isMarkedAway ? "bg-muted-foreground" : "bg-green-500 animate-pulse"}`} />
                  <span className={`text-sm font-medium ${isMarkedAway ? "text-muted-foreground" : "text-green-500"}`}>
                    {isMarkedAway ? "Away" : "Live on site"}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${statusDropdownOpen ? "rotate-180" : ""} ${isMarkedAway ? "text-muted-foreground" : "text-green-500"}`} />
              </button>
              
              {/* Dropdown Menu */}
              {statusDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-lg z-50 overflow-hidden">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        if (isMarkedAway) onSetBack();
                        setStatusDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        !isMarkedAway 
                          ? "bg-green-500/10 text-green-500" 
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="flex-1 text-left">Live on site</span>
                      {!isMarkedAway && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        if (!isMarkedAway) onSetAway();
                        setStatusDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        isMarkedAway 
                          ? "bg-muted text-muted-foreground" 
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <span className="flex-1 text-left">Away</span>
                      {isMarkedAway && <Check className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeCall && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="text-sm font-medium text-primary">On Call</span>
            </div>
          )}
          {isReconnecting && onSetAway && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm text-amber-500">Reconnecting...</span>
            </div>
          )}
          {!isConnected && !isReconnecting && onSetAway && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
              <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
              <span className="text-sm text-muted-foreground">Connecting...</span>
            </div>
          )}
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
          <NavLink href="/admin/calls" icon={BarChart3} pathname={pathname}>
            Calls
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

