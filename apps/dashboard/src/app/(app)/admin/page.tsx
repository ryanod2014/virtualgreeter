import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Code,
  Users,
  Layers,
  Palette,
  CheckCircle2,
  ArrowRight,
  Rocket,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { DashboardTracker } from "./dashboard-tracker";

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

  // Fetch all required data for setup status
  const [sitesResult, agentsResult, poolsResult, dispositionsResult, orgResult] = await Promise.all([
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
  ]);

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
      <DashboardTracker />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Rocket className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Quick Setup</h1>
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
            <span className="text-sm font-medium text-muted-foreground">
              {completedSteps} of {steps.length} steps complete
            </span>
            {allComplete ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
                <Sparkles className="w-4 h-4" />
                Ready to go live!
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {steps.length - completedSteps} step{steps.length - completedSteps !== 1 ? "s" : ""} remaining
              </span>
            )}
          </div>
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-primary to-purple-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Setup Steps */}
        <div className="space-y-3 mb-10">
          {steps.map((step, index) => (
            <SetupStepCard key={step.id} step={step} isFirst={index === 0} />
          ))}
        </div>

        {/* Go Live CTA */}
        {allComplete ? (
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    Setup Complete!
                  </h2>
                  <p className="text-muted-foreground">
                    Your widget is ready. Go to the Agent Dashboard to start taking calls.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                Go Live
                <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 border border-border/50 rounded-2xl p-8 hover-lift">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    Almost There!
                  </h2>
                  <p className="text-muted-foreground">
                    Complete the remaining steps to start receiving live video calls.
                  </p>
                </div>
              </div>
              <Link
                href={nextStep.href}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-xl hover:shadow-primary/30"
              >
                {nextStep.actionLabel}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SetupStepCard({ step, isFirst }: { step: SetupStep; isFirst: boolean }) {
  const Icon = step.icon;

  return (
    <Link href={step.href} className="block group">
      <div
        className={`relative overflow-hidden rounded-xl border transition-all duration-200 hover-lift ${
          step.isComplete
            ? "border-primary/30 bg-muted/30 hover:border-primary/50"
            : "border-border/50 bg-muted/20 hover:border-primary/30 hover:bg-muted/40"
        }`}
      >
        <div className="relative p-5 flex items-center gap-5">
          {/* Step Number / Checkmark */}
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
              step.isComplete
                ? "bg-primary/10"
                : "bg-muted/50 group-hover:bg-primary/10"
            }`}
          >
            {step.isComplete ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground group-hover:text-primary transition-colors">{step.number}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3
                className={`text-base font-semibold transition-colors ${
                  step.isComplete
                    ? "text-foreground"
                    : "group-hover:text-foreground"
                }`}
              >
                {step.title}
              </h3>
              {step.isComplete && (
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                  {step.completeLabel}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </div>

          {/* Icon / Action */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                step.isComplete
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/30 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <ArrowRight
              className={`w-5 h-5 transition-all ${
                step.isComplete
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-primary group-hover:translate-x-1"
              }`}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
