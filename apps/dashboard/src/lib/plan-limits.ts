// Plan type matching the database schema
export type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise";

/**
 * Plan limits configuration
 * These define what each plan tier is allowed to have
 */
export const PLAN_LIMITS: Record<SubscriptionPlan, {
  maxAgents: number;
  maxSites: number;
  maxSimultaneousSimulations: number;
  hasRecording: boolean;
  hasAdvancedAnalytics: boolean;
  hasCustomBranding: boolean;
}> = {
  free: {
    maxAgents: 1,
    maxSites: 1,
    maxSimultaneousSimulations: 5,
    hasRecording: false,
    hasAdvancedAnalytics: false,
    hasCustomBranding: false,
  },
  starter: {
    maxAgents: 3,
    maxSites: 3,
    maxSimultaneousSimulations: 25,
    hasRecording: true,
    hasAdvancedAnalytics: false,
    hasCustomBranding: false,
  },
  pro: {
    maxAgents: 10,
    maxSites: 10,
    maxSimultaneousSimulations: 100,
    hasRecording: true,
    hasAdvancedAnalytics: true,
    hasCustomBranding: true,
  },
  enterprise: {
    maxAgents: -1, // unlimited
    maxSites: -1,
    maxSimultaneousSimulations: -1,
    hasRecording: true,
    hasAdvancedAnalytics: true,
    hasCustomBranding: true,
  },
} as const;

export type PlanLimits = typeof PLAN_LIMITS[SubscriptionPlan];

/**
 * Get the limits for a specific plan
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Check if a plan allows a certain number of agents
 * Returns true if the limit allows, false otherwise
 */
export function canAddAgent(plan: SubscriptionPlan, currentAgentCount: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.maxAgents === -1) return true; // unlimited
  return currentAgentCount < limits.maxAgents;
}

/**
 * Check if a plan allows a certain number of sites
 */
export function canAddSite(plan: SubscriptionPlan, currentSiteCount: number): boolean {
  const limits = getPlanLimits(plan);
  if (limits.maxSites === -1) return true; // unlimited
  return currentSiteCount < limits.maxSites;
}

/**
 * Check if a feature is available for a plan
 */
export function hasFeature(
  plan: SubscriptionPlan,
  feature: "hasRecording" | "hasAdvancedAnalytics" | "hasCustomBranding"
): boolean {
  return PLAN_LIMITS[plan][feature];
}

/**
 * Get remaining slots for agents
 * Returns -1 if unlimited
 */
export function getRemainingAgentSlots(plan: SubscriptionPlan, currentAgentCount: number): number {
  const limits = getPlanLimits(plan);
  if (limits.maxAgents === -1) return -1;
  return Math.max(0, limits.maxAgents - currentAgentCount);
}

/**
 * Get remaining slots for sites
 * Returns -1 if unlimited
 */
export function getRemainingSiteSlots(plan: SubscriptionPlan, currentSiteCount: number): number {
  const limits = getPlanLimits(plan);
  if (limits.maxSites === -1) return -1;
  return Math.max(0, limits.maxSites - currentSiteCount);
}

/**
 * Format the limit display (e.g., "3/10" or "Unlimited")
 */
export function formatLimitDisplay(current: number, max: number): string {
  if (max === -1) return `${current} / Unlimited`;
  return `${current} / ${max}`;
}

/**
 * Get upgrade message for reaching a limit
 */
export function getUpgradeMessage(limitType: "agents" | "sites"): string {
  const noun = limitType === "agents" ? "agents" : "sites";
  return `You've reached your plan's ${noun} limit. Upgrade to add more ${noun}.`;
}

