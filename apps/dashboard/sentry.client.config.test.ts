import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Sentry Client Configuration Tests
 *
 * Tests for sentry.client.config.ts:
 * - Verifies Sentry.init is called with correct configuration
 * - Verifies DSN is loaded from environment
 * - Verifies sample rates are configured correctly
 * - Verifies replay integration is configured with privacy settings
 *
 * Key behaviors tested:
 * - Sentry initializes with DSN from NEXT_PUBLIC_SENTRY_DSN
 * - tracesSampleRate is set to 1 (100%)
 * - replaysOnErrorSampleRate is set to 1.0 (100%)
 * - replaysSessionSampleRate is set to 0.1 (10%)
 * - Replay integration includes maskAllText and blockAllMedia privacy settings
 * - Debug mode is disabled
 */

// Store the captured init options
let capturedInitOptions: Record<string, unknown> | null = null;

// Mock Sentry before importing the config
vi.mock("@sentry/nextjs", () => {
  const mockReplayIntegration = vi.fn((options) => ({
    name: "Replay",
    options,
  }));

  return {
    init: vi.fn((options) => {
      capturedInitOptions = options;
    }),
    replayIntegration: mockReplayIntegration,
  };
});

describe("sentry.client.config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedInitOptions = null;
    // Reset module cache to re-run the config
    vi.resetModules();
    // Set up environment
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe("Sentry Initialization", () => {
    it("calls Sentry.init when config is loaded", async () => {
      const Sentry = await import("@sentry/nextjs");
      await import("./sentry.client.config");

      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });

    it("initializes with DSN from NEXT_PUBLIC_SENTRY_DSN environment variable", async () => {
      await import("./sentry.client.config");

      expect(capturedInitOptions).not.toBeNull();
      expect(capturedInitOptions?.dsn).toBe("https://test@sentry.io/123");
    });

    it("initializes with undefined DSN when environment variable is not set", async () => {
      delete process.env.NEXT_PUBLIC_SENTRY_DSN;

      await import("./sentry.client.config");

      expect(capturedInitOptions).not.toBeNull();
      expect(capturedInitOptions?.dsn).toBeUndefined();
    });
  });

  describe("Sample Rates Configuration", () => {
    it("sets tracesSampleRate to 1 (100%)", async () => {
      await import("./sentry.client.config");

      expect(capturedInitOptions?.tracesSampleRate).toBe(1);
    });

    it("sets replaysOnErrorSampleRate to 1.0 (100%)", async () => {
      await import("./sentry.client.config");

      expect(capturedInitOptions?.replaysOnErrorSampleRate).toBe(1.0);
    });

    it("sets replaysSessionSampleRate to 0.1 (10%)", async () => {
      await import("./sentry.client.config");

      expect(capturedInitOptions?.replaysSessionSampleRate).toBe(0.1);
    });
  });

  describe("Debug Mode", () => {
    it("has debug mode disabled", async () => {
      await import("./sentry.client.config");

      expect(capturedInitOptions?.debug).toBe(false);
    });
  });

  describe("Replay Integration", () => {
    it("includes replay integration in integrations array", async () => {
      await import("./sentry.client.config");

      expect(capturedInitOptions?.integrations).toBeDefined();
      expect(Array.isArray(capturedInitOptions?.integrations)).toBe(true);

      const integrations = capturedInitOptions?.integrations as Array<{
        name: string;
      }>;
      expect(integrations.length).toBeGreaterThan(0);
    });

    it("configures replay integration with maskAllText: true for privacy", async () => {
      const Sentry = await import("@sentry/nextjs");
      await import("./sentry.client.config");

      expect(Sentry.replayIntegration).toHaveBeenCalledWith(
        expect.objectContaining({
          maskAllText: true,
        })
      );
    });

    it("configures replay integration with blockAllMedia: true for privacy", async () => {
      const Sentry = await import("@sentry/nextjs");
      await import("./sentry.client.config");

      expect(Sentry.replayIntegration).toHaveBeenCalledWith(
        expect.objectContaining({
          blockAllMedia: true,
        })
      );
    });
  });
});



