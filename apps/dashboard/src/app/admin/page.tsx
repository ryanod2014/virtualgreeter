import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import {
  Users,
  Globe,
  Phone,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

export default async function AdminOverviewPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Fetch stats
  const [agentsResult, sitesResult, callsResult] = await Promise.all([
    supabase
      .from("agent_profiles")
      .select("id", { count: "exact" })
      .eq("organization_id", auth!.organization.id),
    supabase
      .from("sites")
      .select("id", { count: "exact" })
      .eq("organization_id", auth!.organization.id),
    supabase
      .from("call_logs")
      .select("id", { count: "exact" })
      .eq("organization_id", auth!.organization.id),
  ]);

  const stats = {
    agents: agentsResult.count ?? 0,
    sites: sitesResult.count ?? 0,
    calls: callsResult.count ?? 0,
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {auth!.profile.full_name.split(" ")[0]}! Here's your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Agents"
          value={stats.agents}
          icon={Users}
          trend={+12}
          color="primary"
        />
        <StatCard
          title="Active Sites"
          value={stats.sites}
          icon={Globe}
          trend={+5}
          color="success"
        />
        <StatCard
          title="Calls This Month"
          value={stats.calls}
          icon={Phone}
          trend={+23}
          color="accent"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction
              href="/admin/agents"
              title="Add New Agent"
              description="Invite team members to handle calls"
            />
            <QuickAction
              href="/admin/sites"
              title="Add New Site"
              description="Set up the widget on another website"
            />
            <QuickAction
              href="/dashboard"
              title="Go Live"
              description="Start handling calls in the workbench"
            />
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4">
            <SetupStep
              number={1}
              title="Upload your videos"
              description="Record your intro and loop videos"
              completed={!!auth?.agentProfile?.intro_video_url}
            />
            <SetupStep
              number={2}
              title="Add your first site"
              description="Get the embed code for your website"
              completed={stats.sites > 0}
            />
            <SetupStep
              number={3}
              title="Make your first call"
              description="Connect with a visitor live"
              completed={stats.calls > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  trend: number;
  color: "primary" | "success" | "accent" | "warning";
}) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    success: "text-green-500 bg-green-500/10",
    accent: "text-purple-500 bg-purple-500/10",
    warning: "text-amber-500 bg-amber-500/10",
  };

  const isPositive = trend > 0;

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={`flex items-center gap-1 text-sm ${isPositive ? "text-green-500" : "text-red-500"}`}>
          {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
          {Math.abs(trend)}%
        </div>
      </div>
      <div className="text-3xl font-bold mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium group-hover:text-primary transition-colors">
            {title}
          </div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </a>
  );
}

function SetupStep({
  number,
  title,
  description,
  completed,
}: {
  number: number;
  title: string;
  description: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed
            ? "bg-green-500/20 text-green-500"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {completed ? "✓" : number}
      </div>
      <div>
        <div className={`font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>
          {title}
        </div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>
    </div>
  );
}

