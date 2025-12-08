import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before imports
vi.mock("./supabase.js", () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

import {
  getOrgSubscriptionStatus,
  isOrgPaused,
  isOrgActive,
  clearOrgStatusCache,
  clearAllOrgStatusCache,
} from "./organization.js";
import { supabase, isSupabaseConfigured } from "./supabase.js";

describe("Organization Status Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllOrgStatusCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupSupabaseMock(options: {
    data?: { subscription_status: string } | null;
    error?: { message: string } | null;
  }) {
    const { data = null, error = null } = options;

    const mockSingle = vi.fn().mockResolvedValue({ data, error });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase!.from).mockImplementation(mockFrom);

    return { mockFrom, mockSelect, mockEq, mockSingle };
  }

  describe("getOrgSubscriptionStatus", () => {
    it("fetches subscription status from database", async () => {
      const { mockFrom, mockSelect, mockEq } = setupSupabaseMock({
        data: { subscription_status: "active" },
      });

      const result = await getOrgSubscriptionStatus("org-123");

      expect(result).toBe("active");
      expect(mockFrom).toHaveBeenCalledWith("organizations");
      expect(mockSelect).toHaveBeenCalledWith("subscription_status");
      expect(mockEq).toHaveBeenCalledWith("id", "org-123");
    });

    it("returns active status for each valid status type", async () => {
      const statuses = ["active", "trialing", "past_due", "cancelled", "paused"];

      for (const status of statuses) {
        clearAllOrgStatusCache();
        setupSupabaseMock({ data: { subscription_status: status } });

        const result = await getOrgSubscriptionStatus(\`org-\${status}\`);

        expect(result).toBe(status);
      }
    });

    it("returns null when org is not found", async () => {
      setupSupabaseMock({ data: null, error: { message: "Not found" } });

      const result = await getOrgSubscriptionStatus("nonexistent-org");

      expect(result).toBeNull();
    });

    it("returns null when database error occurs", async () => {
      setupSupabaseMock({ data: null, error: { message: "Database error" } });

      const result = await getOrgSubscriptionStatus("org-123");

      expect(result).toBeNull();
    });

    it("returns null when database throws an exception", async () => {
      vi.mocked(supabase!.from).mockImplementation(() => {
        throw new Error("Connection failed");
      });

      const result = await getOrgSubscriptionStatus("org-123");

      expect(result).toBeNull();
    });

    it("caches subscription status for 30 seconds", async () => {
      const { mockFrom } = setupSupabaseMock({
        data: { subscription_status: "active" },
      });

      // First call - should hit DB
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Second call immediately - should use cache
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(1); // Still 1, not called again

      // Third call - should still use cache
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("expires cache after TTL and fetches fresh data", async () => {
      vi.useFakeTimers();
      const { mockFrom } = setupSupabaseMock({
        data: { subscription_status: "active" },
      });

      // First call
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Advance time by 31 seconds (beyond 30 second TTL)
      vi.advanceTimersByTime(31_000);

      // Should fetch fresh data
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("caches null results briefly on error to avoid hammering DB", async () => {
      const { mockFrom } = setupSupabaseMock({
        data: null,
        error: { message: "Database error" },
      });

      // First call - should hit DB and get error
      const result1 = await getOrgSubscriptionStatus("org-error");
      expect(result1).toBeNull();
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Second call immediately - should use cached null
      const result2 = await getOrgSubscriptionStatus("org-error");
      expect(result2).toBeNull();
      expect(mockFrom).toHaveBeenCalledTimes(1); // Still 1
    });

    it("expires error cache after 5 seconds", async () => {
      vi.useFakeTimers();
      const { mockFrom } = setupSupabaseMock({
        data: null,
        error: { message: "Database error" },
      });

      // First call
      await getOrgSubscriptionStatus("org-error");
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Advance time by 6 seconds (beyond 5 second error cache)
      vi.advanceTimersByTime(6_000);

      // Should try again
      await getOrgSubscriptionStatus("org-error");
      expect(mockFrom).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it("caches different orgs separately", async () => {
      clearAllOrgStatusCache();

      setupSupabaseMock({ data: { subscription_status: "active" } });
      await getOrgSubscriptionStatus("org-1");

      setupSupabaseMock({ data: { subscription_status: "paused" } });
      await getOrgSubscriptionStatus("org-2");

      setupSupabaseMock({ data: { subscription_status: "cancelled" } });
      await getOrgSubscriptionStatus("org-3");

      // All three orgs should have separate cache entries
      expect(vi.mocked(supabase!.from)).toHaveBeenCalledTimes(3);
    });
  });

  describe("isOrgPaused", () => {
    it("returns true when subscription status is paused", async () => {
      setupSupabaseMock({ data: { subscription_status: "paused" } });

      const result = await isOrgPaused("org-123");

      expect(result).toBe(true);
    });

    it("returns false when subscription status is active", async () => {
      setupSupabaseMock({ data: { subscription_status: "active" } });

      const result = await isOrgPaused("org-123");

      expect(result).toBe(false);
    });

    it("returns false when subscription status is trialing", async () => {
      setupSupabaseMock({ data: { subscription_status: "trialing" } });

      const result = await isOrgPaused("org-123");

      expect(result).toBe(false);
    });

    it("returns false when subscription status is past_due", async () => {
      setupSupabaseMock({ data: { subscription_status: "past_due" } });

      const result = await isOrgPaused("org-123");

      expect(result).toBe(false);
    });

    it("returns false when subscription status is cancelled", async () => {
      setupSupabaseMock({ data: { subscription_status: "cancelled" } });

      const result = await isOrgPaused("org-123");

      expect(result).toBe(false);
    });

    it("returns false when org is not found", async () => {
      setupSupabaseMock({ data: null, error: { message: "Not found" } });

      const result = await isOrgPaused("nonexistent-org");

      expect(result).toBe(false);
    });
  });

  describe("isOrgActive", () => {
    it("returns true when subscription status is active", async () => {
      setupSupabaseMock({ data: { subscription_status: "active" } });

      const result = await isOrgActive("org-123");

      expect(result).toBe(true);
    });

    it("returns true when subscription status is trialing", async () => {
      setupSupabaseMock({ data: { subscription_status: "trialing" } });

      const result = await isOrgActive("org-123");

      expect(result).toBe(true);
    });

    it("returns false when subscription status is paused", async () => {
      setupSupabaseMock({ data: { subscription_status: "paused" } });

      const result = await isOrgActive("org-123");

      expect(result).toBe(false);
    });

    it("returns false when subscription status is past_due", async () => {
      setupSupabaseMock({ data: { subscription_status: "past_due" } });

      const result = await isOrgActive("org-123");

      expect(result).toBe(false);
    });

    it("returns false when subscription status is cancelled", async () => {
      setupSupabaseMock({ data: { subscription_status: "cancelled" } });

      const result = await isOrgActive("org-123");

      expect(result).toBe(false);
    });

    it("returns false when org is not found", async () => {
      setupSupabaseMock({ data: null, error: { message: "Not found" } });

      const result = await isOrgActive("nonexistent-org");

      expect(result).toBe(false);
    });
  });

  describe("clearOrgStatusCache", () => {
    it("clears cache for specific organization", async () => {
      const { mockFrom } = setupSupabaseMock({
        data: { subscription_status: "active" },
      });

      // First call - should hit DB
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Clear cache for this org
      clearOrgStatusCache("org-123");

      // Next call should hit DB again
      await getOrgSubscriptionStatus("org-123");
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it("does not affect cache for other organizations", async () => {
      const { mockFrom } = setupSupabaseMock({
        data: { subscription_status: "active" },
      });

      // Cache two different orgs
      await getOrgSubscriptionStatus("org-1");
      await getOrgSubscriptionStatus("org-2");
      expect(mockFrom).toHaveBeenCalledTimes(2);

      // Clear cache for only org-1
      clearOrgStatusCache("org-1");

      // org-1 should hit DB, org-2 should use cache
      await getOrgSubscriptionStatus("org-1");
      await getOrgSubscriptionStatus("org-2");
      expect(mockFrom).toHaveBeenCalledTimes(3); // Only one more call
    });

    it("handles clearing cache for non-existent org without error", () => {
      expect(() => {
        clearOrgStatusCache("org-nonexistent");
      }).not.toThrow();
    });
  });

  describe("clearAllOrgStatusCache", () => {
    it("clears all cached organization statuses", async () => {
      const { mockFrom } = setupSupabaseMock({
        data: { subscription_status: "active" },
      });

      // Cache multiple orgs
      await getOrgSubscriptionStatus("org-1");
      await getOrgSubscriptionStatus("org-2");
      await getOrgSubscriptionStatus("org-3");
      expect(mockFrom).toHaveBeenCalledTimes(3);

      // Clear all caches
      clearAllOrgStatusCache();

      // All should hit DB again
      await getOrgSubscriptionStatus("org-1");
      await getOrgSubscriptionStatus("org-2");
      await getOrgSubscriptionStatus("org-3");
      expect(mockFrom).toHaveBeenCalledTimes(6); // 3 more calls
    });

    it("can be called when cache is empty", () => {
      expect(() => {
        clearAllOrgStatusCache();
      }).not.toThrow();
    });

    it("can be called multiple times", () => {
      expect(() => {
        clearAllOrgStatusCache();
        clearAllOrgStatusCache();
        clearAllOrgStatusCache();
      }).not.toThrow();
    });
  });

  describe("Cache Integration Scenarios", () => {
    it("handles org status change correctly with cache clearing", async () => {
      // Setup org as active
      setupSupabaseMock({ data: { subscription_status: "active" } });
      let result = await isOrgActive("org-123");
      expect(result).toBe(true);

      // Admin pauses the org (in real code)
      // Simulate the pause by clearing cache and changing DB response
      clearOrgStatusCache("org-123");
      setupSupabaseMock({ data: { subscription_status: "paused" } });

      // Check again - should see paused status
      result = await isOrgActive("org-123");
      expect(result).toBe(false);

      const isPaused = await isOrgPaused("org-123");
      expect(isPaused).toBe(true);
    });

    it("handles resume flow correctly", async () => {
      // Start with paused org
      setupSupabaseMock({ data: { subscription_status: "paused" } });
      let isPaused = await isOrgPaused("org-123");
      expect(isPaused).toBe(true);

      // Admin resumes the org
      clearOrgStatusCache("org-123");
      setupSupabaseMock({ data: { subscription_status: "active" } });

      // Check again - should be active
      const isActive = await isOrgActive("org-123");
      expect(isActive).toBe(true);

      isPaused = await isOrgPaused("org-123");
      expect(isPaused).toBe(false);
    });
  });
});
