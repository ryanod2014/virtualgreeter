import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// Mock @supabase/ssr
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

import { updateSession } from "./middleware";
import { createServerClient } from "@supabase/ssr";

describe("supabase/middleware - updateSession", () => {
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockFromSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Setup mock chain
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockFromSelect = vi.fn(() => ({ eq: mockEq }));
    mockAuthGetUser = vi.fn();

    (createServerClient as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: {
        getUser: mockAuthGetUser,
      },
      from: vi.fn(() => ({
        select: mockFromSelect,
      })),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create mock NextRequest
  function createMockRequest(path: string): NextRequest {
    return new NextRequest(`http://localhost:3000${path}`);
  }

  describe("Protected routes without authentication", () => {
    it("redirects to /login when accessing /dashboard without user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/dashboard");
      const response = await updateSession(request);

      expect(response.status).toBe(307); // Temporary redirect
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("redirects to /login when accessing /admin without user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/admin");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("redirects to /login when accessing /settings without user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/settings");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("redirects to /login when accessing /platform without user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/platform");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("redirects to /login when accessing nested protected path /dashboard/calls without user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/dashboard/calls");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });

    it("redirects to /login when accessing /admin/agents without user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/admin/agents");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });
  });

  describe("Protected routes with authentication", () => {
    it("allows access to /dashboard when user is authenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123", email: "test@example.com" } },
        error: null,
      });

      const request = createMockRequest("/dashboard");
      const response = await updateSession(request);

      // Should return NextResponse.next() (status 200 and no redirect)
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows access to /admin when user is authenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "admin-123", email: "admin@example.com" } },
        error: null,
      });

      const request = createMockRequest("/admin");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Auth routes with existing session (already authenticated)", () => {
    it("redirects admin from /login to /admin", async () => {
      const mockUser = { id: "admin-user-123", email: "admin@example.com" };
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const request = createMockRequest("/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
    });

    it("redirects agent from /login to /dashboard", async () => {
      const mockUser = { id: "agent-user-123", email: "agent@example.com" };
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { role: "agent" },
        error: null,
      });

      const request = createMockRequest("/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects admin from /signup to /admin", async () => {
      const mockUser = { id: "admin-user-456", email: "admin@example.com" };
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { role: "admin" },
        error: null,
      });

      const request = createMockRequest("/signup");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin");
    });

    it("redirects agent from /signup to /dashboard", async () => {
      const mockUser = { id: "agent-user-456", email: "agent@example.com" };
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { role: "agent" },
        error: null,
      });

      const request = createMockRequest("/signup");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects to /dashboard when user has no profile (role defaults to non-admin)", async () => {
      const mockUser = { id: "user-no-profile", email: "orphan@example.com" };
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const request = createMockRequest("/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });

    it("redirects to /dashboard when user role is null", async () => {
      const mockUser = { id: "user-null-role", email: "nullrole@example.com" };
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({
        data: { role: null },
        error: null,
      });

      const request = createMockRequest("/login");
      const response = await updateSession(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    });
  });

  describe("Auth routes without session (not authenticated)", () => {
    it("allows access to /login when not authenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/login");
      const response = await updateSession(request);

      // Should pass through (status 200, no redirect)
      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows access to /signup when not authenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/signup");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Public routes", () => {
    it("allows access to root path without authentication", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });

    it("allows access to public paths without authentication", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/forgot-password");
      const response = await updateSession(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("Session refresh behavior", () => {
    it("calls supabase.auth.getUser to refresh session", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const request = createMockRequest("/dashboard");
      await updateSession(request);

      expect(mockAuthGetUser).toHaveBeenCalledTimes(1);
    });

    it("handles session error gracefully and treats as unauthenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Session expired" },
      });

      const request = createMockRequest("/dashboard");
      const response = await updateSession(request);

      // Should redirect to login since user is null (even with error)
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    });
  });

  describe("Cookie handling", () => {
    it("creates Supabase client with cookie handlers", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const request = createMockRequest("/");
      await updateSession(request);

      expect(createServerClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function),
          }),
        })
      );
    });
  });
});
