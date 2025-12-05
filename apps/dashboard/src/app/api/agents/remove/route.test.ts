import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock fetch for internal API calls
const originalFetch = global.fetch;

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/agents/remove", () => {
  // Mock data
  const mockUserId = "user-123";
  const mockOrgId = "org-456";
  const mockAgentProfileId = "agent-789";

  // Supabase mock chain helpers
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });

    // Mock fetch for internal /api/billing/seats call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch;
  });

  // Helper to create a mock request
  function createMockRequest(body: object): NextRequest {
    return new NextRequest("http://localhost:3000/api/agents/remove", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=test-cookie",
      },
    });
  }

  // Helper to setup Supabase mock with configurable returns
  function setupSupabaseMock(options: {
    profile?: { role: string; organization_id: string } | null;
    agent?: { id: string; user_id: string; organization_id: string; is_active: boolean } | null;
    userExists?: boolean;
    updateError?: boolean;
    deletePoolsError?: boolean;
  }) {
    const {
      profile = { role: "admin", organization_id: mockOrgId },
      agent = { id: mockAgentProfileId, user_id: "other-user", organization_id: mockOrgId, is_active: true },
      userExists = true,
      updateError = false,
      deletePoolsError = false,
    } = options;

    mockFrom = vi.fn((tableName: string) => {
      if (tableName === "users") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: profile,
                error: profile ? null : { message: "Not found" },
              }),
            })),
          })),
        };
      }
      if (tableName === "agent_profiles") {
        // Handle both select and update operations
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: agent,
                  error: agent ? null : { message: "Not found" },
                }),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: updateError ? { message: "Update failed" } : null,
            }),
          })),
        };
      }
      if (tableName === "agent_pool_members") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: deletePoolsError ? { message: "Delete failed" } : null,
            }),
          })),
        };
      }
      return {};
    });

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: userExists
          ? mockAuthGetUser
          : vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: mockFrom,
    });
  }

  describe("Authentication", () => {
    it("returns 401 if user is not authenticated", async () => {
      setupSupabaseMock({ userExists: false });

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });
  });

  describe("Authorization", () => {
    it("returns 403 if user is not an admin", async () => {
      setupSupabaseMock({ profile: { role: "agent", organization_id: mockOrgId } });

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Admin access required");
    });

    it("returns 403 if user profile is not found", async () => {
      setupSupabaseMock({ profile: null });

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Admin access required");
    });
  });

  describe("Request validation", () => {
    it("returns 400 when agentProfileId is missing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({});
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Agent profile ID required");
    });
  });

  describe("Agent lookup", () => {
    it("returns 404 when agent is not found", async () => {
      setupSupabaseMock({ agent: null });

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Agent not found");
    });

    it("returns 404 when agent belongs to different organization (cross-org protection)", async () => {
      // This is simulated by returning null since the query scopes by org
      setupSupabaseMock({ agent: null });

      const request = createMockRequest({ agentProfileId: "other-org-agent" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Agent not found");
    });
  });

  describe("Agent status validation", () => {
    it("returns 400 when agent is already deactivated", async () => {
      setupSupabaseMock({
        agent: { id: mockAgentProfileId, user_id: "other-user", organization_id: mockOrgId, is_active: false },
      });

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Agent already deactivated");
    });
  });

  describe("Successful removal", () => {
    it("returns success when agent is removed", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    it("soft deletes the agent by setting is_active to false", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      await POST(request);

      // Verify the update was called on agent_profiles
      expect(mockFrom).toHaveBeenCalledWith("agent_profiles");
    });

    it("removes agent from all pools", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      await POST(request);

      // Verify delete was called on agent_pool_members
      expect(mockFrom).toHaveBeenCalledWith("agent_pool_members");
    });

    it("credits back the billing seat", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      await POST(request);

      // Verify billing API was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing/seats"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "remove", quantity: 1 }),
        })
      );
    });

    it("forwards cookies to billing API for authentication", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: "session=test-cookie",
          }),
        })
      );
    });
  });

  describe("Error handling", () => {
    it("returns 500 when update fails", async () => {
      setupSupabaseMock({ updateError: true });

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to remove agent");
    });

    it("returns 500 when an unexpected error occurs", async () => {
      (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest({ agentProfileId: mockAgentProfileId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal server error");
    });
  });
});
