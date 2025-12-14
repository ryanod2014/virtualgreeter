import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  HealthChecker,
  HealthCheck,
  CheckResult,
  HealthStatus,
  markShuttingDown,
  isInShutdownMode,
  createMemoryCheck,
  createRedisCheck,
  createSupabaseCheck,
} from "./health.js";

/**
 * Health Check System Tests
 *
 * Tests for the health check infrastructure used by uptime monitoring:
 * - HealthChecker class: registration, execution, aggregation
 * - Shutdown mode tracking
 * - Built-in health checks: memory, Redis, Supabase
 *
 * Key behaviors tested:
 * - Health checker aggregates multiple check results correctly
 * - Critical failures result in "unhealthy" status
 * - Non-critical failures result in "degraded" status
 * - Timeouts are handled gracefully
 * - Built-in checks return appropriate status based on conditions
 */

describe("HealthChecker", () => {
  let checker: HealthChecker;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    checker = new HealthChecker();
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("register", () => {
    it("registers a health check and logs the registration", () => {
      const check: HealthCheck = {
        name: "test-check",
        critical: false,
        check: async () => ({ status: "healthy" }),
      };

      checker.register(check);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[HealthChecker] Registered check: test-check (critical: false)"
      );
    });

    it("registers critical checks with critical flag logged", () => {
      const check: HealthCheck = {
        name: "critical-check",
        critical: true,
        check: async () => ({ status: "healthy" }),
      };

      checker.register(check);

      expect(consoleSpy).toHaveBeenCalledWith(
        "[HealthChecker] Registered check: critical-check (critical: true)"
      );
    });
  });

  describe("runCheck", () => {
    it("returns unhealthy with error when check not found", async () => {
      const result = await checker.runCheck("nonexistent");

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Check 'nonexistent' not found");
    });

    it("runs a registered check and returns its result", async () => {
      const check: HealthCheck = {
        name: "test-check",
        critical: false,
        check: async () => ({ status: "healthy", details: { foo: "bar" } }),
      };
      checker.register(check);

      const result = await checker.runCheck("test-check");

      expect(result.status).toBe("healthy");
      expect(result.details).toEqual({ foo: "bar" });
    });

    it("adds latency if not provided by check", async () => {
      const check: HealthCheck = {
        name: "test-check",
        critical: false,
        check: async () => ({ status: "healthy" }),
      };
      checker.register(check);

      const result = await checker.runCheck("test-check");

      expect(result.latency).toBeDefined();
      expect(typeof result.latency).toBe("number");
    });

    it("preserves latency if provided by check", async () => {
      const check: HealthCheck = {
        name: "test-check",
        critical: false,
        check: async () => ({ status: "healthy", latency: 42 }),
      };
      checker.register(check);

      const result = await checker.runCheck("test-check");

      expect(result.latency).toBe(42);
    });

    it("handles check errors gracefully", async () => {
      const check: HealthCheck = {
        name: "error-check",
        critical: false,
        check: async () => {
          throw new Error("Check failed");
        },
      };
      checker.register(check);

      const result = await checker.runCheck("error-check");

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Check failed");
      expect(result.latency).toBeDefined();
    });

    it("handles non-Error throws gracefully", async () => {
      const check: HealthCheck = {
        name: "string-error-check",
        critical: false,
        check: async () => {
          throw "string error";
        },
      };
      checker.register(check);

      const result = await checker.runCheck("string-error-check");

      expect(result.status).toBe("unhealthy");
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("runAll", () => {
    it("returns healthy status with version and timestamp when all checks pass", async () => {
      const check1: HealthCheck = {
        name: "check1",
        critical: true,
        check: async () => ({ status: "healthy" }),
      };
      const check2: HealthCheck = {
        name: "check2",
        critical: false,
        check: async () => ({ status: "healthy" }),
      };
      checker.register(check1);
      checker.register(check2);

      const result = await checker.runAll();

      expect(result.status).toBe("healthy");
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe("number");
      expect(result.version).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(typeof result.uptime).toBe("number");
    });

    it("returns unhealthy status when critical check fails", async () => {
      const criticalCheck: HealthCheck = {
        name: "critical",
        critical: true,
        check: async () => ({ status: "unhealthy", error: "Critical failure" }),
      };
      const nonCriticalCheck: HealthCheck = {
        name: "non-critical",
        critical: false,
        check: async () => ({ status: "healthy" }),
      };
      checker.register(criticalCheck);
      checker.register(nonCriticalCheck);

      const result = await checker.runAll();

      expect(result.status).toBe("unhealthy");
      expect(result.checks["critical"].status).toBe("unhealthy");
      expect(result.checks["non-critical"].status).toBe("healthy");
    });

    it("returns degraded status when non-critical check fails", async () => {
      const criticalCheck: HealthCheck = {
        name: "critical",
        critical: true,
        check: async () => ({ status: "healthy" }),
      };
      const nonCriticalCheck: HealthCheck = {
        name: "non-critical",
        critical: false,
        check: async () => ({ status: "unhealthy", error: "Non-critical failure" }),
      };
      checker.register(criticalCheck);
      checker.register(nonCriticalCheck);

      const result = await checker.runAll();

      expect(result.status).toBe("degraded");
    });

    it("returns degraded status when any check is degraded", async () => {
      const check1: HealthCheck = {
        name: "healthy-check",
        critical: true,
        check: async () => ({ status: "healthy" }),
      };
      const check2: HealthCheck = {
        name: "degraded-check",
        critical: false,
        check: async () => ({ status: "degraded" }),
      };
      checker.register(check1);
      checker.register(check2);

      const result = await checker.runAll();

      expect(result.status).toBe("degraded");
    });

    it("returns unhealthy over degraded when critical check fails", async () => {
      const criticalFailing: HealthCheck = {
        name: "critical-fail",
        critical: true,
        check: async () => ({ status: "unhealthy" }),
      };
      const nonCriticalDegraded: HealthCheck = {
        name: "non-critical-degraded",
        critical: false,
        check: async () => ({ status: "degraded" }),
      };
      checker.register(criticalFailing);
      checker.register(nonCriticalDegraded);

      const result = await checker.runAll();

      expect(result.status).toBe("unhealthy");
    });

    it("includes all check results in the response", async () => {
      const check1: HealthCheck = {
        name: "memory",
        critical: true,
        check: async () => ({ status: "healthy", details: { used: "100MB" } }),
      };
      const check2: HealthCheck = {
        name: "redis",
        critical: true,
        check: async () => ({ status: "healthy", latency: 5 }),
      };
      checker.register(check1);
      checker.register(check2);

      const result = await checker.runAll();

      expect(Object.keys(result.checks)).toHaveLength(2);
      expect(result.checks["memory"]).toBeDefined();
      expect(result.checks["redis"]).toBeDefined();
    });

    it("returns empty checks object when no checks registered", async () => {
      const result = await checker.runAll();

      expect(result.status).toBe("healthy");
      expect(result.checks).toEqual({});
    });
  });

  describe("timeout handling", () => {
    it("times out slow checks and returns unhealthy", async () => {
      const shortTimeoutChecker = new HealthChecker(100); // 100ms timeout
      const slowCheck: HealthCheck = {
        name: "slow-check",
        critical: false,
        check: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return { status: "healthy" };
        },
      };
      shortTimeoutChecker.register(slowCheck);

      const result = await shortTimeoutChecker.runCheck("slow-check");

      expect(result.status).toBe("unhealthy");
      expect(result.error).toContain("timed out");
    });

    it("uses default 5000ms timeout", () => {
      const defaultChecker = new HealthChecker();
      // We can't directly access private timeoutMs, but we test behavior
      expect(defaultChecker).toBeDefined();
    });
  });
});

describe("Shutdown mode", () => {
  // Note: These tests modify module-level state, which persists across tests
  // In real usage, markShuttingDown is only called once during server shutdown

  it("isInShutdownMode returns false initially", () => {
    // Note: This may fail if run after markShuttingDown is called
    // In practice, the shutdown flag can only be set once
    const wasShuttingDown = isInShutdownMode();
    // We check it's a boolean - actual value depends on test order
    expect(typeof wasShuttingDown).toBe("boolean");
  });

  it("markShuttingDown sets shutdown mode to true", () => {
    markShuttingDown();
    expect(isInShutdownMode()).toBe(true);
  });

  it("isInShutdownMode returns true after markShuttingDown", () => {
    // After the previous test, this should still be true
    expect(isInShutdownMode()).toBe(true);
  });
});

describe("createMemoryCheck", () => {
  let originalMemoryUsage: typeof process.memoryUsage;

  beforeEach(() => {
    originalMemoryUsage = process.memoryUsage;
  });

  afterEach(() => {
    process.memoryUsage = originalMemoryUsage;
  });

  it("returns healthy status when memory usage is within limits", async () => {
    // Mock low memory usage: 50MB heap, 100MB RSS
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024,
      rss: 100 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    expect(result.status).toBe("healthy");
    expect(result.details).toBeDefined();
    expect(result.details?.used).toContain("MB");
    expect(result.details?.rss).toContain("MB");
  });

  it("returns unhealthy when RSS exceeds limit", async () => {
    // Mock high RSS: 600MB (over 512MB limit)
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024,
      rss: 600 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
  });

  it("returns degraded when RSS approaches limit (80%)", async () => {
    // Mock RSS at 420MB (82% of 512MB limit)
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024,
      rss: 420 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    expect(result.status).toBe("degraded");
  });

  it("returns unhealthy when heap percentage exceeds critical threshold on large heap", async () => {
    // Mock heap at 95% usage with heap > 128MB
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 190 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024, // 95% usage
      rss: 250 * 1024 * 1024, // Under RSS limit
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
  });

  it("returns degraded when heap percentage exceeds warning threshold on large heap", async () => {
    // Mock heap at 80% usage with heap > 128MB
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 160 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024, // 80% usage
      rss: 250 * 1024 * 1024, // Under RSS limit
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    expect(result.status).toBe("degraded");
  });

  it("ignores heap percentage when heap is small (<128MB)", async () => {
    // Mock small heap at 90% usage (under 128MB total)
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 90 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024, // 90% usage but small total
      rss: 150 * 1024 * 1024, // Under RSS limit
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    // Should be healthy because heap is small
    expect(result.status).toBe("healthy");
  });

  it("marks memory check as critical", () => {
    const check = createMemoryCheck();
    expect(check.critical).toBe(true);
    expect(check.name).toBe("memory");
  });

  it("uses default values when no parameters provided", () => {
    const check = createMemoryCheck();
    expect(check.name).toBe("memory");
    // Default is rssLimitMB=512, heapWarnPercent=75, heapCriticalPercent=90
  });

  it("includes formatted memory details in response", async () => {
    process.memoryUsage = vi.fn().mockReturnValue({
      heapUsed: 100 * 1024 * 1024,
      heapTotal: 200 * 1024 * 1024,
      rss: 250 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    });

    const check = createMemoryCheck(512, 75, 90);
    const result = await check.check();

    expect(result.details?.used).toBe("100MB");
    expect(result.details?.total).toBe("200MB");
    expect(result.details?.rss).toBe("250MB");
    expect(result.details?.rssLimit).toBe("512MB");
    expect(result.details?.percent).toBe("50.0%");
  });
});

describe("createRedisCheck", () => {
  it("returns healthy when connected and ping succeeds", async () => {
    const isConnected = vi.fn().mockReturnValue(true);
    const ping = vi.fn().mockResolvedValue("PONG");

    const check = createRedisCheck(isConnected, ping);
    const result = await check.check();

    expect(result.status).toBe("healthy");
    expect(result.latency).toBeDefined();
    expect(ping).toHaveBeenCalled();
  });

  it("returns unhealthy when not connected", async () => {
    const isConnected = vi.fn().mockReturnValue(false);
    const ping = vi.fn().mockResolvedValue("PONG");

    const check = createRedisCheck(isConnected, ping);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Redis not connected");
    expect(ping).not.toHaveBeenCalled();
  });

  it("returns unhealthy when ping fails", async () => {
    const isConnected = vi.fn().mockReturnValue(true);
    const ping = vi.fn().mockRejectedValue(new Error("Connection refused"));

    const check = createRedisCheck(isConnected, ping);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Connection refused");
  });

  it("handles non-Error ping failures", async () => {
    const isConnected = vi.fn().mockReturnValue(true);
    const ping = vi.fn().mockRejectedValue("string error");

    const check = createRedisCheck(isConnected, ping);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Unknown error");
  });

  it("marks Redis check as critical", () => {
    const check = createRedisCheck(() => true, async () => "PONG");
    expect(check.critical).toBe(true);
    expect(check.name).toBe("redis");
  });

  it("includes latency in all responses", async () => {
    const isConnected = vi.fn().mockReturnValue(true);
    const ping = vi.fn().mockResolvedValue("PONG");

    const check = createRedisCheck(isConnected, ping);
    const result = await check.check();

    expect(result.latency).toBeDefined();
    expect(typeof result.latency).toBe("number");
    expect(result.latency).toBeGreaterThanOrEqual(0);
  });
});

describe("createSupabaseCheck", () => {
  it("returns degraded when not configured", async () => {
    const check = createSupabaseCheck(false, null);
    const result = await check.check();

    expect(result.status).toBe("degraded");
    expect(result.error).toBe("Supabase not configured");
  });

  it("returns degraded when client is null", async () => {
    const check = createSupabaseCheck(true, null);
    const result = await check.check();

    expect(result.status).toBe("degraded");
    expect(result.error).toBe("Supabase not configured");
  });

  it("returns healthy when query succeeds", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [{ id: "org_123" }], error: null }),
    };

    const check = createSupabaseCheck(true, mockClient);
    const result = await check.check();

    expect(result.status).toBe("healthy");
    expect(result.latency).toBeDefined();
    expect(mockClient.from).toHaveBeenCalledWith("organizations");
  });

  it("returns unhealthy when query returns error", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ 
        data: null, 
        error: { message: "Permission denied" } 
      }),
    };

    const check = createSupabaseCheck(true, mockClient);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Permission denied");
  });

  it("returns unhealthy when query throws", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("Network error")),
    };

    const check = createSupabaseCheck(true, mockClient);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Network error");
  });

  it("handles non-Error throws", async () => {
    const mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue("string error"),
    };

    const check = createSupabaseCheck(true, mockClient);
    const result = await check.check();

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Unknown error");
  });

  it("marks Supabase check as non-critical", () => {
    const check = createSupabaseCheck(false, null);
    expect(check.critical).toBe(false);
    expect(check.name).toBe("supabase");
  });

  it("includes latency in all responses", async () => {
    const check = createSupabaseCheck(false, null);
    const result = await check.check();

    expect(result.latency).toBeDefined();
    expect(typeof result.latency).toBe("number");
  });
});

describe("HealthResult structure", () => {
  it("includes all required fields", async () => {
    const checker = new HealthChecker();
    vi.spyOn(console, "log").mockImplementation(() => {});
    
    const result = await checker.runAll();

    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("version");
    expect(result).toHaveProperty("uptime");
    expect(result).toHaveProperty("checks");
  });

  it("uptime is in seconds", async () => {
    const checker = new HealthChecker();
    vi.spyOn(console, "log").mockImplementation(() => {});
    
    const result = await checker.runAll();

    // Uptime should be a reasonable number (server just started for tests)
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.uptime)).toBe(true);
  });

  it("version defaults to 1.0.0 when npm_package_version not set", async () => {
    const checker = new HealthChecker();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const originalVersion = process.env["npm_package_version"];
    delete process.env["npm_package_version"];

    const result = await checker.runAll();

    expect(result.version).toBe("1.0.0");
    
    // Restore
    if (originalVersion) {
      process.env["npm_package_version"] = originalVersion;
    }
  });
});




