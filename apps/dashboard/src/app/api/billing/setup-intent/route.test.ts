import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Stripe module
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    setupIntents: {
      create: vi.fn(),
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

describe("POST /api/billing/setup-intent", () => {
  // Mock data
  const mockUserId = "user-123";
  const mockOrgId = "org-456";
  const mockCustomerId = "cus_test_789";
  const mockClientSecret = "seti_test_secret_abc123";

  // Supabase mock chain helpers
  let mockAuthGetUser: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock chain
    mockSingle = vi.fn();
    mockEq = vi.fn(() => ({ single: mockSingle }));
    mockUpdate = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }));
    mockSelect = vi.fn(() => ({ eq: mockEq }));

    mockAuthGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: mockUserId, email: "test@example.com" } },
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

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockAuthGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const response = await POST();
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Not authenticated");
    });
  });

  describe("User and organization lookup", () => {
    it("should return 404 when user not found in database", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const response = await POST();
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("User not found");
    });
  });

  describe("Existing customer flow", () => {
    it("should create SetupIntent for authenticated user with existing Stripe customer", async () => {
      // Setup: User found with existing customer
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            name: "Test Org",
          },
          error: null,
        });

      // Mock SetupIntent creation
      (stripe.setupIntents.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "seti_test_123",
        client_secret: mockClientSecret,
      });

      const response = await POST();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.clientSecret).toBe(mockClientSecret);

      // Verify SetupIntent was created with correct params
      expect(stripe.setupIntents.create).toHaveBeenCalledWith({
        customer: mockCustomerId,
        payment_method_types: ["card"],
        metadata: {
          organization_id: mockOrgId,
          user_id: mockUserId,
        },
      });

      // Verify no new customer was created
      expect(stripe.customers.create).not.toHaveBeenCalled();
    });
  });

  describe("New customer flow", () => {
    it("should create new Stripe customer when none exists", async () => {
      // Setup: User found but no Stripe customer
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: null,
            name: "Test Org",
          },
          error: null,
        });

      // Track update calls
      const updateCalls: Array<{ table: string; data: unknown }> = [];
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation((tableName: string) => {
        return {
          select: mockSelect,
          update: (data: unknown) => {
            updateCalls.push({ table: tableName, data });
            return { eq: vi.fn(() => Promise.resolve({ error: null })) };
          },
        };
      });

      // Mock customer creation
      (stripe.customers.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "cus_new_123",
      });

      // Mock SetupIntent creation
      (stripe.setupIntents.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "seti_test_123",
        client_secret: mockClientSecret,
      });

      const response = await POST();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.clientSecret).toBe(mockClientSecret);

      // Verify customer was created with correct params
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test Org",
        metadata: {
          organization_id: mockOrgId,
          user_id: mockUserId,
        },
      });

      // Verify SetupIntent was created with new customer ID
      expect(stripe.setupIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_new_123",
        })
      );

      // Verify customer ID was saved to organization
      const saveCall = updateCalls.find(
        (call) =>
          call.table === "organizations" &&
          (call.data as Record<string, unknown>).stripe_customer_id === "cus_new_123"
      );
      expect(saveCall).toBeDefined();
    });

    it("should use user email as name when organization has no name", async () => {
      // Setup: User found but organization has no name
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: null,
            name: null,
          },
          error: null,
        });

      // Track update calls
      const supabase = await createClient();
      (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return {
          select: mockSelect,
          update: () => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }),
        };
      });

      // Mock customer creation
      (stripe.customers.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "cus_new_123",
      });

      // Mock SetupIntent creation
      (stripe.setupIntents.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: "seti_test_123",
        client_secret: mockClientSecret,
      });

      await POST();

      // Verify customer was created with email as name fallback
      expect(stripe.customers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test@example.com",
        })
      );
    });
  });

  describe("Error handling", () => {
    it("should return 500 when Stripe SetupIntent creation fails", async () => {
      // Setup: User with existing customer
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: mockCustomerId,
            name: "Test Org",
          },
          error: null,
        });

      // Mock SetupIntent creation to fail
      (stripe.setupIntents.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Stripe API error")
      );

      const response = await POST();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to create setup intent");
    });

    it("should return 500 when Stripe customer creation fails", async () => {
      // Setup: User with no existing customer
      mockSingle
        .mockResolvedValueOnce({
          data: { organization_id: mockOrgId },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            stripe_customer_id: null,
            name: "Test Org",
          },
          error: null,
        });

      // Mock customer creation to fail
      (stripe.customers.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Stripe API error")
      );

      const response = await POST();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Failed to create setup intent");
    });
  });
});



