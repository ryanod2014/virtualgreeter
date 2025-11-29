import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  Users,
  Building2,
  Phone,
  Target,
  AlertTriangle,
  Heart,
  Meh,
  Frown,
} from "lucide-react";

export default async function PlatformOverviewPage() {
  const supabase = await createClient();

  // Fetch all platform stats in parallel
  const [
    orgsResult,
    usersResult,
    agentsResult,
    callsResult,
    pmfSurveysResult,
    cancellationsResult,
  ] = await Promise.all([
    // Total organizations
    supabase.from("organizations").select("id, subscription_status", { count: "exact" }),
    // Total users
    supabase.from("users").select("id", { count: "exact" }),
    // Total active agents
    supabase
      .from("agent_profiles")
      .select("id", { count: "exact" })
      .eq("is_active", true),
    // Total calls
    supabase.from("call_logs").select("id", { count: "exact" }),
    // PMF Survey responses
    supabase.from("pmf_surveys").select("*").eq("dismissed", false),
    // Cancellations
    supabase.from("cancellation_feedback").select("id", { count: "exact" }),
  ]);

  // Calculate stats
  const totalOrgs = orgsResult.count ?? 0;
  const cancelledOrgs =
    orgsResult.data?.filter((o) => o.subscription_status === "cancelled").length ?? 0;
  const cancellationRate = totalOrgs > 0 ? (cancelledOrgs / totalOrgs) * 100 : 0;

  const totalUsers = usersResult.count ?? 0;
  const totalAgents = agentsResult.count ?? 0;
  const totalCalls = callsResult.count ?? 0;

  // PMF Score calculation - separated by role
  const surveys = pmfSurveysResult.data ?? [];
  
  // Split surveys by role
  const agentSurveys = surveys.filter((s) => s.user_role === "agent");
  const adminSurveys = surveys.filter((s) => s.user_role === "admin" || s.user_role === "owner");
  
  // Agent PMF metrics
  const agentVeryDisappointed = agentSurveys.filter(
    (s) => s.disappointment_level === "very_disappointed"
  ).length;
  const agentSomewhatDisappointed = agentSurveys.filter(
    (s) => s.disappointment_level === "somewhat_disappointed"
  ).length;
  const agentNotDisappointed = agentSurveys.filter(
    (s) => s.disappointment_level === "not_disappointed"
  ).length;
  const agentPmfScore = agentSurveys.length > 0 ? (agentVeryDisappointed / agentSurveys.length) * 100 : 0;
  
  // Admin PMF metrics
  const adminVeryDisappointed = adminSurveys.filter(
    (s) => s.disappointment_level === "very_disappointed"
  ).length;
  const adminSomewhatDisappointed = adminSurveys.filter(
    (s) => s.disappointment_level === "somewhat_disappointed"
  ).length;
  const adminNotDisappointed = adminSurveys.filter(
    (s) => s.disappointment_level === "not_disappointed"
  ).length;
  const adminPmfScore = adminSurveys.length > 0 ? (adminVeryDisappointed / adminSurveys.length) * 100 : 0;

  // Get recent surveys for the table
  const recentSurveys = surveys
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  // PMF Score color
  const getPmfColor = (score: number) => {
    if (score >= 40) return "text-green-500";
    if (score >= 25) return "text-amber-500";
    return "text-red-500";
  };

  const getPmfBgColor = (score: number) => {
    if (score >= 40) return "bg-green-500/10";
    if (score >= 25) return "bg-amber-500/10";
    return "bg-red-500/10";
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold">PMF Command Center</h2>
        <p className="text-muted-foreground">
          Track product-market fit and platform health
        </p>
      </div>

      {/* Top Stats Grid - PMF Scores by Role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agent PMF Score */}
        <div
          className={`p-6 rounded-2xl border-2 ${getPmfBgColor(agentPmfScore)} border-current ${getPmfColor(agentPmfScore)}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Agent PMF Score</p>
              <p className="text-4xl font-bold mt-2">{agentPmfScore.toFixed(0)}%</p>
              <p className="text-sm mt-2 opacity-80">
                {agentSurveys.length === 0
                  ? "No agent responses yet"
                  : agentPmfScore >= 40
                  ? "Agents love the product!"
                  : `Need ${(40 - agentPmfScore).toFixed(0)}% more to hit 40%`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {agentVeryDisappointed} very
            </span>
            <span className="flex items-center gap-1">
              <Meh className="w-4 h-4" /> {agentSomewhatDisappointed} somewhat
            </span>
            <span className="flex items-center gap-1">
              <Frown className="w-4 h-4" /> {agentNotDisappointed} not
            </span>
          </div>
          <p className="text-xs opacity-60 mt-2">{agentSurveys.length} total responses</p>
        </div>

        {/* Admin PMF Score */}
        <div
          className={`p-6 rounded-2xl border-2 ${getPmfBgColor(adminPmfScore)} border-current ${getPmfColor(adminPmfScore)}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium opacity-80">Admin PMF Score</p>
              <p className="text-4xl font-bold mt-2">{adminPmfScore.toFixed(0)}%</p>
              <p className="text-sm mt-2 opacity-80">
                {adminSurveys.length === 0
                  ? "No admin responses yet"
                  : adminPmfScore >= 40
                  ? "Admins love the product!"
                  : `Need ${(40 - adminPmfScore).toFixed(0)}% more to hit 40%`}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10">
              <Target className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" /> {adminVeryDisappointed} very
            </span>
            <span className="flex items-center gap-1">
              <Meh className="w-4 h-4" /> {adminSomewhatDisappointed} somewhat
            </span>
            <span className="flex items-center gap-1">
              <Frown className="w-4 h-4" /> {adminNotDisappointed} not
            </span>
          </div>
          <p className="text-xs opacity-60 mt-2">{adminSurveys.length} total responses</p>
        </div>
      </div>

      {/* Secondary Row - Cancellation & Total Surveys */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cancellation Rate */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
            <AlertTriangle
              className={`w-5 h-5 ${cancellationRate > 10 ? "text-red-500" : "text-muted-foreground"}`}
            />
          </div>
          <p className="text-2xl font-bold mt-2">{cancellationRate.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {cancelledOrgs} of {totalOrgs} orgs
          </p>
        </div>

        {/* Total Surveys */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Survey Responses</p>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{surveys.length}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {cancellationsResult.count ?? 0} exit surveys
          </p>
        </div>

        {/* Organizations */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalOrgs}</p>
              <p className="text-sm text-muted-foreground">Organizations</p>
            </div>
          </div>
        </div>

        {/* Total Calls */}
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

      {/* Tertiary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-5 h-5 text-purple-500" />
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
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAgents}</p>
              <p className="text-sm text-muted-foreground">Active Agents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent PMF Surveys */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold">Recent PMF Survey Responses</h3>
          <p className="text-sm text-muted-foreground">
            Latest feedback from users
          </p>
        </div>

        {recentSurveys.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No survey responses yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Surveys will appear after users complete them
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentSurveys.map((survey) => {
              const levelConfigs = {
                very_disappointed: {
                  label: "Very disappointed",
                  icon: Heart,
                  color: "text-rose-500",
                  bg: "bg-rose-500/10",
                },
                somewhat_disappointed: {
                  label: "Somewhat disappointed",
                  icon: Meh,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                },
                not_disappointed: {
                  label: "Not disappointed",
                  icon: Frown,
                  color: "text-slate-400",
                  bg: "bg-slate-500/10",
                },
              };
              const level = survey.disappointment_level as keyof typeof levelConfigs;
              const levelConfig = levelConfigs[level] ?? levelConfigs.not_disappointed;

              const Icon = levelConfig.icon;

              return (
                <div key={survey.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${levelConfig.bg}`}>
                      <Icon className={`w-5 h-5 ${levelConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${levelConfig.color}`}>
                          {levelConfig.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {survey.user_role} •{" "}
                          {new Date(survey.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {survey.follow_up_text && (
                        <p className="text-sm text-foreground">
                          &quot;{survey.follow_up_text}&quot;
                        </p>
                      )}
                      {survey.page_url && (
                        <p className="text-xs text-muted-foreground mt-1">
                          From: {survey.page_url}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
