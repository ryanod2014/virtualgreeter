import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Widget Settings Tests
 *
 * Tests for getWidgetSettings and cache utilities:
 * - getWidgetSettings: Fetches widget settings from Supabase with pool/org hierarchy
 * - clearOrgSettingsCache: Clears cached org settings
 * - clearPoolSettingsCache: Clears cached pool settings
 * - clearAllSettingsCaches: Clears all cached settings
 *
 * Key behaviors tested:
 * - Returns DEFAULT_WIDGET_SETTINGS when Supabase not configured
 * - Returns org's widget settings when available
 * - Pool settings override org defaults when pool has custom settings
 * - Falls back to org settings when pool has no custom settings
 * - Returns defaults when fetch fails
 * - Caches results to avoid repeated DB calls
 */

// Mock Supabase before importing the module
vi.mock("./supabase.js", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

// Import after mocks
import {
  getWidgetSettings,
  clearOrgSettingsCache,
  clearPoolSettingsCache,
  clearAllSettingsCaches,
} from "./widget-settings.js";

const DEFAULT_WIDGET_SETTINGS = {
  size: "medium",
  position: "bottom-right",
  devices: "all",
  trigger_delay: 3,
  auto_hide_delay: null,
  show_minimize_button: false,
  theme: "dark",
};

describe("widget-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getWidgetSettings", () => {
    it("returns default widget settings when Supabase is not configured", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings).toEqual(DEFAULT_WIDGET_SETTINGS);
    });

    it("returns default size of 'medium'", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.size).toBe("medium");
    });

    it("returns default position of 'bottom-right'", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.position).toBe("bottom-right");
    });

    it("returns default devices of 'all'", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.devices).toBe("all");
    });

    it("returns default trigger_delay of 3 seconds", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.trigger_delay).toBe(3);
    });

    it("returns default auto_hide_delay of null (never auto-hide)", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.auto_hide_delay).toBeNull();
    });

    it("returns default show_minimize_button of false", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.show_minimize_button).toBe(false);
    });

    it("returns default theme of 'dark'", async () => {
      const settings = await getWidgetSettings("org_123", null);

      expect(settings.theme).toBe("dark");
    });

    it("returns same defaults for any org when Supabase not configured", async () => {
      const settings1 = await getWidgetSettings("org_abc", null);
      const settings2 = await getWidgetSettings("org_xyz", null);

      expect(settings1).toEqual(DEFAULT_WIDGET_SETTINGS);
      expect(settings2).toEqual(DEFAULT_WIDGET_SETTINGS);
    });

    it("returns same defaults regardless of poolId when Supabase not configured", async () => {
      const settings1 = await getWidgetSettings("org_123", null);
      const settings2 = await getWidgetSettings("org_123", "pool_456");

      expect(settings1).toEqual(DEFAULT_WIDGET_SETTINGS);
      expect(settings2).toEqual(DEFAULT_WIDGET_SETTINGS);
    });
  });

  describe("clearOrgSettingsCache", () => {
    it("does not throw when clearing non-existent cache entry", () => {
      expect(() => clearOrgSettingsCache("nonexistent_org")).not.toThrow();
    });

    it("can be called multiple times for same org", () => {
      expect(() => {
        clearOrgSettingsCache("org_123");
        clearOrgSettingsCache("org_123");
      }).not.toThrow();
    });
  });

  describe("clearPoolSettingsCache", () => {
    it("does not throw when clearing non-existent cache entry", () => {
      expect(() => clearPoolSettingsCache("nonexistent_pool")).not.toThrow();
    });

    it("can be called multiple times for same pool", () => {
      expect(() => {
        clearPoolSettingsCache("pool_123");
        clearPoolSettingsCache("pool_123");
      }).not.toThrow();
    });
  });

  describe("clearAllSettingsCaches", () => {
    it("does not throw when caches are empty", () => {
      expect(() => clearAllSettingsCaches()).not.toThrow();
    });

    it("can be called multiple times", () => {
      expect(() => {
        clearAllSettingsCaches();
        clearAllSettingsCaches();
      }).not.toThrow();
    });
  });
});

