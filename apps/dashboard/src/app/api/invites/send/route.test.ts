import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock Resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: "email-123" }),
    },
  })),
}));

// Mock fetch for billing API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "test-uuid-token"),
});

import { POST } from "./route";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/invites/send", () => {
  const mockUserId = "user-123";
  const mockOrgId = "org-456";

  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

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
    const request = new NextRequest("http://localhost:3000/api/invites/send", {
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
    existingUser?: boolean;
    existingInvite?: boolean;
    inviteInsertError?: object | null;
    inviteDeleteError?: object | null;
  }) {
    const {
      userExists = true,
      profile = {
        role: "admin",
        organization_id: mockOrgId,
        organization: { name: "Test Org", seat_count: 5, stripe_subscription_item_id: "si_123" },
      },
      existingUser = false,
      existingInvite = false,
      inviteInsertError = null,
      inviteDeleteError = null,
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
              // For existing user check
              ...(existingUser && {
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "existing-user" },
                    error: null,
                  }),
                })),
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
                is: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: existingInvite ? { id: "existing-invite" } : null,
                    error: existingInvite ? null : { message: "Not found" },
                  }),
                })),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: inviteInsertError ? null : { id: "new-invite-id", email: "test@example.com" },
                error: inviteInsertError,
              }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: inviteDeleteError,
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

      const request = createMockRequest({ email: "test@example.com", fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });

    it("returns 403 if user is not an admin", async () => {
      setupSupabaseMock({ profile: { role: "agent", organization_id: mockOrgId } });

      const request = createMockRequest({ email: "test@example.com", fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Only admins can send invites");
    });

    it("returns 403 if user profile is not found", async () => {
      setupSupabaseMock({ profile: null });

      const request = createMockRequest({ email: "test@example.com", fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Only admins can send invites");
    });
  });

  describe("Request Validation", () => {
    it("returns 400 when email is missing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Email and name are required");
    });

    it("returns 400 when fullName is missing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ email: "test@example.com" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Email and name are required");
    });
  });

  describe("Duplicate Check - Existing User", () => {
    it("returns 400 if user already exists in organization", async () => {
      // Setup a mock that returns existing user
      const mockFromWithExistingUser = vi.fn((tableName: string) => {
        if (tableName === "users") {
          let callCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    // First call - admin profile check
                    return Promise.resolve({
                      data: { role: "admin", organization_id: mockOrgId, organization: { name: "Test Org" } },
                      error: null,
                    });
                  }
                  // This branch handles existing user check
                  return Promise.resolve({
                    data: { id: "existing-user" },
                    error: null,
                  });
                }),
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "existing-user" },
                    error: null,
                  }),
                })),
              })),
            })),
          };
        }
        return {};
      });

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFromWithExistingUser,
      });

      const request = createMockRequest({ email: "existing@example.com", fullName: "Existing User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("User already exists in this organization");
    });
  });

  describe("Duplicate Check - Existing Invite", () => {
    it("returns 400 if pending invite already exists for email", async () => {
      // Setup mock with existing invite
      const mockFromWithExistingInvite = vi.fn((tableName: string) => {
        if (tableName === "users") {
          let callCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { role: "admin", organization_id: mockOrgId, organization: { name: "Test Org" } },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                })),
              })),
            })),
          };
        }
        if (tableName === "invites") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: "existing-invite" },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          };
        }
        return {};
      });

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFromWithExistingInvite,
      });

      const request = createMockRequest({ email: "pending@example.com", fullName: "Pending User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("An invite has already been sent to this email");
    });
  });

  describe("Invite Creation", () => {
    function setupSuccessfulInviteMock() {
      const mockInviteInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "new-invite-id", email: "test@example.com" },
            error: null,
          }),
        })),
      }));

      const mockFromSuccess = vi.fn((tableName: string) => {
        if (tableName === "users") {
          let callCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { role: "admin", organization_id: mockOrgId, organization: { name: "Test Org" } },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                })),
              })),
            })),
          };
        }
        if (tableName === "invites") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                  })),
                })),
              })),
            })),
            insert: mockInviteInsert,
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return {};
      });

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFromSuccess,
      });

      return { mockInviteInsert };
    }

    it("creates invite record with correct fields", async () => {
      const { mockInviteInsert } = setupSuccessfulInviteMock();

      const request = createMockRequest({
        email: "newuser@example.com",
        fullName: "New User",
        role: "agent",
      });
      await POST(request);

      expect(mockInviteInsert).toHaveBeenCalledWith({
        organization_id: mockOrgId,
        email: "newuser@example.com",
        full_name: "New User",
        role: "agent",
        token: "test-uuid-token",
        invited_by: mockUserId,
      });
    });

    it("defaults role to 'agent' when not provided", async () => {
      const { mockInviteInsert } = setupSuccessfulInviteMock();

      const request = createMockRequest({
        email: "newuser@example.com",
        fullName: "New User",
      });
      await POST(request);

      expect(mockInviteInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: "agent",
        })
      );
    });

    it("generates UUID token for invite", async () => {
      const { mockInviteInsert } = setupSuccessfulInviteMock();

      const request = createMockRequest({
        email: "newuser@example.com",
        fullName: "New User",
      });
      await POST(request);

      expect(mockInviteInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          token: "test-uuid-token",
        })
      );
    });

    it("returns 500 if invite creation fails", async () => {
      const mockFromWithInsertError = vi.fn((tableName: string) => {
        if (tableName === "users") {
          let callCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { role: "admin", organization_id: mockOrgId, organization: { name: "Test Org" } },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                })),
              })),
            })),
          };
        }
        if (tableName === "invites") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: "Database error" },
                }),
              })),
            })),
          };
        }
        return {};
      });

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFromWithInsertError,
      });

      const request = createMockRequest({ email: "test@example.com", fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to create invite");
    });
  });

  describe("Billing Seat Allocation", () => {
    function setupBillingTestMock() {
      const mockInviteDelete = vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }));

      const mockFromBilling = vi.fn((tableName: string) => {
        if (tableName === "users") {
          let callCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { role: "admin", organization_id: mockOrgId, organization: { name: "Test Org" } },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                })),
              })),
            })),
          };
        }
        if (tableName === "invites") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "new-invite-id", email: "test@example.com" },
                  error: null,
                }),
              })),
            })),
            delete: mockInviteDelete,
          };
        }
        return {};
      });

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFromBilling,
      });

      return { mockInviteDelete };
    }

    it("calls billing seats API for agent role invites", async () => {
      setupBillingTestMock();

      const request = createMockRequest({ email: "agent@example.com", fullName: "Agent User", role: "agent" });
      await POST(request);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/billing/seats"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "add", quantity: 1 }),
        })
      );
    });

    it("does not call billing seats API for admin role invites", async () => {
      setupBillingTestMock();

      const request = createMockRequest({ email: "admin@example.com", fullName: "Admin User", role: "admin" });
      await POST(request);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("deletes invite and returns error if billing seat allocation fails", async () => {
      const { mockInviteDelete } = setupBillingTestMock();
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "Billing limit exceeded" }),
      });

      const request = createMockRequest({ email: "agent@example.com", fullName: "Agent User", role: "agent" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Billing limit exceeded");
      expect(mockInviteDelete).toHaveBeenCalled();
    });
  });

  describe("Success Response", () => {
    function setupSuccessMock() {
      const mockFromSuccess = vi.fn((tableName: string) => {
        if (tableName === "users") {
          let callCount = 0;
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockImplementation(() => {
                  callCount++;
                  if (callCount === 1) {
                    return Promise.resolve({
                      data: { role: "admin", organization_id: mockOrgId, organization: { name: "Test Org" } },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: "Not found" } });
                }),
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                })),
              })),
            })),
          };
        }
        if (tableName === "invites") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  is: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } }),
                  })),
                })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: "new-invite-id", email: "test@example.com" },
                  error: null,
                }),
              })),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          };
        }
        return {};
      });

      (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
        auth: { getUser: mockAuthGetUser },
        from: mockFromSuccess,
      });
    }

    it("returns success response with invite details", async () => {
      setupSuccessMock();

      const request = createMockRequest({ email: "test@example.com", fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.invite).toEqual({
        id: "new-invite-id",
        email: "test@example.com",
      });
    });
  });

  describe("Error Handling", () => {
    it("returns 500 for unexpected errors", async () => {
      (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database connection failed"));

      const request = createMockRequest({ email: "test@example.com", fullName: "Test User" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal server error");
    });
  });
});
