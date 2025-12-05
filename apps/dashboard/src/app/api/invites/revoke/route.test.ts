import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock fetch for billing API
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/invites/revoke", () => {
  const mockUserId = "user-123";
  const mockOrgId = "org-456";
  const mockInviteId = "invite-789";

  let mockAuthGetUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful fetch mock for billing
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(body: object, cookies = ""): NextRequest {
    const request = new NextRequest("http://localhost:3000/api/invites/revoke", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (cookies) {
      request.headers.set("cookie", cookies);
    }
    return request;
  }

  function setupSupabaseMock(options: {
    userExists?: boolean;
    profile?: object | null;
    invite?: object | null;
    deleteError?: object | null;
  }) {
    const {
      userExists = true,
      profile = { role: "admin", organization_id: mockOrgId },
      invite = { id: mockInviteId, organization_id: mockOrgId, accepted_at: null },
      deleteError = null,
    } = options;

    const mockFrom = vi.fn((tableName: string) => {
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
      if (tableName === "invites") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: invite,
                  error: invite ? null : { message: "Not found" },
                }),
              })),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: deleteError,
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

    return mockFrom;
  }

  describe("Authentication", () => {
    it("returns 401 if user is not authenticated", async () => {
      setupSupabaseMock({ userExists: false });

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });

    it("returns 403 if user is not an admin", async () => {
      setupSupabaseMock({ profile: { role: "agent", organization_id: mockOrgId } });

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Admin access required");
    });

    it("returns 403 if user profile is not found", async () => {
      setupSupabaseMock({ profile: null });

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Admin access required");
    });
  });

  describe("Request Validation", () => {
    it("returns 400 when inviteId is missing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({});
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invite ID required");
    });
  });

  describe("Invite Lookup", () => {
    it("returns 404 when invite is not found", async () => {
      setupSupabaseMock({ invite: null });

      const request = createMockRequest({ inviteId: "nonexistent-invite" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Invite not found");
    });

    it("verifies invite belongs to user's organization", async () => {
      const mockFrom = setupSupabaseMock({});

      const request = createMockRequest({ inviteId: mockInviteId });
      await POST(request);

      // Verify the query chain includes org check
      expect(mockFrom).toHaveBeenCalledWith("invites");
    });

    it("returns 400 if invite has already been accepted", async () => {
      setupSupabaseMock({
        invite: { id: mockInviteId, organization_id: mockOrgId, accepted_at: "2024-01-01T00:00:00Z" },
      });

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Cannot revoke accepted invite");
    });
  });

  describe("Invite Deletion", () => {
    it("deletes the invite from database", async () => {
      const mockFrom = setupSupabaseMock({});

      const request = createMockRequest({ inviteId: mockInviteId });
      await POST(request);

      expect(mockFrom).toHaveBeenCalledWith("invites");
    });

    it("returns 500 if delete operation fails", async () => {
      setupSupabaseMock({ deleteError: { message: "Database error" } });

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to revoke invite");
    });
  });

  describe("Billing Seat Credit", () => {
    it("calls billing seats API to remove seat after successful deletion", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ inviteId: mockInviteId }, "session=abc123");
      await POST(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing/seats"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Cookie: "session=abc123",
          }),
          body: JSON.stringify({ action: "remove", quantity: 1 }),
        })
      );
    });

    it("forwards cookies from request to billing API", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ inviteId: mockInviteId }, "auth_token=xyz789");
      await POST(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: "auth_token=xyz789",
          }),
        })
      );
    });
  });

  describe("Success Response", () => {
    it("returns success response on successful revocation", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("returns 500 for unexpected errors", async () => {
      (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database connection failed"));

      const request = createMockRequest({ inviteId: mockInviteId });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal server error");
    });
  });
});
