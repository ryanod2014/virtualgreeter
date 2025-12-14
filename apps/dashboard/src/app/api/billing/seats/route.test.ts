import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Stripe module
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptionItems: {
      update: vi.fn(),
    },
  },
}));

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST } from "./route";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/billing/seats", () => {
  // Mock data
  const mockUserId = "user-123";
  const mockOrgId = "org-456";

  // Supabase mock chain helpers
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a mock request
  function createMockRequest(body: object): NextRequest {
    return new NextRequest("http://localhost:3000/api/billing/seats", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  // Helper to setup Supabase mock with configurable returns
  function setupSupabaseMock(options: {
    profile?: object | null;
    organization?: object;
    activeAgentCount?: number;
    pendingInviteCount?: number;
    userExists?: boolean;
  }) {
    const {
      profile = { role: "admin", organization_id: mockOrgId, organization: { id: mockOrgId, seat_count: 5, stripe_subscription_item_id: "si_test_123" } },
      activeAgentCount = 2,
      pendingInviteCount = 1,
      userExists = true,
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
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                count: activeAgentCount,
                error: null,
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
                  gt: vi.fn().mockResolvedValue({
                    count: pendingInviteCount,
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        };
      }
      if (tableName === "organizations") {
        return {
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
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

      const request = createMockRequest({ action: "add", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });

    it("returns 403 if user profile is not found", async () => {
      setupSupabaseMock({ profile: null });

      const request = createMockRequest({ action: "add", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Profile not found");
    });
  });

  describe("Request validation", () => {
    it("returns 400 when action is missing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid request");
    });

    it("returns 400 when quantity is missing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ action: "add" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid request");
    });

    it("returns 400 when quantity is not a number", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ action: "add", quantity: "not-a-number" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid request");
    });
  });

  describe("Add seat action", () => {
    it("calculates new used seats by adding quantity to current usage", async () => {
      // Setup: 2 active agents + 1 pending invite = 3 used, 5 purchased
      setupSupabaseMock({
        activeAgentCount: 2,
        pendingInviteCount: 1,
      });

      const request = createMockRequest({ action: "add", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.usedSeats).toBe(4); // 3 + 1 = 4
      expect(responseData.billingExpanded).toBe(false); // 4 <= 5
    });

    it("expands billing when new usage exceeds purchased seats", async () => {
      // Setup: 4 active + 1 pending = 5 used, 5 purchased
      // Adding 1 more should expand to 6
      setupSupabaseMock({
        activeAgentCount: 4,
        pendingInviteCount: 1,
      });

      const request = createMockRequest({ action: "add", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.usedSeats).toBe(6);
      expect(responseData.purchasedSeats).toBe(6); // Expanded
      expect(responseData.billingExpanded).toBe(true);
    });

    it("calls Stripe subscriptionItems.update when billing expands in production", async () => {
      setupSupabaseMock({
        activeAgentCount: 4,
        pendingInviteCount: 1,
        organization: {
          id: mockOrgId,
          seat_count: 5,
          stripe_subscription_item_id: "si_test_123",
        },
      });

      const request = createMockRequest({ action: "add", quantity: 2 });
      await POST(request);

      expect(stripe.subscriptionItems.update).toHaveBeenCalledWith("si_test_123", {
        quantity: 7, // 5 used + 2 = 7
        proration_behavior: "create_prorations",
      });
    });

    it("does not call Stripe when billing does not need expansion", async () => {
      // 2 used, 5 purchased, adding 1 = 3 used (no expansion needed)
      setupSupabaseMock({
        activeAgentCount: 1,
        pendingInviteCount: 1,
      });

      const request = createMockRequest({ action: "add", quantity: 1 });
      await POST(request);

      expect(stripe.subscriptionItems.update).not.toHaveBeenCalled();
    });
  });

  describe("Remove seat action", () => {
    it("calculates new used seats by subtracting quantity from current usage", async () => {
      setupSupabaseMock({
        activeAgentCount: 3,
        pendingInviteCount: 1,
      });

      const request = createMockRequest({ action: "remove", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.usedSeats).toBe(3); // 4 - 1 = 3
    });

    it("clamps used seats to zero when removing more than current usage", async () => {
      setupSupabaseMock({
        activeAgentCount: 1,
        pendingInviteCount: 0,
      });

      const request = createMockRequest({ action: "remove", quantity: 10 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.usedSeats).toBe(0); // Math.max(0, 1 - 10) = 0
    });

    it("does not reduce billing when removing seats (PRE-PAID model)", async () => {
      setupSupabaseMock({
        activeAgentCount: 3,
        pendingInviteCount: 1,
      });

      const request = createMockRequest({ action: "remove", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.purchasedSeats).toBe(5); // Still 5, not reduced
      expect(responseData.billingExpanded).toBe(false);
      expect(stripe.subscriptionItems.update).not.toHaveBeenCalled();
    });
  });

  // Note: Dev mode test (when stripe is not configured) is difficult to test
  // because the stripe module mock cannot be conditionally set to null.
  // The dev mode path is tested implicitly when stripe is undefined at runtime.;

  describe("Response format", () => {
    it("returns correct response object with all fields", async () => {
      setupSupabaseMock({
        activeAgentCount: 2,
        pendingInviteCount: 1,
      });

      const request = createMockRequest({ action: "add", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        success: true,
        usedSeats: 4, // 3 + 1
        purchasedSeats: 5, // No expansion, stays 5
        availableSeats: 1, // 5 - 4
        billingExpanded: false,
      });
    });

    it("returns billingExpanded true and updated purchasedSeats when expansion occurs", async () => {
      setupSupabaseMock({
        activeAgentCount: 5,
        pendingInviteCount: 0,
      });

      const request = createMockRequest({ action: "add", quantity: 2 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingExpanded).toBe(true);
      expect(responseData.purchasedSeats).toBe(7); // Expanded to match usage
      expect(responseData.availableSeats).toBe(0); // 7 - 7 = 0
    });
  });

  describe("Error handling", () => {
    it("returns 500 when an unexpected error occurs", async () => {
      (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Database connection failed"));

      const request = createMockRequest({ action: "add", quantity: 1 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to update seats");
    });
  });
});





