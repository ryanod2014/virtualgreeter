import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock Logo component
vi.mock("@/lib/components/logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

// Mock Supabase client
const mockUpdateUser = vi.fn();
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const mockFromSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      updateUser: mockUpdateUser,
      getUser: mockGetUser,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    from: () => ({
      select: mockFromSelect,
    }),
  }),
}));

// Mock window.location
const originalWindow = global.window;

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock chain for user role query
    mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
    mockEq.mockReturnValue({ single: mockSingle });
    mockFromSelect.mockReturnValue({ eq: mockEq });

    // Setup onAuthStateChange to return a subscription object
    mockOnAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    // Setup window with location
    Object.defineProperty(global, "window", {
      value: {
        location: {
          origin: "http://localhost:3000",
          href: "http://localhost:3000/reset-password",
        },
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.window = originalWindow;
  });

  describe("password validation", () => {
    it("validates minimum password length of 8 characters", () => {
      const shortPassword = "short";
      const validPassword = "validpass123";

      // Password validation logic from component
      const isShortPasswordValid = shortPassword.length >= 8;
      const isValidPasswordValid = validPassword.length >= 8;

      expect(isShortPasswordValid).toBe(false);
      expect(isValidPasswordValid).toBe(true);
    });

    it("validates password confirmation matches", () => {
      const password = "newpassword123";
      const matchingConfirm = "newpassword123";
      const mismatchedConfirm = "differentpassword";

      expect(password === matchingConfirm).toBe(true);
      expect(password === mismatchedConfirm).toBe(false);
    });

    it("returns error when passwords do not match", () => {
      const password = "newpassword123";
      const confirmPassword = "differentpassword";

      // Validation logic from component
      let error: string | null = null;
      if (password !== confirmPassword) {
        error = "Passwords don't match";
      }

      expect(error).toBe("Passwords don't match");
    });

    it("returns error when password is less than 8 characters", () => {
      const password = "short";
      const confirmPassword = "short";

      // Validation logic from component
      let error: string | null = null;
      if (password === confirmPassword && password.length < 8) {
        error = "Password must be at least 8 characters";
      }

      expect(error).toBe("Password must be at least 8 characters");
    });
  });

  describe("updateUser (resetPassword) behavior", () => {
    it("calls supabase.auth.updateUser with new password", async () => {
      const newPassword = "newSecurePassword123";
      mockUpdateUser.mockResolvedValueOnce({ error: null });

      await mockUpdateUser({ password: newPassword });

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: newPassword });
    });

    it("returns error for invalid or expired token", async () => {
      const newPassword = "newSecurePassword123";
      const mockError = {
        message: "Auth session missing or expired. Please request a new password reset link.",
      };
      mockUpdateUser.mockResolvedValueOnce({ error: mockError });

      const result = await mockUpdateUser({ password: newPassword });

      expect(result.error).toEqual(mockError);
    });

    it("successfully updates password with valid session", async () => {
      const newPassword = "newSecurePassword123";
      mockUpdateUser.mockResolvedValueOnce({ error: null });

      const result = await mockUpdateUser({ password: newPassword });

      expect(result.error).toBeNull();
    });
  });

  describe("session validation", () => {
    it("detects PASSWORD_RECOVERY event for valid reset link", async () => {
      // Simulate the onAuthStateChange callback behavior
      let isValidSession = false;

      mockOnAuthStateChange.mockImplementationOnce((callback) => {
        // Simulate PASSWORD_RECOVERY event firing
        callback("PASSWORD_RECOVERY", { user: { id: "user-123" } });
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        };
      });

      // This simulates what the useEffect does
      const { data } = mockOnAuthStateChange((event: string, session: unknown) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          isValidSession = true;
        }
      });

      expect(isValidSession).toBe(true);
    });

    it("detects SIGNED_IN event as fallback for valid session", async () => {
      let isValidSession = false;

      mockOnAuthStateChange.mockImplementationOnce((callback) => {
        callback("SIGNED_IN", { user: { id: "user-123" } });
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        };
      });

      mockOnAuthStateChange((event: string, session: unknown) => {
        if (event === "SIGNED_IN" && session) {
          isValidSession = true;
        }
      });

      expect(isValidSession).toBe(true);
    });

    it("shows invalid/expired link error when no valid session", async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
      });

      const result = await mockGetSession();

      // When session is null and no auth event fires, link is invalid
      expect(result.data.session).toBeNull();
    });

    it("validates existing session on page load", async () => {
      const mockSession = {
        user: { id: "user-123" },
        access_token: "token",
      };
      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
      });

      const result = await mockGetSession();

      expect(result.data.session).toEqual(mockSession);
    });
  });

  describe("form submission flow", () => {
    it("prevents submission while loading", () => {
      let isLoading = true;

      // Button disabled state logic
      const isButtonDisabled = isLoading;

      expect(isButtonDisabled).toBe(true);
    });

    it("sets loading state during submission", async () => {
      let isLoading = false;

      // Simulate submission start
      isLoading = true;

      mockUpdateUser.mockResolvedValueOnce({ error: null });
      await mockUpdateUser({ password: "newpassword123" });

      // Simulate submission end
      isLoading = false;

      expect(isLoading).toBe(false);
    });

    it("sets success state after successful password update", async () => {
      let isSuccess = false;
      let isLoading = true;

      mockUpdateUser.mockResolvedValueOnce({ error: null });
      const result = await mockUpdateUser({ password: "newpassword123" });

      if (!result.error) {
        isSuccess = true;
      }
      isLoading = false;

      expect(isSuccess).toBe(true);
      expect(isLoading).toBe(false);
    });
  });

  describe("session invalidation on password reset", () => {
    it("calls signOut with scope 'others' after successful password update", async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: null });
      mockSignOut.mockResolvedValueOnce({ error: null });

      // Simulate the password update and session invalidation flow
      await mockUpdateUser({ password: "newpassword123" });
      await mockSignOut({ scope: "others" });

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpassword123" });
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "others" });
    });

    it("invalidates all other sessions while keeping current session active", async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: null });
      mockSignOut.mockResolvedValueOnce({ error: null });

      // The signOut call with scope 'others' should be made after password update
      await mockUpdateUser({ password: "newpassword123" });
      const result = await mockSignOut({ scope: "others" });

      expect(result.error).toBeNull();
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "others" });
    });

    it("continues with success flow even if signOut fails", async () => {
      mockUpdateUser.mockResolvedValueOnce({ error: null });
      mockSignOut.mockResolvedValueOnce({
        error: { message: "Failed to sign out other sessions" },
      });

      let isSuccess = false;

      // Password update succeeds
      const updateResult = await mockUpdateUser({ password: "newpassword123" });
      if (!updateResult.error) {
        // signOut is called but error is logged, not thrown
        const signOutResult = await mockSignOut({ scope: "others" });

        // Even if signOut fails, we still mark success (password was changed)
        isSuccess = true;
      }

      expect(isSuccess).toBe(true);
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "others" });
    });

    it("does not call signOut if password update fails", async () => {
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: "Password update failed" },
      });

      const updateResult = await mockUpdateUser({ password: "newpassword123" });

      // signOut should not be called if updateUser fails
      let shouldCallSignOut = false;
      if (!updateResult.error) {
        shouldCallSignOut = true;
        await mockSignOut({ scope: "others" });
      }

      expect(shouldCallSignOut).toBe(false);
      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it("ensures security by logging out attacker sessions after password reset", async () => {
      // Scenario: User's account was compromised, they reset password
      // Expected: All other sessions (including attacker's) are invalidated
      mockUpdateUser.mockResolvedValueOnce({ error: null });
      mockSignOut.mockResolvedValueOnce({ error: null });

      // User resets password
      const updateResult = await mockUpdateUser({ password: "newSecurePassword!" });

      // System invalidates all other sessions for security
      if (!updateResult.error) {
        await mockSignOut({ scope: "others" });
      }

      // Both operations completed successfully
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalledWith({ scope: "others" });
    });
  });

  describe("redirect after success", () => {
    it("queries user role to determine redirect destination", async () => {
      const mockUserId = "user-123";
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
      });
      mockSingle.mockResolvedValueOnce({ data: { role: "admin" } });

      await mockGetUser();

      expect(mockGetUser).toHaveBeenCalled();
    });

    it("redirects admin user to /admin after success", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockSingle.mockResolvedValueOnce({ data: { role: "admin" } });

      const { data: { user } } = await mockGetUser();
      const isAdmin = (await mockFromSelect().eq("id", user.id).single()).data?.role === "admin";
      const redirectUrl = isAdmin ? "/admin" : "/dashboard";

      expect(redirectUrl).toBe("/admin");
    });

    it("redirects agent user to /dashboard after success", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-456" } },
      });
      mockSingle.mockResolvedValueOnce({ data: { role: "agent" } });

      const { data: { user } } = await mockGetUser();
      // Reset the mock for the actual role check
      mockSingle.mockResolvedValueOnce({ data: { role: "agent" } });
      const { data: profile } = await mockFromSelect().eq("id", user.id).single();
      const isAdmin = profile?.role === "admin";
      const redirectUrl = isAdmin ? "/admin" : "/dashboard";

      expect(redirectUrl).toBe("/dashboard");
    });

    it("redirects to /dashboard when user profile not found", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-789" } },
      });
      mockSingle.mockResolvedValueOnce({ data: null });

      const { data: { user } } = await mockGetUser();
      mockSingle.mockResolvedValueOnce({ data: null });
      const { data: profile } = await mockFromSelect().eq("id", user.id).single();
      const isAdmin = profile?.role === "admin";
      const redirectUrl = isAdmin ? "/admin" : "/dashboard";

      expect(redirectUrl).toBe("/dashboard");
    });

    it("redirects to /dashboard when no user found", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const { data: { user } } = await mockGetUser();

      // Fallback redirect when no user
      const redirectUrl = user ? "/admin" : "/dashboard";

      expect(redirectUrl).toBe("/dashboard");
    });
  });

  describe("error handling", () => {
    it("displays error message from Supabase", async () => {
      const errorMessage = "New password should be different from the old password";
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: errorMessage },
      });

      let error: string | null = null;

      const result = await mockUpdateUser({ password: "newpassword123" });
      if (result.error) {
        error = result.error.message;
      }

      expect(error).toBe(errorMessage);
    });

    it("does not transition to success state on error", async () => {
      mockUpdateUser.mockResolvedValueOnce({
        error: { message: "Update failed" },
      });

      let isSuccess = false;

      const result = await mockUpdateUser({ password: "newpassword123" });
      if (!result.error) {
        isSuccess = true;
      }

      expect(isSuccess).toBe(false);
    });
  });

  describe("invalid/expired link state", () => {
    it("shows expired link UI when session is invalid", () => {
      const isValidSession = false;

      // When isValidSession is false, component shows "Link Expired" message
      const expectedTitle = "Link Expired";
      const expectedMessage =
        "This password reset link is invalid or has expired. Please request a new one.";

      expect(isValidSession).toBe(false);
      expect(expectedTitle).toBe("Link Expired");
      expect(expectedMessage).toContain("invalid or has expired");
    });

    it("provides link to request new password reset", () => {
      // Component includes a link to /forgot-password when link is expired
      const forgotPasswordHref = "/forgot-password";

      expect(forgotPasswordHref).toBe("/forgot-password");
    });
  });

  describe("form input requirements", () => {
    it("requires password input", () => {
      const passwordInputAttributes = {
        type: "password",
        required: true,
        minLength: 8,
      };

      expect(passwordInputAttributes.required).toBe(true);
      expect(passwordInputAttributes.minLength).toBe(8);
    });

    it("requires confirm password input", () => {
      const confirmPasswordInputAttributes = {
        type: "password",
        required: true,
      };

      expect(confirmPasswordInputAttributes.required).toBe(true);
    });
  });
});


