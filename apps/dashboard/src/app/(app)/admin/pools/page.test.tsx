/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock auth actions
vi.mock("@/lib/auth/actions", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock the PoolsClient component - server components need JSX returned
vi.mock("./pools-client", () => ({
  PoolsClient: () => null,
}));

import PoolsPage from "./page";
import { getCurrentUser } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

/**
 * PoolsPage Server Component Tests
 *
 * Tests capture the current behavior of the pools page server component:
 * - Data fetching: Calls correct tables (agent_pools, agent_profiles, organizations, call_logs)
 * - Authentication: Uses getCurrentUser for auth
 * - Error handling: Handles null data gracefully
 */

describe("PoolsPage", () => {
  const mockOrgId = "org-123";
  const mockAuth = {
    organization: { id: mockOrgId },
  };

  const mockPools = [
    {
      id: "pool-1",
      name: "Sales",
      is_catch_all: false,
      pool_routing_rules: [],
      agent_pool_members: [],
    },
  ];

  const mockAgents = [
    {
      id: "agent-1",
      display_name: "John Doe",
      wave_video_url: "https://example.com/wave.mp4",
      intro_video_url: null,
      loop_video_url: null,
    },
  ];

  const mockOrg = {
    default_widget_settings: {
      size: "large",
      position: "bottom-left",
      devices: "desktop",
      trigger_delay: 5,
    },
  };

  const mockCallLogs = [
    { page_url: "https://example.com/pricing" },
    { page_url: "https://example.com/contact" },
  ];

  // Supabase mock builder helpers
  let mockSupabaseClient: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default auth mock
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuth);

    // Setup Supabase mock
    mockSupabaseClient = {
      from: vi.fn(),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabaseClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to setup Supabase query mocks
  function setupSupabaseMocks(options: {
    pools?: object[] | null;
    agents?: object[] | null;
    org?: object | null;
    callLogs?: object[] | null;
  } = {}) {
    const {
      pools = mockPools,
      agents = mockAgents,
      org = mockOrg,
      callLogs = mockCallLogs,
    } = options;

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "agent_pools") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: pools,
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      if (table === "agent_profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: agents,
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "organizations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: org,
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === "call_logs") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                not: vi.fn().mockResolvedValue({
                  data: callLogs,
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      return {};
    });
  }

  // ---------------------------------------------------------------------------
  // DATA FETCHING BEHAVIORS
  // ---------------------------------------------------------------------------

  describe("Data Fetching - Authentication", () => {
    it("calls getCurrentUser to get authenticated user", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      expect(getCurrentUser).toHaveBeenCalled();
    });

    it("creates Supabase client for database queries", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      expect(createClient).toHaveBeenCalled();
    });
  });

  describe("Data Fetching - Database Queries", () => {
    it("fetches pools from agent_pools table", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("agent_pools");
    });

    it("fetches agents from agent_profiles table", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("agent_profiles");
    });

    it("fetches organization settings from organizations table", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("organizations");
    });

    it("fetches call logs for path visitor counts", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith("call_logs");
    });
  });

  describe("Error Handling - Null Data", () => {
    it("handles null pools data without throwing", async () => {
      setupSupabaseMocks({ pools: null });

      // Should not throw
      await expect(PoolsPage()).resolves.not.toThrow();
    });

    it("handles null agents data without throwing", async () => {
      setupSupabaseMocks({ agents: null });

      await expect(PoolsPage()).resolves.not.toThrow();
    });

    it("handles null organization data without throwing", async () => {
      setupSupabaseMocks({ org: null });

      await expect(PoolsPage()).resolves.not.toThrow();
    });

    it("handles null call logs data without throwing", async () => {
      setupSupabaseMocks({ callLogs: null });

      await expect(PoolsPage()).resolves.not.toThrow();
    });

    it("handles empty arrays for all data without throwing", async () => {
      setupSupabaseMocks({
        pools: [],
        agents: [],
        callLogs: [],
      });

      await expect(PoolsPage()).resolves.not.toThrow();
    });
  });

  describe("Server Component Execution", () => {
    it("returns JSX without errors", async () => {
      setupSupabaseMocks();

      const result = await PoolsPage();

      // Server component should return something (mocked as null)
      expect(result).toBeDefined();
    });

    it("executes all database queries in sequence", async () => {
      setupSupabaseMocks();

      await PoolsPage();

      // All tables should have been queried
      const calledTables = mockSupabaseClient.from.mock.calls.map((call) => call[0]);
      expect(calledTables).toContain("agent_pools");
      expect(calledTables).toContain("agent_profiles");
      expect(calledTables).toContain("organizations");
      expect(calledTables).toContain("call_logs");
    });
  });
});





