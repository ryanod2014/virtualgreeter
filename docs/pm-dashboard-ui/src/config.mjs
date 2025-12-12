/**
 * Configuration for PM Dashboard and Agent Orchestration
 * 
 * ALL AUTOMATION IS OFF BY DEFAULT.
 * Enable specific features as needed via environment variables or runtime API.
 */

export const config = {
  // ═══════════════════════════════════════════════════════════════
  // AUTOMATION CONTROLS (The "off switches")
  // ═══════════════════════════════════════════════════════════════
  automation: {
    enabled: true,               // Master switch for all auto-behavior
    autoQueueOnDevComplete: true,    // Auto-queue regression after dev done
    autoQueueOnQaPass: true,         // Auto-queue finalizing after QA pass
    autoDispatchOnBlock: true,       // Auto-dispatch for the specific blocked ticket
  },

  // ═══════════════════════════════════════════════════════════════
  // PARALLEL LIMITS
  // ═══════════════════════════════════════════════════════════════
  limits: {
    maxParallelDevAgents: 2,     // Hard cap on dev agents
    maxParallelQaAgents: 2,      // Hard cap on QA agents
    maxIterations: 5,            // Max retry loops per ticket
    maxJobRetries: 3,            // Max job retry attempts
  },

  // ═══════════════════════════════════════════════════════════════
  // TIMEOUTS
  // ═══════════════════════════════════════════════════════════════
  timeouts: {
    agentStallMinutes: 15,       // Mark agent stalled after this
    jobProcessIntervalMs: 5000,  // How often to check job queue
    heartbeatIntervalMs: 60000,  // Agent heartbeat frequency
  },

  // ═══════════════════════════════════════════════════════════════
  // PATHS
  // ═══════════════════════════════════════════════════════════════
  paths: {
    projectRoot: '/Users/ryanodonnell/projects/Digital_greeter',
    worktreeBase: '/Users/ryanodonnell/projects/agent-worktrees',
    promptsDir: 'docs/prompts/active',
    agentOutput: 'docs/agent-output',
  },
};

// ═══════════════════════════════════════════════════════════════
// ENVIRONMENT OVERRIDES
// ═══════════════════════════════════════════════════════════════

// Allow runtime override via environment variables
if (process.env.AUTOMATION_ENABLED === 'true') {
  config.automation.enabled = true;
}
if (process.env.AUTO_QUEUE_ON_DEV_COMPLETE === 'true') {
  config.automation.autoQueueOnDevComplete = true;
}
if (process.env.AUTO_QUEUE_ON_QA_PASS === 'true') {
  config.automation.autoQueueOnQaPass = true;
}
if (process.env.AUTO_DISPATCH_ON_BLOCK === 'true') {
  config.automation.autoDispatchOnBlock = true;
}

// Limit overrides
if (process.env.MAX_PARALLEL_DEV_AGENTS) {
  config.limits.maxParallelDevAgents = parseInt(process.env.MAX_PARALLEL_DEV_AGENTS, 10);
}
if (process.env.MAX_PARALLEL_QA_AGENTS) {
  config.limits.maxParallelQaAgents = parseInt(process.env.MAX_PARALLEL_QA_AGENTS, 10);
}

/**
 * Update config at runtime (for API-based control)
 */
export function updateConfig(updates) {
  if (updates.automation) {
    Object.assign(config.automation, updates.automation);
  }
  if (updates.limits) {
    Object.assign(config.limits, updates.limits);
  }
  if (updates.timeouts) {
    Object.assign(config.timeouts, updates.timeouts);
  }
  return config;
}

/**
 * Get current config (read-only copy)
 */
export function getConfig() {
  return JSON.parse(JSON.stringify(config));
}

export default config;
