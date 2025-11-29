import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Code,
  Users,
  Layers,
  Palette,
  CheckCircle2,
  Circle,
  ArrowRight,
  Rocket,
  Sparkles,
  AlertCircle,
  Eye,
  TrendingUp,
  AlertTriangle,
  UserPlus,
} from "lucide-react";

interface SetupStep {
  id: string;
  number: number;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
  actionLabel: string;
  completeLabel: string;
}

export default async function AdminOverviewPage() {
  const auth = await getCurrentUser();
  const supabase = await createClient();

  // Date range for coverage stats (last 30 days)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch all required data for setup status
  const [sitesResult, agentsResult, poolsResult, dispositionsResult, orgResult, pageviewsResult, callsResult] = await Promise.all([
    supabase
      .from("sites")
      .select("id", { count: "exact" })
      .eq("organization_id", auth!.organization.id),
    supabase
      .from("agent_profiles")
      .select("id", { count: "exact" })
      .eq("organization_id", auth!.organization.id)
      .eq("is_active", true),
    supabase
      .from("agent_pools")
      .select("id, agent_pool_members(id)", { count: "exact" })
      .eq("organization_id", auth!.organization.id),
    supabase
      .from("dispositions")
      .select("id", { count: "exact" })
      .eq("organization_id", auth!.organization.id)
      .eq("is_active", true),
    // Fetch embed verification status
    supabase
      .from("organizations")
      .select("embed_verified_at, embed_verified_domain")
      .eq("id", auth!.organization.id)
      .single(),
    // Fetch pageviews for coverage calculation
    supabase
      .from("widget_pageviews")
      .select("id, agent_id")
      .eq("organization_id", auth!.organization.id)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    // Fetch answered calls for answer rate
    supabase
      .from("call_logs")
      .select("id, status")
      .eq("organization_id", auth!.organization.id)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .in("status", ["accepted", "completed"]),
  ]);

  // Calculate coverage stats
  const pageviews = pageviewsResult.data ?? [];
  const pageviewsTotal = pageviews.length;
  const pageviewsWithAgent = pageviews.filter(p => p.agent_id !== null).length;
  const missedOpportunities = pageviewsTotal - pageviewsWithAgent;
  const coverageRate = pageviewsTotal > 0 ? (pageviewsWithAgent / pageviewsTotal) * 100 : 100;
  
  const answeredCalls = callsResult.data?.length ?? 0;
  const answerRate = pageviewsWithAgent > 0 ? (answeredCalls / pageviewsWithAgent) * 100 : 0;

  // Check if pools have agents assigned
  const poolsWithAgents = poolsResult.data?.filter(
    (p: { agent_pool_members: { id: string }[] }) => p.agent_pool_members && p.agent_pool_members.length > 0
  ) || [];

  // Setup completion status
  const hasSites = (sitesResult.count ?? 0) > 0;
  const hasAgents = (agentsResult.count ?? 0) > 0;
  const hasPoolsWithAgents = poolsWithAgents.length > 0;
  const hasDispositions = (dispositionsResult.count ?? 0) > 0;
  
  // Check if embed is verified
  const isEmbedVerified = !!orgResult.data?.embed_verified_at;
  const verifiedDomain = orgResult.data?.embed_verified_domain;

  // Define the 4 setup steps
  const steps: SetupStep[] = [
    {
      id: "embed",
      number: 1,
      title: "Install Widget",
      description: isEmbedVerified 
        ? `Widget detected on ${verifiedDomain}`
        : "Copy the embed code and add it to your website's HTML.",
      href: "/admin/sites",
      icon: Code,
      isComplete: isEmbedVerified,
      actionLabel: "Get Embed Code",
      completeLabel: `Installed on ${verifiedDomain}`,
    },
    {
      id: "agents",
      number: 2,
      title: "Add Agents",
      description: "Add yourself as an agent or invite others to handle live video calls with visitors.",
      href: "/admin/agents",
      icon: Users,
      isComplete: hasAgents,
      actionLabel: "Add Agents",
      completeLabel: `${agentsResult.count} agent${(agentsResult.count ?? 0) !== 1 ? "s" : ""} added`,
    },
    {
      id: "pools",
      number: 3,
      title: "Create Pools",
      description: "Organize agents into pools and set up routing rules for different pages or domains.",
      href: "/admin/pools",
      icon: Layers,
      isComplete: hasPoolsWithAgents,
      actionLabel: "Set Up Pools",
      completeLabel: `${poolsWithAgents.length} pool${poolsWithAgents.length !== 1 ? "s" : ""} configured`,
    },
    {
      id: "dispositions",
      number: 4,
      title: "Setup Dispositions",
      description: "Define call outcomes like 'Interested', 'Follow Up', 'Not Qualified' to track conversions.",
      href: "/admin/settings/dispositions",
      icon: Palette,
      isComplete: hasDispositions,
      actionLabel: "Create Dispositions",
      completeLabel: `${dispositionsResult.count} disposition${(dispositionsResult.count ?? 0) !== 1 ? "s" : ""} active`,
    },
  ];

  const completedSteps = steps.filter((s) => s.isComplete).length;
  const allComplete = completedSteps === steps.length;
  const progress = (completedSteps / steps.length) * 100;

  // Find the first incomplete step for the CTA
  const nextStep = steps.find((s) => !s.isComplete) || steps[0];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Quick Setup</h1>
              <p className="text-muted-foreground">
                {allComplete
                  ? "You're all set! Go live and start connecting with visitors."
                  : "Complete these steps to start receiving live video calls."}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              {completedSteps} of {steps.length} steps complete
            </span>
            {allComplete ? (
              <span className="flex items-center gap-2 text-sm font-medium text-green-500">
                <Sparkles className="w-4 h-4" />
                Ready to go live!
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {steps.length - completedSteps} step{steps.length - completedSteps !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                allComplete
                  ? "bg-gradient-to-r from-green-500 to-emerald-400"
                  : "bg-gradient-to-r from-primary to-purple-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-4 mb-10">
          {steps.map((step, index) => (
            <SetupStepCard key={step.id} step={step} isFirst={index === 0} />
          ))}
        </div>

        {/* Go Live CTA */}
        {allComplete ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-2 border-green-500/30 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                    Setup Complete!
                  </h2>
                  <p className="text-muted-foreground">
                    Your widget is ready. Go to the Agent Dashboard to start taking calls.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold text-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 hover:scale-105 transition-all"
              >
                Go Live
                <Rocket className="w-5 h-5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border-2 border-amber-500/30 p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                    Almost There!
                  </h2>
                  <p className="text-muted-foreground">
                    Complete the remaining steps to start receiving live video calls.
                  </p>
                </div>
              </div>
              <Link
                href={nextStep.href}
                className="flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 transition-all"
              >
                {nextStep.actionLabel}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Coverage Health Card - Only show if there's some traffic */}
        {pageviewsTotal > 0 && (
          <CoverageHealthCard
            coverageRate={coverageRate}
            pageviewsTotal={pageviewsTotal}
            missedOpportunities={missedOpportunities}
            answerRate={answerRate}
            answeredCalls={answeredCalls}
          />
        )}
      </div>
    </div>
  );
}

// Coverage Health Card Component
function CoverageHealthCard({
  coverageRate,
  pageviewsTotal,
  missedOpportunities,
  answerRate,
  answeredCalls,
}: {
  coverageRate: number;
  pageviewsTotal: number;
  missedOpportunities: number;
  answerRate: number;
  answeredCalls: number;
}) {
  const getCoverageStatus = (rate: number) => {
    if (rate >= 90) return { color: "green", label: "Excellent", icon: "🟢" };
    if (rate >= 70) return { color: "amber", label: "Needs Attention", icon: "🟡" };
    return { color: "red", label: "Critical", icon: "🔴" };
  };

  const status = getCoverageStatus(coverageRate);
  
  const bgGradient = {
    green: "from-green-500/10 via-emerald-500/5 to-transparent",
    amber: "from-amber-500/10 via-orange-500/5 to-transparent",
    red: "from-red-500/10 via-rose-500/5 to-transparent",
  }[status.color];
  
  const borderColor = {
    green: "border-green-500/30",
    amber: "border-amber-500/30",
    red: "border-red-500/30",
  }[status.color];
  
  const textColor = {
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  }[status.color];
  
  const progressBg = {
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  }[status.color];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgGradient} border-2 ${borderColor} p-6 mt-8`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Agent Coverage</h3>
            <span className="text-xl">{status.icon}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Last 30 days • {pageviewsTotal} total visitors
          </p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${textColor}`}>
            {coverageRate.toFixed(0)}%
          </p>
          <p className="text-sm text-muted-foreground">{status.label}</p>
        </div>
      </div>

      {/* Coverage Progress Bar */}
      <div className="mb-6">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBg}`}
            style={{ width: `${Math.min(coverageRate, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-background/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-muted-foreground">Covered</span>
          </div>
          <p className="text-2xl font-bold">{pageviewsTotal - missedOpportunities}</p>
          <p className="text-xs text-muted-foreground">visitors had an agent</p>
        </div>
        
        <div className="bg-background/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${missedOpportunities > 0 ? "text-red-500" : "text-muted-foreground"}`} />
            <span className="text-sm text-muted-foreground">Missed</span>
          </div>
          <p className={`text-2xl font-bold ${missedOpportunities > 0 ? "text-red-500" : ""}`}>
            {missedOpportunities}
          </p>
          <p className="text-xs text-muted-foreground">no agent available</p>
        </div>
        
        <div className="bg-background/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Answer Rate</span>
          </div>
          <p className="text-2xl font-bold">{answerRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">{answeredCalls} calls answered</p>
        </div>
      </div>

      {/* Recommendation */}
      {coverageRate < 80 && (
        <div className={`flex items-center justify-between p-4 rounded-xl bg-background/70 border ${borderColor}`}>
          <div className="flex items-center gap-3">
            <UserPlus className={`w-5 h-5 ${textColor}`} />
            <div>
              <p className={`font-medium ${textColor}`}>
                {missedOpportunities > 10 
                  ? "Consider hiring more agents" 
                  : "Increase agent availability"}
              </p>
              <p className="text-sm text-muted-foreground">
                {missedOpportunities} visitors couldn&apos;t connect because no agents were online
              </p>
            </div>
          </div>
          <Link
            href="/admin/agents"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${progressBg} text-white font-medium hover:opacity-90 transition-opacity`}
          >
            Add Agents
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      
      {coverageRate >= 80 && coverageRate < 90 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-background/70 border border-amber-500/30">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Good coverage! A few more active hours would push you to excellent.
          </p>
        </div>
      )}
      
      {coverageRate >= 90 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-background/70 border border-green-500/30">
          <Sparkles className="w-5 h-5 text-green-500" />
          <p className="text-sm text-muted-foreground">
            Excellent coverage! Your visitors almost always have an agent available.
          </p>
        </div>
      )}
    </div>
  );
}

function SetupStepCard({ step, isFirst }: { step: SetupStep; isFirst: boolean }) {
  const Icon = step.icon;

  return (
    <Link href={step.href} className="block group">
      <div
        className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
          step.isComplete
            ? "border-green-500/30 bg-green-500/5 hover:border-green-500/50"
            : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
        }`}
      >
        {/* Glowing effect for incomplete first step */}
        {!step.isComplete && isFirst && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 animate-pulse" />
        )}

        <div className="relative p-6 flex items-center gap-6">
          {/* Step Number / Checkmark */}
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
              step.isComplete
                ? "bg-green-500 shadow-lg shadow-green-500/30"
                : "bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20"
            }`}
          >
            {step.isComplete ? (
              <CheckCircle2 className="w-7 h-7 text-white" />
            ) : (
              <span className="text-2xl font-bold text-primary">{step.number}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3
                className={`text-lg font-semibold transition-colors ${
                  step.isComplete
                    ? "text-green-600 dark:text-green-400"
                    : "group-hover:text-primary"
                }`}
              >
                {step.title}
              </h3>
              {step.isComplete && (
                <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium border border-green-500/20">
                  {step.completeLabel}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </div>

          {/* Icon / Action */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                step.isComplete
                  ? "bg-green-500/10 text-green-500"
                  : "bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <ArrowRight
              className={`w-5 h-5 transition-all ${
                step.isComplete
                  ? "text-green-500"
                  : "text-muted-foreground group-hover:text-primary group-hover:translate-x-1"
              }`}
            />
          </div>
        </div>

        {/* Highlight bar for incomplete first step */}
        {!step.isComplete && isFirst && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-purple-500" />
        )}
      </div>
    </Link>
  );
}
