import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Stripe module
vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptionItems: {
      update: vi.fn(),
    },
  },
  getPriceIdForFrequency: vi.fn((frequency: string) => {
    const priceIds: Record<string, string> = {
      monthly: "price_monthly_123",
      annual: "price_annual_456",
      six_month: "price_six_month_789",
    };
    return priceIds[frequency] || null;
  }),
}));

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST } from "./route";
import { stripe, getPriceIdForFrequency } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/billing/update-settings", () => {
  const mockUserId = "user-123";
  const mockOrgId = "org-456";

  let mockAuthGetUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockRequest(body: object): NextRequest {
    return new NextRequest("http://localhost:3000/api/billing/update-settings", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  function setupSupabaseMock(options: {
    userExists?: boolean;
    profile?: object | null;
    org?: object | null;
    activeAgentCount?: number;
    pendingAgentInviteCount?: number;
    updateError?: boolean;
  }) {
    const {
      userExists = true,
      profile = { role: "admin", organization_id: mockOrgId },
      org = {
        id: mockOrgId,
        seat_count: 5,
        billing_frequency: "monthly",
        has_six_month_offer: true,
        stripe_subscription_item_id: "si_test_123",
      },
      activeAgentCount = 2,
      pendingAgentInviteCount = 1,
      updateError = false,
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
      if (tableName === "organizations") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: org,
                error: org ? null : { message: "Not found" },
              }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              error: updateError ? { message: "Update failed" } : null,
            }),
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
                    count: pendingAgentInviteCount,
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
      auth: {
        getUser: userExists
          ? mockAuthGetUser
          : vi.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: mockFrom,
    });
  }

  describe("Authentication and authorization", () => {
    it("returns 401 if user is not authenticated", async () => {
      setupSupabaseMock({ userExists: false });

      const request = createMockRequest({ seatCount: 5 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
    });

    it("returns 403 if user profile is not found", async () => {
      setupSupabaseMock({ profile: null });

      const request = createMockRequest({ seatCount: 5 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Admin access required");
    });

    it("returns 403 if user is not an admin", async () => {
      setupSupabaseMock({ profile: { role: "agent", organization_id: mockOrgId } });

      const request = createMockRequest({ seatCount: 5 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe("Admin access required");
    });

    it("returns 404 if organization is not found", async () => {
      setupSupabaseMock({ org: null });

      const request = createMockRequest({ seatCount: 5 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Organization not found");
    });
  });

  describe("Seat count changes", () => {
    it("allows increasing seat count above current usage", async () => {
      // Usage: 2 active + 1 pending = 3
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 10 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.seatCount).toBe(10);
      expect(responseData.availableSeats).toBe(7); // 10 - 3
    });

    it("allows reducing seat count to exactly current usage", async () => {
      // Usage: 2 active + 1 pending = 3
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 3 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.seatCount).toBe(3);
      expect(responseData.availableSeats).toBe(0);
    });

    it("returns 400 when reducing seat count below current usage", async () => {
      // Usage: 2 active + 1 pending = 3
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 2 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Cannot reduce seats below current usage (3 in use)");
      expect(responseData.currentUsage).toBe(3);
      expect(responseData.minSeats).toBe(3);
    });

    it("clamps seat count to minimum of 1", async () => {
      setupSupabaseMock({ activeAgentCount: 0, pendingAgentInviteCount: 0 });

      const request = createMockRequest({ seatCount: 0 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.seatCount).toBe(1);
    });

    it("floors decimal seat count values", async () => {
      setupSupabaseMock({ activeAgentCount: 0, pendingAgentInviteCount: 0 });

      const request = createMockRequest({ seatCount: 3.7 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.seatCount).toBe(3);
    });

    it("handles negative seat count by clamping to 1", async () => {
      setupSupabaseMock({ activeAgentCount: 0, pendingAgentInviteCount: 0 });

      const request = createMockRequest({ seatCount: -5 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.seatCount).toBe(1);
    });

    it("calls Stripe when seat count changes in production", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 8 });
      await POST(request);

      expect(stripe.subscriptionItems.update).toHaveBeenCalledWith("si_test_123", {
        quantity: 8,
        proration_behavior: "create_prorations",
      });
    });

    it("does not call Stripe when seat count is unchanged", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 5 }); // Same as org.seat_count
      await POST(request);

      expect(stripe.subscriptionItems.update).not.toHaveBeenCalled();
    });
  });

  describe("Billing frequency changes", () => {
    it("allows changing to monthly billing", async () => {
      setupSupabaseMock({
        org: {
          id: mockOrgId,
          seat_count: 5,
          billing_frequency: "annual",
          has_six_month_offer: true,
          stripe_subscription_item_id: "si_test_123",
        },
      });

      const request = createMockRequest({ billingFrequency: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingFrequency).toBe("monthly");
    });

    it("allows changing to annual billing", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ billingFrequency: "annual" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingFrequency).toBe("annual");
    });

    it("allows changing to six_month billing when offer is available", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ billingFrequency: "six_month" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingFrequency).toBe("six_month");
    });

    it("returns 400 when trying to use six_month without offer", async () => {
      setupSupabaseMock({
        org: {
          id: mockOrgId,
          seat_count: 5,
          billing_frequency: "monthly",
          has_six_month_offer: false,
          stripe_subscription_item_id: "si_test_123",
        },
      });

      const request = createMockRequest({ billingFrequency: "six_month" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("6-month pricing is not available for your account");
    });

    it("returns 400 for invalid billing frequency", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ billingFrequency: "weekly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid billing frequency");
    });

    it("removes six_month offer when switching away from six_month", async () => {
      setupSupabaseMock({
        org: {
          id: mockOrgId,
          seat_count: 5,
          billing_frequency: "six_month",
          has_six_month_offer: true,
          stripe_subscription_item_id: "si_test_123",
        },
      });

      const request = createMockRequest({ billingFrequency: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.sixMonthOfferRemoved).toBe(true);
    });

    it("does not remove six_month offer when staying on six_month", async () => {
      setupSupabaseMock({
        org: {
          id: mockOrgId,
          seat_count: 5,
          billing_frequency: "six_month",
          has_six_month_offer: true,
          stripe_subscription_item_id: "si_test_123",
        },
      });

      const request = createMockRequest({ billingFrequency: "six_month" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.sixMonthOfferRemoved).toBeUndefined();
    });

    it("calls Stripe with new price ID when frequency changes", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ billingFrequency: "annual" });
      await POST(request);

      expect(stripe.subscriptionItems.update).toHaveBeenCalledWith("si_test_123", {
        price: "price_annual_456",
        proration_behavior: "create_prorations",
      });
    });

    it("returns 500 when price ID is not configured for frequency", async () => {
      (getPriceIdForFrequency as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      setupSupabaseMock({});

      const request = createMockRequest({ billingFrequency: "annual" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Price not configured for annual billing");
    });
  });

  describe("Combined updates", () => {
    it("allows updating both seat count and billing frequency together", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 10, billingFrequency: "annual" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.seatCount).toBe(10);
      expect(responseData.billingFrequency).toBe("annual");
    });
  });

  describe("Database errors", () => {
    it("returns 500 when database update fails", async () => {
      setupSupabaseMock({ updateError: true });

      const request = createMockRequest({ seatCount: 10 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to update settings");
    });
  });

  describe("Response format", () => {
    it("includes currentUsage in response", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 10 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.currentUsage).toBe(3); // 2 active + 1 pending
    });

    it("includes stripeUpdated flag when Stripe is called for seat changes", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ seatCount: 8 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.stripeUpdated).toBe(true);
    });

    it("includes stripePriceUpdated flag when Stripe is called for frequency changes", async () => {
      setupSupabaseMock({});

      const request = createMockRequest({ billingFrequency: "annual" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.stripePriceUpdated).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("returns 500 when an unexpected error occurs", async () => {
      (createClient as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Connection error"));

      const request = createMockRequest({ seatCount: 5 });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to update billing settings");
    });
  });
});


