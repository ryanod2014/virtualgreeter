import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock supabase module - the factory must not reference external variables
vi.mock("./supabase.js", () => {
  return {
    supabase: null, // Will be replaced in beforeEach
    isSupabaseConfigured: true,
  };
});

// Import the mocked module and the module under test
import * as supabaseModule from "./supabase.js";
import {
  isCountryBlocked,
  getBlockedCountries,
  clearBlocklistCache,
  clearAllBlocklistCaches,
} from "./country-blocklist.js";

describe("Country Blocklist", () => {
  // Setup mock chain
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom = vi.fn(() => ({ select: mockSelect }));

    // Replace the supabase object with our mock
    (supabaseModule as { supabase: unknown }).supabase = {
      from: mockFrom,
    };

    // Clear caches before each test to ensure isolation
    clearAllBlocklistCaches();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // isCountryBlocked() Tests
  // ==========================================================================
  describe("isCountryBlocked", () => {
    it("should return false when country code is null (geolocation failed)", async () => {
      // Even with blocked countries, null country should pass through
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU"] },
        error: null,
      });

      const result = await isCountryBlocked("org1", null);
      expect(result).toBe(false);
    });

    it("should return false when blocklist is empty", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: [] },
        error: null,
      });

      const result = await isCountryBlocked("org1", "US");
      expect(result).toBe(false);
    });

    it("should return true when country code matches blocklist (exact match)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU", "KP"] },
        error: null,
      });

      const result = await isCountryBlocked("org1", "CN");
      expect(result).toBe(true);
    });

    it("should be case-insensitive when checking country codes", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU"] },
        error: null,
      });

      // Lowercase input should match uppercase blocklist
      const result = await isCountryBlocked("org1", "cn");
      expect(result).toBe(true);
    });

    it("should handle mixed-case blocklist entries", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["cn", "Ru", "KP"] },
        error: null,
      });

      // Uppercase input should match lowercase blocklist entry
      const result = await isCountryBlocked("org1", "CN");
      expect(result).toBe(true);
    });

    it("should return false when country is not in blocklist", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU"] },
        error: null,
      });

      const result = await isCountryBlocked("org1", "US");
      expect(result).toBe(false);
    });

    it("should return false when database returns error (fail-safe)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Database connection failed" },
      });

      // Even if there's a DB error, visitors should not be blocked
      const result = await isCountryBlocked("org1", "CN");
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // getBlockedCountries() Tests
  // ==========================================================================
  describe("getBlockedCountries", () => {
    it("should fetch blocked countries from database", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU", "KP"] },
        error: null,
      });

      const result = await getBlockedCountries("org1");
      expect(result).toEqual(["CN", "RU", "KP"]);
      expect(mockFrom).toHaveBeenCalledWith("organizations");
      expect(mockSelect).toHaveBeenCalledWith("blocked_countries, country_list_mode");
      expect(mockEq).toHaveBeenCalledWith("id", "org1");
    });

    it("should return empty array when database returns null data", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getBlockedCountries("org1");
      expect(result).toEqual([]);
    });

    it("should return empty array when blocked_countries is null", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: null },
        error: null,
      });

      const result = await getBlockedCountries("org1");
      expect(result).toEqual([]);
    });

    it("should return empty array on database error", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Connection timeout" },
      });

      const result = await getBlockedCountries("org1");
      expect(result).toEqual([]);
    });

    it("should use cached result on subsequent calls", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN"] },
        error: null,
      });

      // First call - should hit database
      const result1 = await getBlockedCountries("org1");
      expect(result1).toEqual(["CN"]);
      expect(mockSingle).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await getBlockedCountries("org1");
      expect(result2).toEqual(["CN"]);
      expect(mockSingle).toHaveBeenCalledTimes(1); // No additional DB call
    });

    it("should maintain separate caches for different organizations", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { blocked_countries: ["CN"] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { blocked_countries: ["RU", "KP"] },
          error: null,
        });

      const result1 = await getBlockedCountries("org1");
      const result2 = await getBlockedCountries("org2");

      expect(result1).toEqual(["CN"]);
      expect(result2).toEqual(["RU", "KP"]);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Cache Management Tests
  // ==========================================================================
  describe("Cache Management", () => {
    it("clearBlocklistCache should invalidate specific org cache", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { blocked_countries: ["CN"] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { blocked_countries: ["CN", "RU"] },
          error: null,
        });

      // First call - populates cache
      await getBlockedCountries("org1");
      expect(mockSingle).toHaveBeenCalledTimes(1);

      // Clear cache for org1
      clearBlocklistCache("org1");

      // Next call should hit database again
      const result = await getBlockedCountries("org1");
      expect(result).toEqual(["CN", "RU"]);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });

    it("clearBlocklistCache should not affect other orgs", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { blocked_countries: ["CN"] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { blocked_countries: ["RU"] },
          error: null,
        });

      // Populate caches for both orgs
      await getBlockedCountries("org1");
      await getBlockedCountries("org2");
      expect(mockSingle).toHaveBeenCalledTimes(2);

      // Clear only org1's cache
      clearBlocklistCache("org1");

      // org2's cache should still be intact
      await getBlockedCountries("org2");
      expect(mockSingle).toHaveBeenCalledTimes(2); // No additional call for org2
    });

    it("clearAllBlocklistCaches should invalidate all org caches", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: { blocked_countries: ["CN"] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { blocked_countries: ["RU"] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { blocked_countries: ["CN", "updated"] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { blocked_countries: ["RU", "updated"] },
          error: null,
        });

      // Populate caches
      await getBlockedCountries("org1");
      await getBlockedCountries("org2");
      expect(mockSingle).toHaveBeenCalledTimes(2);

      // Clear all caches
      clearAllBlocklistCaches();

      // Both should hit database again
      await getBlockedCountries("org1");
      await getBlockedCountries("org2");
      expect(mockSingle).toHaveBeenCalledTimes(4);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe("Edge Cases", () => {
    it("should handle empty string country code", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU"] },
        error: null,
      });

      // Empty string is truthy but invalid - should not match
      const result = await isCountryBlocked("org1", "");
      expect(result).toBe(false);
    });

    it("should handle whitespace country codes", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU"] },
        error: null,
      });

      const result = await isCountryBlocked("org1", "  ");
      expect(result).toBe(false);
    });

    it("should handle blocklist with empty strings", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "", "RU"] },
        error: null,
      });

      // US should not be blocked
      const resultUS = await isCountryBlocked("org1", "US");
      expect(resultUS).toBe(false);

      // Clear cache and re-mock for next test
      clearBlocklistCache("org1");
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "", "RU"] },
        error: null,
      });

      // CN should still be blocked
      const resultCN = await isCountryBlocked("org1", "CN");
      expect(resultCN).toBe(true);
    });

    it("should handle very long blocklist", async () => {
      // Generate 100 country codes
      const manyCountries = Array.from({ length: 100 }, (_, i) => 
        String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + Math.floor(i / 26))
      );
      
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: manyCountries },
        error: null,
      });

      // Should find a country in the middle of the list
      const result = await isCountryBlocked("org1", manyCountries[50]!);
      expect(result).toBe(true);
    });

    it("should handle concurrent requests for same org", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN"] },
        error: null,
      });

      // Make multiple concurrent requests
      const results = await Promise.all([
        isCountryBlocked("org1", "CN"),
        isCountryBlocked("org1", "US"),
        isCountryBlocked("org1", "RU"),
      ]);

      expect(results).toEqual([true, false, false]);
      // Due to caching, only one DB call should be made
      // (though race conditions might cause 2-3 in rare cases)
      expect(mockSingle.mock.calls.length).toBeLessThanOrEqual(3);
    });
  });

  // ==========================================================================
  // Full blocking flow integration
  // ==========================================================================
  describe("Full blocking flow", () => {
    it("should correctly block visitor from CN when CN is in blocklist", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU", "KP"] },
        error: null,
      });

      // Simulate a visitor from China
      const shouldBlock = await isCountryBlocked("org1", "CN");
      expect(shouldBlock).toBe(true);
    });

    it("should allow visitor from US when only CN/RU are blocked", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU"] },
        error: null,
      });

      const shouldBlock = await isCountryBlocked("org1", "US");
      expect(shouldBlock).toBe(false);
    });

    it("should allow visitor when geolocation fails (null country)", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { blocked_countries: ["CN", "RU", "US", "GB"] },
        error: null,
      });

      // Even with many blocked countries, null should not be blocked
      const shouldBlock = await isCountryBlocked("org1", null);
      expect(shouldBlock).toBe(false);
    });
  });
});

// ==========================================================================
// Tests when Supabase is not configured
// ==========================================================================
describe("Country Blocklist - Supabase Not Configured", () => {
  beforeEach(() => {
    // Set supabase to null to simulate unconfigured state
    (supabaseModule as { supabase: unknown }).supabase = null;
    (supabaseModule as { isSupabaseConfigured: boolean }).isSupabaseConfigured = false;
    clearAllBlocklistCaches();
  });

  afterEach(() => {
    // Restore for other tests
    (supabaseModule as { isSupabaseConfigured: boolean }).isSupabaseConfigured = true;
  });

  it("getBlockedCountries should return empty array when Supabase not configured", async () => {
    const result = await getBlockedCountries("org1");
    expect(result).toEqual([]);
  });

  it("isCountryBlocked should return false when Supabase not configured", async () => {
    const result = await isCountryBlocked("org1", "CN");
    expect(result).toBe(false);
  });
});
