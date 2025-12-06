/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockSearchParams = new Map<string, string>();
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => mockSearchParams.get(key) || null,
  }),
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    signUp: vi.fn(),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabaseClient,
}));

// Mock Logo component
vi.mock("@/lib/components/logo", () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}));

// Mock fetch for billing API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = { href: "" };
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

import AcceptInvitePage from "./page";

describe("AcceptInvitePage", () => {
  const validInvite = {
    id: "invite-123",
    email: "invitee@example.com",
    full_name: "Test Invitee",
    role: "agent",
    organization_id: "org-456",
    organization: { name: "Test Organization" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.clear();
    mockLocation.href = "";

    // Default successful fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to setup Supabase mock for invite fetch
  function setupInviteFetch(invite: object | null, error: object | null = null) {
    const mockSingle = vi.fn().mockResolvedValue({
      data: invite,
      error: error,
    });
    const mockGt = vi.fn(() => ({ single: mockSingle }));
    const mockIs = vi.fn(() => ({ gt: mockGt }));
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "invites") {
        return { select: mockSelect };
      }
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      };
    });

    return { mockSelect, mockEq, mockIs, mockGt, mockSingle };
  }

  // Helper to setup full form submission mocks
  function setupFormSubmissionMocks() {
    const mockInviteUpdate = vi.fn().mockResolvedValue({ error: null });
    const mockUserInsert = vi.fn().mockResolvedValue({ error: null });
    const mockAgentProfileInsert = vi.fn().mockResolvedValue({ error: null });

    mockSupabaseClient.auth.signUp.mockResolvedValue({
      data: { user: { id: "user-789" } },
      error: null,
    });

    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === "invites") {
        // For initial fetch
        const mockSingle = vi.fn().mockResolvedValue({
          data: validInvite,
          error: null,
        });
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                gt: vi.fn(() => ({ single: mockSingle })),
              })),
            })),
          })),
          update: vi.fn(() => ({
            eq: mockInviteUpdate,
          })),
        };
      }
      if (table === "users") {
        return { insert: mockUserInsert };
      }
      if (table === "agent_profiles") {
        return { insert: mockAgentProfileInsert };
      }
      return {};
    });

    return { mockInviteUpdate, mockUserInsert, mockAgentProfileInsert };
  }

  describe("Token Validation", () => {
    it("shows error when no token is provided in URL", async () => {
      // No token in searchParams
      setupInviteFetch(null);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Invalid Invitation")).toBeInTheDocument();
        expect(screen.getByText("Invalid invite link - no token provided")).toBeInTheDocument();
      });
    });

    it("shows error for expired invite token", async () => {
      mockSearchParams.set("token", "expired-token");
      setupInviteFetch(null, { message: "No rows found" });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Invalid Invitation")).toBeInTheDocument();
        expect(screen.getByText("This invite is invalid or has expired")).toBeInTheDocument();
      });
    });

    it("shows error for already-used invite token", async () => {
      mockSearchParams.set("token", "used-token");
      // Query returns null because accepted_at IS NOT NULL
      setupInviteFetch(null);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Invalid Invitation")).toBeInTheDocument();
        expect(screen.getByText("This invite is invalid or has expired")).toBeInTheDocument();
      });
    });

    it("validates token against database with correct query", async () => {
      mockSearchParams.set("token", "valid-token-123");
      const { mockSelect, mockEq, mockIs, mockGt } = setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith("invites");
        expect(mockSelect).toHaveBeenCalledWith("*, organization:organizations(name)");
        expect(mockEq).toHaveBeenCalledWith("token", "valid-token-123");
        expect(mockIs).toHaveBeenCalledWith("accepted_at", null);
        expect(mockGt).toHaveBeenCalledWith("expires_at", expect.any(String));
      });
    });

    it("provides 'Go to Login' link on invalid invite error page", async () => {
      setupInviteFetch(null);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        const loginLink = screen.getByRole("link", { name: "Go to Login" });
        expect(loginLink).toHaveAttribute("href", "/login");
      });
    });
  });

  describe("Display - Invite Details", () => {
    it("shows organization name in header", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Join Test Organization")).toBeInTheDocument();
      });
    });

    it("displays invite email in disabled field", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue("invitee@example.com");
        expect(emailInput).toBeDisabled();
      });
    });

    it("pre-fills full name from invite", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Invitee")).toBeInTheDocument();
      });
    });

    it("shows agent role description for agent invites", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText(/an Agent/)).toBeInTheDocument();
      });
    });

    it("shows admin role description for admin invites", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch({ ...validInvite, role: "admin" });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText(/an Admin/)).toBeInTheDocument();
      });
    });
  });

  describe("Display - Password Form", () => {
    it("shows password input field", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Password")).toBeInTheDocument();
        // Get password inputs by type
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        expect(passwordInputs.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("shows confirm password input field", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Confirm Password")).toBeInTheDocument();
        // Should have two password inputs
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        expect(passwordInputs.length).toBe(2);
      });
    });

    it("shows password requirements hint", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Must be at least 8 characters")).toBeInTheDocument();
      });
    });

    it("shows Create Account submit button", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite);

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });
    });
  });

  describe("Display - Admin Call Choice", () => {
    it("shows call choice options for admin invites", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch({ ...validInvite, role: "admin" });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Will you also be taking calls?")).toBeInTheDocument();
        expect(screen.getByText("Yes, I'll take calls")).toBeInTheDocument();
        expect(screen.getByText("No, admin only")).toBeInTheDocument();
      });
    });

    it("does not show call choice options for agent invites", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch(validInvite); // role: "agent"

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.queryByText("Will you also be taking calls?")).not.toBeInTheDocument();
      });
    });

    it("shows seat usage hint for 'take calls' option", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch({ ...validInvite, role: "admin" });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Uses an agent seat")).toBeInTheDocument();
      });
    });

    it("shows free hint for 'admin only' option", async () => {
      mockSearchParams.set("token", "valid-token");
      setupInviteFetch({ ...validInvite, role: "admin" });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Free • manage only")).toBeInTheDocument();
      });
    });
  });

  // Helper to get password inputs (first is password, second is confirm)
  function getPasswordInputs() {
    const inputs = document.querySelectorAll('input[type="password"]');
    return {
      passwordInput: inputs[0] as HTMLInputElement,
      confirmInput: inputs[1] as HTMLInputElement,
    };
  }

  // Helper to type into an input element using fireEvent
  function typeIntoInput(input: HTMLInputElement, value: string) {
    fireEvent.change(input, { target: { value } });
  }

  // Helper to clear and type into an input element
  function clearAndType(input: HTMLInputElement, value: string) {
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.change(input, { target: { value } });
  }

  describe("Validation - Password Requirements", () => {
    it("shows error when password is less than 8 characters", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "short");
      typeIntoInput(confirmInput, "short");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      });
    });

    it("does not call signUp when password is too short", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "short");
      typeIntoInput(confirmInput, "short");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("Password must be at least 8 characters")).toBeInTheDocument();
      });

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });
  });

  describe("Validation - Password Match", () => {
    it("shows error when passwords do not match", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "differentpass");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });
    });

    it("does not call signUp when passwords do not match", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "differentpass");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });

      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled();
    });
  });

  describe("Submit - Account Creation", () => {
    it("calls supabase.auth.signUp with email, password, and full_name metadata", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "securepassword123");
      typeIntoInput(confirmInput, "securepassword123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: "invitee@example.com",
          password: "securepassword123",
          options: {
            data: {
              full_name: "Test Invitee",
            },
          },
        });
      });
    });

    it("shows loading state while submitting", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();
      // Delay signUp to see loading state
      mockSupabaseClient.auth.signUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: { id: "user-123" } }, error: null }), 100))
      );

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("Creating account...")).toBeInTheDocument();
      });
    });

    it("disables submit button while submitting", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();
      mockSupabaseClient.auth.signUp.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { user: { id: "user-123" } }, error: null }), 100))
      );

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      const submitButton = screen.getByRole("button", { name: "Create Account" });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const loadingButton = screen.getByRole("button", { name: /Creating account/i });
        expect(loadingButton).toBeDisabled();
      });
    });

    it("shows auth error message when signUp fails", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: "User already registered" },
      });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("User already registered")).toBeInTheDocument();
      });
    });

    it("shows error when signUp succeeds but returns no user", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();
      // signUp succeeds (no error) but returns null user
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create account")).toBeInTheDocument();
      });
    });
  });

  describe("Submit - User Record Creation", () => {
    it("creates user record with organization_id from invite", async () => {
      mockSearchParams.set("token", "valid-token");
      const { mockUserInsert } = setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockUserInsert).toHaveBeenCalledWith({
          id: "user-789",
          organization_id: "org-456",
          email: "invitee@example.com",
          full_name: "Test Invitee",
          role: "agent",
        });
      });
    });

    it("sets user role from invite", async () => {
      mockSearchParams.set("token", "valid-token");
      const { mockUserInsert } = setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockUserInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            role: "agent",
          })
        );
      });
    });
  });

  describe("Submit - Agent Profile Creation", () => {
    it("creates agent_profile for agent role invites", async () => {
      mockSearchParams.set("token", "valid-token");
      const { mockAgentProfileInsert } = setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockAgentProfileInsert).toHaveBeenCalledWith({
          user_id: "user-789",
          organization_id: "org-456",
          display_name: "Test Invitee",
          is_active: true,
        });
      });
    });

    it("creates agent_profile for admin who chooses to take calls", async () => {
      mockSearchParams.set("token", "valid-token");
      const mockAgentProfileInsert = vi.fn().mockResolvedValue({ error: null });
      const adminInvite = { ...validInvite, role: "admin" };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-789" } },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "invites") {
          const mockSingle = vi.fn().mockResolvedValue({
            data: adminInvite,
            error: null,
          });
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  gt: vi.fn(() => ({ single: mockSingle })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === "users") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === "agent_profiles") {
          return { insert: mockAgentProfileInsert };
        }
        return {};
      });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Will you also be taking calls?")).toBeInTheDocument();
      });

      // "Yes, I'll take calls" is selected by default (willTakeCalls = true)
      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockAgentProfileInsert).toHaveBeenCalled();
      });
    });

    it("does not create agent_profile for admin who chooses not to take calls", async () => {
      mockSearchParams.set("token", "valid-token");
      const mockAgentProfileInsert = vi.fn().mockResolvedValue({ error: null });
      const adminInvite = { ...validInvite, role: "admin" };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-789" } },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "invites") {
          const mockSingle = vi.fn().mockResolvedValue({
            data: adminInvite,
            error: null,
          });
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  gt: vi.fn(() => ({ single: mockSingle })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === "users") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === "agent_profiles") {
          return { insert: mockAgentProfileInsert };
        }
        return {};
      });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Will you also be taking calls?")).toBeInTheDocument();
      });

      // Click "No, admin only" option
      fireEvent.click(screen.getByText("No, admin only"));

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockLocation.href).toBe("/admin");
      });

      expect(mockAgentProfileInsert).not.toHaveBeenCalled();
    });

    it("calls billing API when admin chooses to take calls", async () => {
      mockSearchParams.set("token", "valid-token");
      const adminInvite = { ...validInvite, role: "admin" };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: "user-789" } },
        error: null,
      });

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === "invites") {
          const mockSingle = vi.fn().mockResolvedValue({
            data: adminInvite,
            error: null,
          });
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  gt: vi.fn(() => ({ single: mockSingle })),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        if (table === "users") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        if (table === "agent_profiles") {
          return { insert: vi.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByText("Will you also be taking calls?")).toBeInTheDocument();
      });

      // "Yes, I'll take calls" is selected by default
      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/billing/seats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add", quantity: 1 }),
        });
      });
    });
  });

  describe("Submit - Invite Marked as Used", () => {
    it("updates invite with accepted_at timestamp after successful account creation", async () => {
      mockSearchParams.set("token", "valid-token");
      const { mockInviteUpdate } = setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockInviteUpdate).toHaveBeenCalledWith("id", "invite-123");
      });
    });
  });

  describe("Submit - Redirect on Success", () => {
    it("redirects to /admin after successful account creation", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument();
      });

      const { passwordInput, confirmInput } = getPasswordInputs();

      clearAndType(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockLocation.href).toBe("/admin");
      });
    });
  });

  describe("Loading State", () => {
    it("shows loading spinner while fetching invite", async () => {
      mockSearchParams.set("token", "valid-token");
      // Delay the invite fetch
      mockSupabaseClient.from.mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            is: () => ({
              gt: () => ({
                single: () => new Promise((resolve) => setTimeout(() => resolve({ data: validInvite, error: null }), 100)),
              }),
            }),
          }),
        }),
      }));

      render(<AcceptInvitePage />);

      // Should show loading spinner initially
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  describe("Full Name Edit", () => {
    it("allows editing the pre-filled full name", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Invitee")).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue("Test Invitee") as HTMLInputElement;
      clearAndType(nameInput, "New Name");

      expect(screen.getByDisplayValue("New Name")).toBeInTheDocument();
    });

    it("uses edited name when creating account", async () => {
      mockSearchParams.set("token", "valid-token");
      setupFormSubmissionMocks();

      render(<AcceptInvitePage />);

      await waitFor(() => {
        expect(screen.getByDisplayValue("Test Invitee")).toBeInTheDocument();
      });

      const nameInput = screen.getByDisplayValue("Test Invitee") as HTMLInputElement;
      clearAndType(nameInput, "Updated Name");

      const { passwordInput, confirmInput } = getPasswordInputs();

      typeIntoInput(passwordInput, "password123");
      typeIntoInput(confirmInput, "password123");

      fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith(
          expect.objectContaining({
            options: {
              data: {
                full_name: "Updated Name",
              },
            },
          })
        );
      });
    });
  });
});

