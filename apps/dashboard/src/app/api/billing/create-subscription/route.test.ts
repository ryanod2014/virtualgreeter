import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Stripe module
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      retrieve: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
    },
  },
  getPriceIdForFrequency: vi.fn((frequency: string) => {
    // Return different price IDs based on frequency
    const priceIds: Record<string, string> = {
      monthly: "price_monthly_123",
      annual: "price_annual_456",
      six_month: "price_six_month_789",
    };
    return priceIds[frequency] || "price_monthly_123";
  }),
}));

// Mock Supabase module
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { POST } from "./route";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

describe("POST /api/billing/create-subscription", () => {
  // Mock data
  const mockUserId = "user-123";
  const mockOrgId = "org-456";
  const mockCustomerId = "cus_test_789";

  // Supabase mock chain helpers
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockFromUsers: ReturnType<typeof vi.fn>;
  let mockFromOrganizations: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockUpdate = vi.fn(() => ({ eq: vi.fn() }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId } },
    });

    // Setup from() to return different mocks based on table name
    const fromMock = vi.fn((tableName: string) => {
      if (tableName === "users") {
        return { select: mockSelect };
      }
      if (tableName === "organizations") {
        return { select: mockSelect, update: mockUpdate };
      }
      return { select: mockSelect };
    });

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: mockAuthGetUser },
      from: fromMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create a mock request
  function createMockRequest(body: object): NextRequest {
    return new NextRequest("http://localhost:3000/api/billing/create-subscription", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  describe("Cancelled user re-subscription (P0-001 regression test)", () => {
    it("should allow cancelled users to create a new subscription", async () => {
      // Setup: User exists and org has cancelled subscription
      mockSingle
        // First call: Get user's organization_id
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        // Second call: Get organization details - CANCELLED status
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: "sub_old_cancelled",
            name: "Test Org",
            subscription_status: "cancelled", // Key: subscription is cancelled
          },
          error: null,
        });

      // Mock Stripe customer retrieve
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: {
          default_payment_method: "pm_test_456",
        },
      });

      // Mock Stripe subscription create
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_new_123",
        status: "trialing",
        items: {
          data: [{ id: "si_test_789" }],
        },
      });

      // Track update calls
      const updateCalls: { table: string; data: object }[] = [];
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((tableName: string) => {
        return {
          select: mockSelect,
          update: (data: object) => {
            updateCalls.push({ table: tableName, data });
            return { eq: vi.fn(() => Promise.resolve({ error: null })) };
          },
        };
      });

      // Execute
      const request = createMockRequest({ seatCount: 2, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      // Verify success
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.subscriptionId).toBe("sub_new_123");

      // Verify Stripe subscription was created with monthly price ID
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: mockCustomerId,
          items: [{ price: "price_monthly_123", quantity: 2 }],
        })
      );
    });

    it("should clear old subscription IDs when user was cancelled", async () => {
      // Setup: User exists and org has cancelled subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: "sub_old_cancelled",
            name: "Test Org",
            subscription_status: "cancelled",
          },
          error: null,
        });

      // Track update calls to verify old IDs are cleared
      const updateCalls: Array<{ table: string; data: unknown }> = [];

      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((tableName: string) => {
        return {
          select: mockSelect,
          update: (data: unknown) => {
            updateCalls.push({ table: tableName, data });
            return {
              eq: vi.fn(() => Promise.resolve({ error: null })),
            };
          },
        };
      });

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_new_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      // Execute
      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      await POST(request);

      // Verify the first update clears old subscription IDs
      const clearUpdate = updateCalls.find(
        (call) =>
          call.table === "organizations" &&
          (call.data as Record<string, unknown>).stripe_subscription_id === null
      );
      expect(clearUpdate).toBeDefined();
      expect((clearUpdate?.data as Record<string, unknown>).stripe_subscription_item_id).toBeNull();
    });

    it("should block users with active subscription from creating another", async () => {
      // Setup: User has ACTIVE subscription (not cancelled)
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: "sub_existing_active",
            name: "Test Org",
            subscription_status: "active", // Active, not cancelled
          },
          error: null,
        });

      // Execute
      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      // Verify blocked
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Subscription already exists");
      expect(responseData.subscriptionId).toBe("sub_existing_active");

      // Verify Stripe was NOT called
      expect(stripe.subscriptions.create).not.toHaveBeenCalled();
    });

    it("should block users with trialing subscription from creating another", async () => {
      // Setup: User has TRIALING subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: "sub_existing_trial",
            name: "Test Org",
            subscription_status: "trialing",
          },
          error: null,
        });

      // Execute
      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      // Verify blocked
      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Subscription already exists");

      // Verify Stripe was NOT called
      expect(stripe.subscriptions.create).not.toHaveBeenCalled();
    });

    it("should allow users without any subscription to create one", async () => {
      // Setup: User has no subscription (null stripe_subscription_id)
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null, // No subscription
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Setup update mock
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: mockSelect,
        update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
      }));

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_new_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      // Execute
      const request = createMockRequest({ seatCount: 3, billingPreference: "annual" });
      const response = await POST(request);
      const responseData = await response.json();

      // Verify success
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.subscriptionId).toBe("sub_new_123");
      expect(responseData.billingFrequency).toBe("annual");
    });
  });

  describe("Authentication and validation", () => {
    it("should return 401 if user is not authenticated", async () => {
      // Setup: No authenticated user
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Not authenticated");
    });

    it("should return 400 for invalid seat count", async () => {
      const request = createMockRequest({ seatCount: 0, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid seat count");
    });

    it("should return 400 for negative seat count", async () => {
      const request = createMockRequest({ seatCount: -1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Invalid seat count");
    });

    it("should return 404 when user not found in database", async () => {
      // Setup: User authenticated but not found in users table
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("User not found");
    });

    it("should return 404 when organization not found", async () => {
      // Setup: User found but organization not found
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: null,
          error: null,
        });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Organization not found");
    });
  });

  describe("Billing frequency handling", () => {
    it("should use annual price ID when annual billing preference selected", async () => {
      // Setup: User with no existing subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Setup update mock
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: mockSelect,
        update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
      }));

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_annual_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      const request = createMockRequest({ seatCount: 2, billingPreference: "annual" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingFrequency).toBe("annual");
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ price: "price_annual_456", quantity: 2 }],
        })
      );
    });

    it("should use six_month price ID when six_month billing preference selected", async () => {
      // Setup: User with no existing subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Setup update mock
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: mockSelect,
        update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
      }));

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_six_month_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      const request = createMockRequest({ seatCount: 3, billingPreference: "six_month" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingFrequency).toBe("six_month");
      expect(responseData.hasSixMonthOffer).toBe(true);
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ price: "price_six_month_789", quantity: 3 }],
        })
      );
    });

    it("should default to monthly when invalid billing preference is provided", async () => {
      // Setup: User with no existing subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Setup update mock
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: mockSelect,
        update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
      }));

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_monthly_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "invalid_frequency" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.billingFrequency).toBe("monthly");
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [{ price: "price_monthly_123", quantity: 1 }],
        })
      );
    });
  });

  describe("Payment method validation", () => {
    it("should return 400 when organization has no stripe_customer_id", async () => {
      // Setup: User with organization but no Stripe customer
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: null,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("No payment method on file. Please add a card first.");
    });

    it("should return 404 when Stripe customer has been deleted", async () => {
      // Setup: User with valid org and customer ID
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Mock Stripe customer as deleted
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: true,
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("Customer not found");
    });

    it("should return 400 when customer has no default payment method", async () => {
      // Setup: User with valid org and customer ID
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Mock Stripe customer with no payment method
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: null },
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("No payment method on file. Please add a card first.");
    });
  });

  describe("Stripe API error handling", () => {
    it("should return 500 when Stripe subscription creation fails", async () => {
      // Setup: User with valid org and payment method
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Mock Stripe customer
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });

      // Mock Stripe subscription.create to throw error
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Stripe API error")
      );

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to create subscription");
    });
  });

  describe("Subscription metadata and trial", () => {
    it("should create subscription with 7-day trial period", async () => {
      // Setup: User with no existing subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Setup update mock
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: mockSelect,
        update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
      }));

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_new_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      await POST(request);

      // Verify subscription was created with trial_end approximately 7 days from now
      expect(stripe.subscriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trial_end: expect.any(Number),
          default_payment_method: "pm_test_456",
          proration_behavior: "create_prorations",
          metadata: expect.objectContaining({
            organization_id: mockOrgId,
            billing_preference: "monthly",
            initial_seat_count: "1",
          }),
        })
      );
    });

    it("should return trialEnd date in response", async () => {
      // Setup: User with no existing subscription
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            stripe_subscription_id: null,
            name: "Test Org",
            subscription_status: null,
          },
          error: null,
        });

      // Setup update mock
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        select: mockSelect,
        update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
      }));

      // Mock Stripe
      (stripe.customers.retrieve as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: mockCustomerId,
        deleted: false,
        invoice_settings: { default_payment_method: "pm_test_456" },
      });
      (stripe.subscriptions.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "sub_new_123",
        status: "trialing",
        items: { data: [{ id: "si_test_789" }] },
      });

      const request = createMockRequest({ seatCount: 1, billingPreference: "monthly" });
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.trialEnd).toBeDefined();
      expect(responseData.status).toBe("trialing");
    });
  });
});

