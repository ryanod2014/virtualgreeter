import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { submitCancellationFeedback, pauseAccount, resumeAccount } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CancellationReason } from "@ghost-greeter/domain/database.types";

// ============================================================================
// CANCEL SUBSCRIPTION TESTS (B5)
// ============================================================================
describe("Cancel Subscription Actions", () => {
  const mockOrgId = "org-123";
  const mockUserId = "user-456";

  let mockCancellationFeedbackInsert: ReturnType<typeof vi.fn>;
  let mockOrganizationsUpdate: ReturnType<typeof vi.fn>;
  let mockOrganizationsUpdateEq: ReturnType<typeof vi.fn>;

  const baseCancellationParams = {
    organizationId: mockOrgId,
    userId: mockUserId,
    primaryReason: "too_expensive" as CancellationReason,
    additionalReasons: [] as CancellationReason[],
    detailedFeedback: "The pricing is too high for our budget",
    competitorName: null,
    wouldReturn: true,
    returnConditions: "Lower pricing",
    agentCount: 3,
    monthlyCost: 149,
    subscriptionDurationDays: 90,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockCancellationFeedbackInsert = vi.fn().mockResolvedValue({ error: null });
    mockOrganizationsUpdateEq = vi.fn().mockResolvedValue({ error: null });
    mockOrganizationsUpdate = vi.fn(() => ({ eq: mockOrganizationsUpdateEq }));

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn((tableName: string) => {
        if (tableName === "cancellation_feedback") {
          return {
            insert: mockCancellationFeedbackInsert,
          };
        }
        if (tableName === "organizations") {
          return {
            update: mockOrganizationsUpdate,
          };
        }
        return {};
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("submitCancellationFeedback", () => {
    describe("Behavior 1: Saves cancellation feedback to database", () => {
      it("inserts feedback record into cancellation_feedback table", async () => {
        await submitCancellationFeedback(baseCancellationParams);

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith({
          organization_id: mockOrgId,
          user_id: mockUserId,
          primary_reason: "too_expensive",
          additional_reasons: [],
          detailed_feedback: "The pricing is too high for our budget",
          competitor_name: null,
          would_return: true,
          return_conditions: "Lower pricing",
          agent_count: 3,
          monthly_cost: 149,
          subscription_duration_days: 90,
        });
      });

      it("saves primary_reason field correctly", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          primaryReason: "switched_to_competitor",
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_reason: "switched_to_competitor",
          })
        );
      });

      it("saves additional_reasons as array", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          additionalReasons: ["technical_issues", "difficult_to_use"] as CancellationReason[],
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            additional_reasons: ["technical_issues", "difficult_to_use"],
          })
        );
      });

      it("saves detailed_feedback text", async () => {
        const feedback = "Very detailed feedback about our experience";
        await submitCancellationFeedback({
          ...baseCancellationParams,
          detailedFeedback: feedback,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            detailed_feedback: feedback,
          })
        );
      });

      it("saves competitor_name when switching to competitor", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          primaryReason: "switched_to_competitor",
          competitorName: "Intercom",
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            competitor_name: "Intercom",
          })
        );
      });

      it("saves would_return boolean", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          wouldReturn: false,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            would_return: false,
          })
        );
      });

      it("saves return_conditions when would_return is true", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          wouldReturn: true,
          returnConditions: "Better mobile app",
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            return_conditions: "Better mobile app",
          })
        );
      });

      it("saves agent_count for analytics", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          agentCount: 10,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            agent_count: 10,
          })
        );
      });

      it("saves monthly_cost for MRR analytics", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          monthlyCost: 299,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            monthly_cost: 299,
          })
        );
      });

      it("saves subscription_duration_days for churn analysis", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          subscriptionDurationDays: 365,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            subscription_duration_days: 365,
          })
        );
      });

      it("handles null detailed_feedback", async () => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          detailedFeedback: null,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            detailed_feedback: null,
          })
        );
      });
    });

    describe("Behavior 2: Updates org plan to 'free'", () => {
      it("updates organization plan to 'free' after saving feedback", async () => {
        await submitCancellationFeedback(baseCancellationParams);

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith({ plan: "free" });
        expect(mockOrganizationsUpdateEq).toHaveBeenCalledWith("id", mockOrgId);
      });

      it("saves feedback before updating org plan (feedback is prioritized)", async () => {
        const callOrder: string[] = [];
        mockCancellationFeedbackInsert.mockImplementation(() => {
          callOrder.push("feedback");
          return Promise.resolve({ error: null });
        });
        mockOrganizationsUpdate.mockImplementation(() => {
          callOrder.push("org_update");
          return { eq: mockOrganizationsUpdateEq };
        });

        await submitCancellationFeedback(baseCancellationParams);

        expect(callOrder).toEqual(["feedback", "org_update"]);
      });
    });

    describe("Error handling", () => {
      it("throws error when feedback insert fails", async () => {
        mockCancellationFeedbackInsert.mockResolvedValueOnce({
          error: { message: "Insert failed" },
        });

        await expect(submitCancellationFeedback(baseCancellationParams)).rejects.toThrow(
          "Failed to save cancellation feedback"
        );
      });

      it("does not throw when org plan update fails (feedback is saved)", async () => {
        mockOrganizationsUpdateEq.mockResolvedValueOnce({
          error: { message: "Update failed" },
        });

        // Should not throw - feedback is the priority
        const result = await submitCancellationFeedback(baseCancellationParams);

        expect(result.success).toBe(true);
      });

      it("logs error but continues when org update fails", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        mockOrganizationsUpdateEq.mockResolvedValueOnce({
          error: { message: "Database error" },
        });

        await submitCancellationFeedback(baseCancellationParams);

        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to update organization plan:",
          expect.any(Object)
        );
      });
    });

    describe("Cache revalidation", () => {
      it("revalidates billing settings path after cancellation", async () => {
        await submitCancellationFeedback(baseCancellationParams);

        expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/billing");
      });
    });

    describe("Return value", () => {
      it("returns success:true on successful cancellation", async () => {
        const result = await submitCancellationFeedback(baseCancellationParams);

        expect(result).toEqual({ success: true });
      });
    });

    describe("All cancellation reasons supported", () => {
      const allReasons: CancellationReason[] = [
        "reps_not_using",
        "not_enough_reps",
        "low_website_traffic",
        "low_roi_per_call",
        "too_expensive",
        "not_enough_features",
        "switched_to_competitor",
        "technical_issues",
        "difficult_to_use",
        "business_closed",
        "other",
      ];

      it.each(allReasons)("accepts '%s' as primary reason", async (reason) => {
        await submitCancellationFeedback({
          ...baseCancellationParams,
          primaryReason: reason,
        });

        expect(mockCancellationFeedbackInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_reason: reason,
          })
        );
      });
    });
  });
});

