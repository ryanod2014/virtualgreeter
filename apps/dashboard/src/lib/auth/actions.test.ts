import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`NEXT_REDIRECT:${path}`);
  },
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { signUp, signIn, signOut, getCurrentUser } from "./actions";
import { createClient } from "@/lib/supabase/server";

describe("auth/actions", () => {
  // Mock Supabase client helpers
  let mockAuthSignUp: ReturnType<typeof vi.fn>;
  let mockAuthSignIn: ReturnType<typeof vi.fn>;
  let mockAuthSignOut: ReturnType<typeof vi.fn>;
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));
    mockFrom = vi.fn(() => ({ select: mockSelect }));

    mockAuthSignUp = vi.fn();
    mockAuthSignIn = vi.fn();
    mockAuthSignOut = vi.fn();
    mockAuthGetUser = vi.fn();

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        signUp: mockAuthSignUp,
        signInWithPassword: mockAuthSignIn,
        signOut: mockAuthSignOut,
        getUser: mockAuthGetUser,
      },
      from: mockFrom,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create FormData
  function createFormData(data: Record<string, string>): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value);
    }
    return formData;
  }

  describe("signUp", () => {
    it("calls createClient to get server Supabase client", async () => {
      mockAuthSignUp.mockResolvedValueOnce({ error: { message: "test error" } });

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      });

      await signUp(formData);

      expect(createClient).toHaveBeenCalled();
    });

    it("extracts email, password, fullName from formData correctly", async () => {
      mockAuthSignUp.mockResolvedValueOnce({ error: { message: "test error" } });

      const formData = createFormData({
        email: "user@example.com",
        password: "securepass123",
        fullName: "John Doe",
      });

      await signUp(formData);

      expect(mockAuthSignUp).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "securepass123",
        options: {
          data: {
            full_name: "John Doe",
          },
          emailRedirectTo: expect.stringContaining("/auth/callback"),
        },
      });
    });

    it("calls supabase.auth.signUp with email, password, full_name metadata, and emailRedirectTo", async () => {
      mockAuthSignUp.mockResolvedValueOnce({ error: { message: "test" } });

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      });

      await signUp(formData);

      expect(mockAuthSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          password: "password123",
          options: expect.objectContaining({
            data: { full_name: "Test User" },
            emailRedirectTo: expect.any(String),
          }),
        })
      );
    });

    it("returns error object when Supabase signUp fails", async () => {
      mockAuthSignUp.mockResolvedValueOnce({
        error: { message: "User already registered" },
      });

      const formData = createFormData({
        email: "existing@example.com",
        password: "password123",
        fullName: "Existing User",
      });

      const result = await signUp(formData);

      expect(result).toEqual({ error: "User already registered" });
    });

    it("returns error object with exact error message from Supabase", async () => {
      mockAuthSignUp.mockResolvedValueOnce({
        error: { message: "Password should be at least 6 characters" },
      });

      const formData = createFormData({
        email: "test@example.com",
        password: "short",
        fullName: "Test User",
      });

      const result = await signUp(formData);

      expect(result).toEqual({ error: "Password should be at least 6 characters" });
    });

    it("redirects to /admin on successful signup", async () => {
      mockAuthSignUp.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });

      const formData = createFormData({
        email: "new@example.com",
        password: "password123",
        fullName: "New User",
      });

      await expect(signUp(formData)).rejects.toThrow("NEXT_REDIRECT:/admin");
      expect(mockRedirect).toHaveBeenCalledWith("/admin");
    });

    it("does not redirect when signup fails", async () => {
      mockAuthSignUp.mockResolvedValueOnce({
        error: { message: "Signup failed" },
      });

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      });

      const result = await signUp(formData);

      expect(result).toEqual({ error: "Signup failed" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("calls createClient to get server Supabase client", async () => {
      mockAuthSignIn.mockResolvedValueOnce({ error: { message: "test" } });

      const formData = createFormData({
        email: "test@example.com",
        password: "password123",
      });

      await signIn(formData);

      expect(createClient).toHaveBeenCalled();
    });

    it("calls supabase.auth.signInWithPassword with email and password", async () => {
      mockAuthSignIn.mockResolvedValueOnce({ error: { message: "test" } });

      const formData = createFormData({
        email: "user@example.com",
        password: "mypassword",
      });

      await signIn(formData);

      expect(mockAuthSignIn).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "mypassword",
      });
    });

    it("returns error object when signIn fails", async () => {
      mockAuthSignIn.mockResolvedValueOnce({
        error: { message: "Invalid login credentials" },
      });

      const formData = createFormData({
        email: "test@example.com",
        password: "wrongpassword",
      });

      const result = await signIn(formData);

      expect(result).toEqual({ error: "Invalid login credentials" });
    });

    it("queries users table for role on successful login", async () => {
      const mockUserId = "user-123";
      mockAuthSignIn.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: { role: "admin" } });

      const formData = createFormData({
        email: "admin@example.com",
        password: "password123",
      });

      try {
        await signIn(formData);
      } catch {
        // Expected redirect
      }

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockSelect).toHaveBeenCalledWith("role");
      expect(mockEq).toHaveBeenCalledWith("id", mockUserId);
    });

    it("redirects admin user to /admin", async () => {
      mockAuthSignIn.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: { role: "admin" } });

      const formData = createFormData({
        email: "admin@example.com",
        password: "password123",
      });

      await expect(signIn(formData)).rejects.toThrow("NEXT_REDIRECT:/admin");
      expect(mockRedirect).toHaveBeenCalledWith("/admin");
    });

    it("redirects agent user to /dashboard", async () => {
      mockAuthSignIn.mockResolvedValueOnce({
        data: { user: { id: "user-456" } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: { role: "agent" } });

      const formData = createFormData({
        email: "agent@example.com",
        password: "password123",
      });

      await expect(signIn(formData)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });

    it("redirects to /dashboard when user has no role (null profile)", async () => {
      mockAuthSignIn.mockResolvedValueOnce({
        data: { user: { id: "user-789" } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: null });

      const formData = createFormData({
        email: "user@example.com",
        password: "password123",
      });

      await expect(signIn(formData)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("signOut", () => {
    it("calls createClient to get server Supabase client", async () => {
      mockAuthSignOut.mockResolvedValueOnce({});

      try {
        await signOut();
      } catch {
        // Expected redirect
      }

      expect(createClient).toHaveBeenCalled();
    });

    it("calls supabase.auth.signOut", async () => {
      mockAuthSignOut.mockResolvedValueOnce({});

      try {
        await signOut();
      } catch {
        // Expected redirect
      }

      expect(mockAuthSignOut).toHaveBeenCalled();
    });

    it("redirects to /login after signOut", async () => {
      mockAuthSignOut.mockResolvedValueOnce({});

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });

  describe("getCurrentUser", () => {
    it("calls supabase.auth.getUser to check authentication", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await getCurrentUser();

      expect(mockAuthGetUser).toHaveBeenCalled();
    });

    it("returns null when no authenticated user", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("returns null when auth returns error", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: "Auth error" },
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("queries users table with organization join for authenticated user", async () => {
      const mockUserId = "user-123";
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId, email: "test@example.com" } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      await getCurrentUser();

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockSelect).toHaveBeenCalledWith("*, organization:organizations(*)");
      expect(mockEq).toHaveBeenCalledWith("id", mockUserId);
    });

    it("returns null when user profile not found in database", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("queries agent_profiles table when user profile exists", async () => {
      const mockUserId = "user-123";
      const mockProfile = {
        id: mockUserId,
        role: "admin",
        organization: { id: "org-456", name: "Test Org" },
      };
      const mockAgentProfile = {
        id: "agent-789",
        user_id: mockUserId,
        display_name: "Test User",
      };

      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      });
      
      // First call: users table
      mockSingle.mockResolvedValueOnce({ data: mockProfile, error: null });
      // Second call: agent_profiles table
      mockSingle.mockResolvedValueOnce({ data: mockAgentProfile, error: null });

      await getCurrentUser();

      // Verify agent_profiles was queried
      expect(mockFrom).toHaveBeenCalledWith("agent_profiles");
    });

    it("returns composite object with user, profile, organization, agentProfile on success", async () => {
      const mockUserId = "user-123";
      const mockUser = { id: mockUserId, email: "test@example.com" };
      const mockOrganization = { id: "org-456", name: "Test Org" };
      const mockProfile = {
        id: mockUserId,
        role: "admin",
        organization: mockOrganization,
        is_platform_admin: false,
      };
      const mockAgentProfile = {
        id: "agent-789",
        user_id: mockUserId,
        display_name: "Test User",
      };

      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });
      mockSingle
        .mockResolvedValueOnce({ data: mockProfile, error: null })
        .mockResolvedValueOnce({ data: mockAgentProfile, error: null });

      const result = await getCurrentUser();

      expect(result).toEqual({
        user: mockUser,
        profile: mockProfile,
        organization: mockOrganization,
        agentProfile: mockAgentProfile,
        isAdmin: true,
        isAgent: false,
        isPlatformAdmin: false,
      });
    });

    it("returns isAdmin=true when profile.role is admin", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle
        .mockResolvedValueOnce({
          data: { role: "admin", organization: {}, is_platform_admin: false },
          error: null,
        })
        .mockResolvedValueOnce({ data: {}, error: null });

      const result = await getCurrentUser();

      expect(result?.isAdmin).toBe(true);
      expect(result?.isAgent).toBe(false);
    });

    it("returns isAgent=true when profile.role is agent", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle
        .mockResolvedValueOnce({
          data: { role: "agent", organization: {}, is_platform_admin: false },
          error: null,
        })
        .mockResolvedValueOnce({ data: {}, error: null });

      const result = await getCurrentUser();

      expect(result?.isAdmin).toBe(false);
      expect(result?.isAgent).toBe(true);
    });

    it("returns isPlatformAdmin=true when profile.is_platform_admin is true", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle
        .mockResolvedValueOnce({
          data: { role: "admin", organization: {}, is_platform_admin: true },
          error: null,
        })
        .mockResolvedValueOnce({ data: {}, error: null });

      const result = await getCurrentUser();

      expect(result?.isPlatformAdmin).toBe(true);
    });

    it("returns isPlatformAdmin=false when profile.is_platform_admin is undefined", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle
        .mockResolvedValueOnce({
          data: { role: "admin", organization: {} },
          error: null,
        })
        .mockResolvedValueOnce({ data: {}, error: null });

      const result = await getCurrentUser();

      expect(result?.isPlatformAdmin).toBe(false);
    });

    it("returns agentProfile as null when agent profile query fails", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle
        .mockResolvedValueOnce({
          data: { role: "admin", organization: {}, is_platform_admin: false },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: { message: "Not found" } });

      const result = await getCurrentUser();

      expect(result?.agentProfile).toBeNull();
    });
  });
});
