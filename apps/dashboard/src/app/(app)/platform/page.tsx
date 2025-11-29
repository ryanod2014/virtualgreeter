import { createClient } from "@/lib/supabase/server";
import {
  Target,
  Users,
  Building2,
  Phone,
} from "lucide-react";

export default async function PlatformOverviewPage() {
  const supabase = await createClient();

  // Fetch all platform stats in parallel
  const [
    orgsResult,
    usersResult,
    agentsResult,
    callsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact" }),
    supabase.from("users").select("id", { count: "exact" }),
    supabase.from("agent_profiles").select("id", { count: "exact" }).eq("is_active", true),
    supabase.from("call_logs").select("id", { count: "exact" }),
  ]);

  const totalOrgs = orgsResult.count ?? 0;
  const totalUsers = usersResult.count ?? 0;
  const totalAgents = agentsResult.count ?? 0;
  const totalCalls = callsResult.count ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">PMF Command Center</h2>
        <p className="text-muted-foreground">
          Track product-market fit and platform health
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Building2 className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalOrgs}</p>
              <p className="text-sm text-muted-foreground">Organizations</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalUsers}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Target className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAgents}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Phone className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Calls</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-xl bg-card border border-border">
        <h3 className="font-semibold mb-2">Platform Admin Dashboard</h3>
        <p className="text-muted-foreground">
          This dashboard shows platform-wide metrics. Use the navigation above to view detailed analytics.
        </p>
      </div>
    </div>
  );
}