// ============================================================================
// PAUSE SUBSCRIPTION TESTS
// ============================================================================
describe("Pause Subscription Actions", () => {
  const mockOrgId = "org-123";
  const mockUserId = "user-456";

  let mockOrganizationsUpdate: ReturnType<typeof vi.fn>;
  let mockOrganizationsUpdateEq: ReturnType<typeof vi.fn>;
  let mockPauseHistoryInsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T12:00:00.000Z"));

    // Setup default mock implementations
    mockOrganizationsUpdateEq = vi.fn().mockResolvedValue({ error: null });
    mockOrganizationsUpdate = vi.fn(() => ({ eq: mockOrganizationsUpdateEq }));
    mockPauseHistoryInsert = vi.fn().mockResolvedValue({ error: null });

    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      from: vi.fn((tableName: string) => {
        if (tableName === "organizations") {
          return {
            update: mockOrganizationsUpdate,
          };
        }
        if (tableName === "pause_history") {
          return {
            insert: mockPauseHistoryInsert,
          };
        }
        return {};
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  // ============================================================================
  // pauseAccount
  // ============================================================================
  describe("pauseAccount", () => {
    describe("Behavior 1: Updates org status to 'paused'", () => {
      it("sets subscription_status to 'paused' in database", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            subscription_status: "paused",
          })
        );
        expect(mockOrganizationsUpdateEq).toHaveBeenCalledWith("id", mockOrgId);
      });

      it("sets paused_at to current timestamp", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            paused_at: "2025-01-15T12:00:00.000Z",
          })
        );
      });

      it("stores pause_months in database", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 2,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_months: 2,
          })
        );
      });

      it("stores pause_reason when provided", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: "Taking a break for summer",
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_reason: "Taking a break for summer",
          })
        );
      });

      it("stores pause_reason as null when not provided", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_reason: null,
          })
        );
      });
    });

    describe("Behavior 2: Sets pause_ends_at based on duration", () => {
      it("sets pause_ends_at to 1 month from now for pauseMonths=1", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_ends_at: "2025-02-15T12:00:00.000Z",
          })
        );
      });

      it("sets pause_ends_at to 2 months from now for pauseMonths=2", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 2,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_ends_at: "2025-03-15T12:00:00.000Z",
          })
        );
      });

      it("sets pause_ends_at to 3 months from now for pauseMonths=3", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 3,
          reason: null,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_ends_at: "2025-04-15T12:00:00.000Z",
          })
        );
      });

      it("returns pauseEndsAt in response", async () => {
        const result = await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 2,
          reason: null,
        });

        expect(result.pauseEndsAt).toBe("2025-03-15T12:00:00.000Z");
      });
    });

    describe("Validation", () => {
      it("throws error for pauseMonths=0", async () => {
        await expect(
          pauseAccount({
            organizationId: mockOrgId,
            userId: mockUserId,
            pauseMonths: 0,
            reason: null,
          })
        ).rejects.toThrow("Invalid pause duration. Must be 1, 2, or 3 months.");
      });

      it("throws error for pauseMonths=4", async () => {
        await expect(
          pauseAccount({
            organizationId: mockOrgId,
            userId: mockUserId,
            pauseMonths: 4,
            reason: null,
          })
        ).rejects.toThrow("Invalid pause duration. Must be 1, 2, or 3 months.");
      });

      it("throws error for negative pauseMonths", async () => {
        await expect(
          pauseAccount({
            organizationId: mockOrgId,
            userId: mockUserId,
            pauseMonths: -1,
            reason: null,
          })
        ).rejects.toThrow("Invalid pause duration. Must be 1, 2, or 3 months.");
      });
    });

    describe("Pause history tracking", () => {
      it("records pause event in pause_history table", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 2,
          reason: "Seasonal slowdown",
        });

        expect(mockPauseHistoryInsert).toHaveBeenCalledWith({
          organization_id: mockOrgId,
          user_id: mockUserId,
          action: "paused",
          pause_months: 2,
          reason: "Seasonal slowdown",
        });
      });

      it("records pause history even when reason is null", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(mockPauseHistoryInsert).toHaveBeenCalledWith({
          organization_id: mockOrgId,
          user_id: mockUserId,
          action: "paused",
          pause_months: 1,
          reason: null,
        });
      });

      it("does not throw if pause history insert fails", async () => {
        mockPauseHistoryInsert.mockResolvedValueOnce({
          error: { message: "History insert failed" },
        });

        const result = await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("Error handling", () => {
      it("throws error when organization update fails", async () => {
        mockOrganizationsUpdateEq.mockResolvedValueOnce({
          error: { message: "Database error" },
        });

        await expect(
          pauseAccount({
            organizationId: mockOrgId,
            userId: mockUserId,
            pauseMonths: 1,
            reason: null,
          })
        ).rejects.toThrow("Failed to pause account");
      });
    });

    describe("Cache revalidation", () => {
      it("revalidates billing settings path after successful pause", async () => {
        await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/billing");
      });
    });

    describe("Return value", () => {
      it("returns success:true on successful pause", async () => {
        const result = await pauseAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
          pauseMonths: 1,
          reason: null,
        });

        expect(result.success).toBe(true);
      });
    });
  });

  // ============================================================================
  // resumeAccount
  // ============================================================================
  describe("resumeAccount", () => {
    describe("Behavior 3: Updates org status to 'active'", () => {
      it("sets subscription_status to 'active' in database", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            subscription_status: "active",
          })
        );
        expect(mockOrganizationsUpdateEq).toHaveBeenCalledWith("id", mockOrgId);
      });
    });

    describe("Behavior 4: Clears pause_ends_at and related fields", () => {
      it("sets paused_at to null", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            paused_at: null,
          })
        );
      });

      it("sets pause_ends_at to null", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_ends_at: null,
          })
        );
      });

      it("sets pause_months to null", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_months: null,
          })
        );
      });

      it("sets pause_reason to null", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            pause_reason: null,
          })
        );
      });

      it("clears all pause fields in a single update call", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockOrganizationsUpdate).toHaveBeenCalledWith({
          subscription_status: "active",
          paused_at: null,
          pause_ends_at: null,
          pause_months: null,
          pause_reason: null,
        });
      });
    });

    describe("Resume history tracking", () => {
      it("records resume event in pause_history table", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(mockPauseHistoryInsert).toHaveBeenCalledWith({
          organization_id: mockOrgId,
          user_id: mockUserId,
          action: "resumed",
          pause_months: null,
          reason: null,
        });
      });

      it("does not throw if resume history insert fails", async () => {
        mockPauseHistoryInsert.mockResolvedValueOnce({
          error: { message: "History insert failed" },
        });

        const result = await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(result.success).toBe(true);
      });
    });

    describe("Error handling", () => {
      it("throws error when organization update fails", async () => {
        mockOrganizationsUpdateEq.mockResolvedValueOnce({
          error: { message: "Database error" },
        });

        await expect(
          resumeAccount({
            organizationId: mockOrgId,
            userId: mockUserId,
          })
        ).rejects.toThrow("Failed to resume account");
      });
    });

    describe("Cache revalidation", () => {
      it("revalidates billing settings path after successful resume", async () => {
        await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/billing");
      });
    });

    describe("Return value", () => {
      it("returns success:true on successful resume", async () => {
        const result = await resumeAccount({
          organizationId: mockOrgId,
          userId: mockUserId,
        });

        expect(result.success).toBe(true);
      });
    });
  });
});
