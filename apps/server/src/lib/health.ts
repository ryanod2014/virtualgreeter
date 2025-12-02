/**
 * Health Check System
 *
 * Provides comprehensive health checking for observability endpoints.
 * Supports Kubernetes-style readiness/liveness probes and dependency awareness.
 */

export type HealthStatus = "healthy" | "unhealthy" | "degraded";

export interface CheckResult {
  status: HealthStatus;
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthCheck {
  name: string;
  check: () => Promise<CheckResult>;
  critical: boolean; // If true, failure = server unhealthy
}

export interface HealthResult {
  status: HealthStatus;
  timestamp: number;
  version: string;
  uptime: number;
  checks: Record<string, CheckResult>;
}

// Server start time for uptime calculation
const serverStartTime = Date.now();

// Graceful shutdown tracking
let isShuttingDown = false;

/**
 * Mark server as shutting down (called during graceful shutdown)
 */
export function markShuttingDown(): void {
  isShuttingDown = true;
}

/**
 * Check if server is in shutdown mode
 */
export function isInShutdownMode(): boolean {
  return isShuttingDown;
}

/**
 * HealthChecker - Central registry for health checks
 *
 * Manages multiple health check implementations and aggregates results.
 * Supports critical vs non-critical checks for degraded state detection.
 */
export class HealthChecker {
  private checks: HealthCheck[] = [];
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = 5000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Register a new health check
   */
  register(check: HealthCheck): void {
    this.checks.push(check);
    console.log(
      `[HealthChecker] Registered check: ${check.name} (critical: ${check.critical})`
    );
  }

  /**
   * Run a single health check with timeout protection
   */
  async runCheck(name: string): Promise<CheckResult> {
    const check = this.checks.find((c) => c.name === name);
    if (!check) {
      return { status: "unhealthy", error: `Check '${name}' not found` };
    }

    return this.executeWithTimeout(check);
  }

  /**
   * Run all registered health checks and aggregate results
   */
  async runAll(): Promise<HealthResult> {
    const results = await Promise.all(
      this.checks.map(async (check) => {
        const result = await this.executeWithTimeout(check);
        return { name: check.name, result, critical: check.critical };
      })
    );

    // Build checks object
    const checks: Record<string, CheckResult> = {};
    let hasCriticalFailure = false;
    let hasAnyFailure = false;

    for (const { name, result, critical } of results) {
      checks[name] = result;

      if (result.status === "unhealthy") {
        hasAnyFailure = true;
        if (critical) {
          hasCriticalFailure = true;
        }
      } else if (result.status === "degraded") {
        hasAnyFailure = true;
      }
    }

    // Determine overall status
    // - unhealthy: any critical check failed
    // - degraded: non-critical check failed, or check is degraded
    // - healthy: all checks pass
    let status: HealthStatus = "healthy";
    if (hasCriticalFailure) {
      status = "unhealthy";
    } else if (hasAnyFailure) {
      status = "degraded";
    }

    return {
      status,
      timestamp: Date.now(),
      version: process.env["npm_package_version"] ?? "1.0.0",
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      checks,
    };
  }

  /**
   * Execute a check with timeout protection
   */
  private async executeWithTimeout(check: HealthCheck): Promise<CheckResult> {
    const start = Date.now();

    try {
      const result = await Promise.race([
        check.check(),
        new Promise<CheckResult>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Health check '${check.name}' timed out`)),
            this.timeoutMs
          )
        ),
      ]);

      // Add latency if not already present
      if (result.latency === undefined) {
        result.latency = Date.now() - start;
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[HealthChecker] Check '${check.name}' failed:`, message);
      return {
        status: "unhealthy",
        error: message,
        latency: Date.now() - start,
      };
    }
  }
}

// ============================================================================
// BUILT-IN HEALTH CHECKS
// ============================================================================

/**
 * Create a memory health check
 * Critical because OOM can crash the server
 *
 * Note: Node's heap dynamically grows, so we check both:
 * - RSS (Resident Set Size) against an absolute limit (default 512MB)
 * - Heap percentage only when heap is significantly allocated (>128MB)
 */
export function createMemoryCheck(
  rssLimitMB: number = 512,
  heapWarnPercent: number = 75,
  heapCriticalPercent: number = 90
): HealthCheck {
  return {
    name: "memory",
    critical: true,
    check: async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / 1024 / 1024;
      const heapTotalMB = usage.heapTotal / 1024 / 1024;
      const rssMB = usage.rss / 1024 / 1024;
      const percentUsed = (heapUsedMB / heapTotalMB) * 100;

      // Determine status based on memory usage
      let status: HealthStatus = "healthy";

      // Check RSS against absolute limit
      if (rssMB > rssLimitMB) {
        status = "unhealthy";
      } else if (rssMB > rssLimitMB * 0.8) {
        status = "degraded";
      }
      // Only check heap percentage if heap is meaningfully sized (>128MB)
      // This avoids false positives during startup when heap is small
      else if (heapTotalMB > 128) {
        if (percentUsed > heapCriticalPercent) {
          status = "unhealthy";
        } else if (percentUsed > heapWarnPercent) {
          status = "degraded";
        }
      }

      return {
        status,
        details: {
          used: `${heapUsedMB.toFixed(0)}MB`,
          total: `${heapTotalMB.toFixed(0)}MB`,
          rss: `${rssMB.toFixed(0)}MB`,
          rssLimit: `${rssLimitMB}MB`,
          percent: `${percentUsed.toFixed(1)}%`,
        },
      };
    },
  };
}

/**
 * Create a Redis health check
 * Critical because Redis is required for state management and routing
 */
export function createRedisCheck(
  isConnected: () => boolean,
  ping: () => Promise<string>
): HealthCheck {
  return {
    name: "redis",
    critical: true,
    check: async () => {
      const start = Date.now();

      // Check if connection exists
      if (!isConnected()) {
        return {
          status: "unhealthy",
          error: "Redis not connected",
          latency: Date.now() - start,
        };
      }

      try {
        await ping();
        return {
          status: "healthy",
          latency: Date.now() - start,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          status: "unhealthy",
          error: message,
          latency: Date.now() - start,
        };
      }
    },
  };
}

/**
 * Create a Supabase health check
 * Non-critical because calls still work without it (just no logging)
 */
export function createSupabaseCheck(
  isConfigured: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any | null
): HealthCheck {
  return {
    name: "supabase",
    critical: false, // Calls work without it, just no logging
    check: async () => {
      const start = Date.now();

      // Check if Supabase is configured
      if (!isConfigured || !client) {
        return {
          status: "degraded",
          error: "Supabase not configured",
          latency: Date.now() - start,
        };
      }

      try {
        // Simple query to verify connection - using health_checks table or a lightweight query
        const { error } = await client
          .from("organizations")
          .select("id")
          .limit(1);

        if (error) {
          return {
            status: "unhealthy",
            error: error.message,
            latency: Date.now() - start,
          };
        }

        return {
          status: "healthy",
          latency: Date.now() - start,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        return {
          status: "unhealthy",
          error: message,
          latency: Date.now() - start,
        };
      }
    },
  };
}