describe("widget-settings with Supabase configured", () => {
  // Create mock Supabase client with chainable query builder
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockSupabase = { from: mockFrom };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default behavior
    mockSingle.mockReset();
    mockEq.mockReset().mockReturnValue({ single: mockSingle });
    mockSelect.mockReset().mockReturnValue({ eq: mockEq });
    mockFrom.mockReset().mockReturnValue({ select: mockSelect });

    // Clear caches between tests
    clearAllSettingsCaches();

    // Re-mock with Supabase configured
    vi.doMock("./supabase.js", () => ({
      supabase: mockSupabase,
      isSupabaseConfigured: true,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("org settings hierarchy", () => {
    it("queries organizations table for org default settings", async () => {
      // Import fresh module with new mocks
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: {
          default_widget_settings: {
            size: "large",
            position: "top-left",
            devices: "desktop",
            trigger_delay: 10,
            auto_hide_delay: 60,
            show_minimize_button: true,
            theme: "light",
          },
        },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_123", null);

      expect(mockFrom).toHaveBeenCalledWith("organizations");
      expect(mockSelect).toHaveBeenCalledWith("default_widget_settings");
      expect(mockEq).toHaveBeenCalledWith("id", "org_123");
      expect(settings.size).toBe("large");
      expect(settings.position).toBe("top-left");
      expect(settings.devices).toBe("desktop");
      expect(settings.trigger_delay).toBe(10);
      expect(settings.auto_hide_delay).toBe(60);
      expect(settings.show_minimize_button).toBe(true);
      expect(settings.theme).toBe("light");
    });

    it("returns defaults when org has no default_widget_settings", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: { default_widget_settings: null },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_no_settings", null);

      expect(settings).toEqual(DEFAULT_WIDGET_SETTINGS);
    });

    it("returns defaults when org query fails", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Database error" },
      });

      const settings = await getWidgetSettingsFresh("org_error", null);

      expect(settings).toEqual(DEFAULT_WIDGET_SETTINGS);
    });
  });

  describe("pool settings override", () => {
    it("queries agent_pools table when poolId provided", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      // Pool has custom settings
      mockSingle.mockResolvedValueOnce({
        data: {
          widget_settings: {
            size: "small",
            position: "bottom-left",
            devices: "mobile",
            trigger_delay: 5,
            auto_hide_delay: 120,
            show_minimize_button: true,
            theme: "liquid-glass",
          },
        },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_123", "pool_456");

      expect(mockFrom).toHaveBeenCalledWith("agent_pools");
      expect(mockSelect).toHaveBeenCalledWith("widget_settings");
      expect(mockEq).toHaveBeenCalledWith("id", "pool_456");
      expect(settings.size).toBe("small");
      expect(settings.position).toBe("bottom-left");
      expect(settings.devices).toBe("mobile");
      expect(settings.trigger_delay).toBe(5);
      expect(settings.auto_hide_delay).toBe(120);
      expect(settings.show_minimize_button).toBe(true);
      expect(settings.theme).toBe("liquid-glass");
    });

    it("falls back to org settings when pool has null widget_settings", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      // Pool query - no custom settings
      mockSingle.mockResolvedValueOnce({
        data: { widget_settings: null },
        error: null,
      });

      // Org query - has settings
      mockSingle.mockResolvedValueOnce({
        data: {
          default_widget_settings: {
            size: "large",
            position: "center",
            devices: "all",
            trigger_delay: 0,
            auto_hide_delay: null,
            show_minimize_button: false,
            theme: "dark",
          },
        },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_123", "pool_no_settings");

      // Should have called both agent_pools and organizations
      expect(mockFrom).toHaveBeenCalledWith("agent_pools");
      expect(mockFrom).toHaveBeenCalledWith("organizations");
      expect(settings.size).toBe("large");
      expect(settings.position).toBe("center");
    });

    it("returns defaults when pool query fails and org has no settings", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      // Pool query fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Pool not found" },
      });

      // Org query also fails
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Org not found" },
      });

      const settings = await getWidgetSettingsFresh("org_error", "pool_error");

      expect(settings).toEqual(DEFAULT_WIDGET_SETTINGS);
    });
  });

  describe("caching behavior", () => {
    it("caches org settings and reuses on subsequent calls", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      const orgSettings = {
        size: "large" as const,
        position: "top-right" as const,
        devices: "desktop" as const,
        trigger_delay: 20,
        auto_hide_delay: 300,
        show_minimize_button: true,
        theme: "light" as const,
      };

      mockSingle.mockResolvedValue({
        data: { default_widget_settings: orgSettings },
        error: null,
      });

      // First call
      const settings1 = await getWidgetSettingsFresh("org_cache_test", null);
      // Second call
      const settings2 = await getWidgetSettingsFresh("org_cache_test", null);

      expect(settings1).toEqual(orgSettings);
      expect(settings2).toEqual(orgSettings);
      // Should only call supabase once due to caching
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("caches pool settings and reuses on subsequent calls", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      const poolSettings = {
        size: "small" as const,
        position: "bottom-left" as const,
        devices: "mobile" as const,
        trigger_delay: 0,
        auto_hide_delay: 60,
        show_minimize_button: false,
        theme: "liquid-glass" as const,
      };

      mockSingle.mockResolvedValue({
        data: { widget_settings: poolSettings },
        error: null,
      });

      // First call
      const settings1 = await getWidgetSettingsFresh("org_123", "pool_cache_test");
      // Second call
      const settings2 = await getWidgetSettingsFresh("org_123", "pool_cache_test");

      expect(settings1).toEqual(poolSettings);
      expect(settings2).toEqual(poolSettings);
      // Should only call supabase once due to caching
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it("clearOrgSettingsCache forces refetch on next call", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const {
        getWidgetSettings: getWidgetSettingsFresh,
        clearOrgSettingsCache: clearOrgFresh,
        clearAllSettingsCaches: clearFresh,
      } = await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValue({
        data: {
          default_widget_settings: {
            ...DEFAULT_WIDGET_SETTINGS,
            size: "large",
          },
        },
        error: null,
      });

      // First call - should query DB
      await getWidgetSettingsFresh("org_clear_test", null);
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Clear cache
      clearOrgFresh("org_clear_test");

      // Second call - should query DB again
      await getWidgetSettingsFresh("org_clear_test", null);
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });

    it("clearPoolSettingsCache forces refetch on next call", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const {
        getWidgetSettings: getWidgetSettingsFresh,
        clearPoolSettingsCache: clearPoolFresh,
        clearAllSettingsCaches: clearFresh,
      } = await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValue({
        data: {
          widget_settings: {
            ...DEFAULT_WIDGET_SETTINGS,
            size: "small",
          },
        },
        error: null,
      });

      // First call - should query DB
      await getWidgetSettingsFresh("org_123", "pool_clear_test");
      expect(mockFrom).toHaveBeenCalledTimes(1);

      // Clear cache
      clearPoolFresh("pool_clear_test");

      // Second call - should query DB again
      await getWidgetSettingsFresh("org_123", "pool_clear_test");
      expect(mockFrom).toHaveBeenCalledTimes(2);
    });
  });

  describe("individual settings values", () => {
    it("supports all valid size values: small, medium, large", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");

      for (const size of ["small", "medium", "large"] as const) {
        clearFresh();
        mockSingle.mockResolvedValueOnce({
          data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, size } },
          error: null,
        });

        const settings = await getWidgetSettingsFresh(`org_size_${size}`, null);
        expect(settings.size).toBe(size);
      }
    });

    it("supports all valid position values", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");

      const positions = ["bottom-right", "bottom-left", "top-right", "top-left", "center"] as const;

      for (const position of positions) {
        clearFresh();
        mockSingle.mockResolvedValueOnce({
          data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, position } },
          error: null,
        });

        const settings = await getWidgetSettingsFresh(`org_pos_${position}`, null);
        expect(settings.position).toBe(position);
      }
    });

    it("supports all valid devices values: all, desktop, mobile", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");

      for (const devices of ["all", "desktop", "mobile"] as const) {
        clearFresh();
        mockSingle.mockResolvedValueOnce({
          data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, devices } },
          error: null,
        });

        const settings = await getWidgetSettingsFresh(`org_devices_${devices}`, null);
        expect(settings.devices).toBe(devices);
      }
    });

    it("supports all valid theme values: light, dark, liquid-glass", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");

      for (const theme of ["light", "dark", "liquid-glass"] as const) {
        clearFresh();
        mockSingle.mockResolvedValueOnce({
          data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, theme } },
          error: null,
        });

        const settings = await getWidgetSettingsFresh(`org_theme_${theme}`, null);
        expect(settings.theme).toBe(theme);
      }
    });

    it("supports trigger_delay of 0 (instant)", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, trigger_delay: 0 } },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_instant", null);
      expect(settings.trigger_delay).toBe(0);
    });

    it("supports custom trigger_delay values", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, trigger_delay: 45 } },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_custom_delay", null);
      expect(settings.trigger_delay).toBe(45);
    });

    it("supports auto_hide_delay as number (seconds)", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, auto_hide_delay: 180 } },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_auto_hide", null);
      expect(settings.auto_hide_delay).toBe(180);
    });

    it("supports auto_hide_delay as null (never hide)", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, auto_hide_delay: null } },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_never_hide", null);
      expect(settings.auto_hide_delay).toBeNull();
    });

    it("supports show_minimize_button as true", async () => {
      vi.resetModules();
      vi.doMock("./supabase.js", () => ({
        supabase: mockSupabase,
        isSupabaseConfigured: true,
      }));

      const { getWidgetSettings: getWidgetSettingsFresh, clearAllSettingsCaches: clearFresh } =
        await import("./widget-settings.js");
      clearFresh();

      mockSingle.mockResolvedValueOnce({
        data: { default_widget_settings: { ...DEFAULT_WIDGET_SETTINGS, show_minimize_button: true } },
        error: null,
      });

      const settings = await getWidgetSettingsFresh("org_minimize", null);
      expect(settings.show_minimize_button).toBe(true);
    });
  });
});





