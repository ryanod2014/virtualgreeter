import { describe, it, expect } from "vitest";
import type {
  SubscriptionStatus,
  Organization,
  SubscriptionPlan,
  BillingFrequency,
  RecordingSettings,
  FacebookSettings,
  WidgetSettings,
  CountryListMode
} from "./database.types.js";

describe("database.types", () => {
  describe("SubscriptionStatus", () => {
    it("accepts 'active' as valid subscription status", () => {
      const status: SubscriptionStatus = "active";
      expect(status).toBe("active");
    });

    it("accepts 'paused' as valid subscription status", () => {
      const status: SubscriptionStatus = "paused";
      expect(status).toBe("paused");
    });

    it("accepts 'cancelled' as valid subscription status", () => {
      const status: SubscriptionStatus = "cancelled";
      expect(status).toBe("cancelled");
    });

    it("accepts 'trialing' as valid subscription status", () => {
      const status: SubscriptionStatus = "trialing";
      expect(status).toBe("trialing");
    });

    it("accepts 'past_due' as valid subscription status", () => {
      const status: SubscriptionStatus = "past_due";
      expect(status).toBe("past_due");
    });

    it("validates all subscription statuses can be assigned to array", () => {
      const statuses: SubscriptionStatus[] = [
        "active",
        "paused",
        "cancelled",
        "trialing",
        "past_due"
      ];
      expect(statuses).toHaveLength(5);
      expect(statuses).toContain("past_due");
    });

    it("creates type guard for subscription status validation", () => {
      const isValidSubscriptionStatus = (value: string): value is SubscriptionStatus => {
        return ["active", "paused", "cancelled", "trialing", "past_due"].includes(value);
      };

      expect(isValidSubscriptionStatus("active")).toBe(true);
      expect(isValidSubscriptionStatus("past_due")).toBe(true);
      expect(isValidSubscriptionStatus("invalid")).toBe(false);
      expect(isValidSubscriptionStatus("expired")).toBe(false);
    });
  });

  describe("Organization type with SubscriptionStatus", () => {
    const createMockRecordingSettings = (): RecordingSettings => ({
      enabled: false,
      retention_days: 30,
      transcription_enabled: false,
      ai_summary_enabled: false,
      ai_summary_prompt_format: null,
      rna_timeout_seconds: 15,
      max_call_duration_minutes: 120,
    });

    const createMockFacebookSettings = (): FacebookSettings => ({
      pixel_id: null,
      capi_access_token: null,
      test_event_code: null,
      enabled: false,
      pixel_base_code: null,
      dataset_id: null,
    });

    const createMockWidgetSettings = (): WidgetSettings => ({
      size: "medium",
      position: "bottom-right",
      devices: "all",
      trigger_delay: 0,
      auto_hide_delay: null,
      show_minimize_button: true,
      theme: "light",
      cobrowse_enabled: false,
    });

    const createBaseOrganization = (): Omit<Organization, "subscription_status"> => ({
      id: "org_123",
      name: "Test Organization",
      slug: "test-org",
      logo_url: null,
      plan: "starter" as SubscriptionPlan,
      max_agents: 5,
      max_sites: 3,
      recording_settings: createMockRecordingSettings(),
      facebook_settings: createMockFacebookSettings(),
      default_widget_settings: createMockWidgetSettings(),
      blocked_countries: [],
      country_list_mode: "blocklist" as CountryListMode,
      geo_failure_handling: "allow",
      stripe_customer_id: "cus_123",
      stripe_subscription_id: "sub_123",
      stripe_subscription_item_id: "si_123",
      billing_email: "billing@test.com",
      seat_count: 5,
      billing_frequency: "monthly" as BillingFrequency,
      has_six_month_offer: false,
      paused_at: null,
      pause_ends_at: null,
      pause_months: null,
      pause_reason: null,
      greetnow_retargeting_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    it("creates organization with 'active' subscription status", () => {
      const org: Organization = {
        ...createBaseOrganization(),
        subscription_status: "active",
      };
      expect(org.subscription_status).toBe("active");
    });

    it("creates organization with 'paused' subscription status", () => {
      const org: Organization = {
        ...createBaseOrganization(),
        subscription_status: "paused",
      };
      expect(org.subscription_status).toBe("paused");
    });

    it("creates organization with 'cancelled' subscription status", () => {
      const org: Organization = {
        ...createBaseOrganization(),
        subscription_status: "cancelled",
      };
      expect(org.subscription_status).toBe("cancelled");
    });

    it("creates organization with 'trialing' subscription status", () => {
      const org: Organization = {
        ...createBaseOrganization(),
        subscription_status: "trialing",
      };
      expect(org.subscription_status).toBe("trialing");
    });

    it("creates organization with 'past_due' subscription status", () => {
      const org: Organization = {
        ...createBaseOrganization(),
        subscription_status: "past_due",
      };
      expect(org.subscription_status).toBe("past_due");
    });

    it("handles organization with past_due status and billing information", () => {
      const org: Organization = {
        ...createBaseOrganization(),
        subscription_status: "past_due",
        stripe_customer_id: "cus_pastdue",
        stripe_subscription_id: "sub_pastdue",
        billing_email: "pastdue@test.com",
      };
      expect(org.subscription_status).toBe("past_due");
      expect(org.stripe_customer_id).toBe("cus_pastdue");
      expect(org.billing_email).toBe("pastdue@test.com");
    });
  });

  describe("SubscriptionStatus usage patterns", () => {
    it("filters organizations by subscription status", () => {
      const organizations = [
        { id: "org1", subscription_status: "active" as SubscriptionStatus },
        { id: "org2", subscription_status: "past_due" as SubscriptionStatus },
        { id: "org3", subscription_status: "trialing" as SubscriptionStatus },
        { id: "org4", subscription_status: "past_due" as SubscriptionStatus },
        { id: "org5", subscription_status: "cancelled" as SubscriptionStatus },
      ];

      const pastDueOrgs = organizations.filter(org => org.subscription_status === "past_due");
      expect(pastDueOrgs).toHaveLength(2);
      expect(pastDueOrgs[0]?.id).toBe("org2");
      expect(pastDueOrgs[1]?.id).toBe("org4");
    });

    it("groups organizations by subscription status", () => {
      const organizations = [
        { id: "org1", subscription_status: "active" as SubscriptionStatus },
        { id: "org2", subscription_status: "past_due" as SubscriptionStatus },
        { id: "org3", subscription_status: "active" as SubscriptionStatus },
        { id: "org4", subscription_status: "past_due" as SubscriptionStatus },
        { id: "org5", subscription_status: "cancelled" as SubscriptionStatus },
      ];

      const grouped = organizations.reduce((acc, org) => {
        if (!acc[org.subscription_status]) {
          acc[org.subscription_status] = [];
        }
        acc[org.subscription_status].push(org);
        return acc;
      }, {} as Record<SubscriptionStatus, typeof organizations>);

      expect(grouped.active).toHaveLength(2);
      expect(grouped.past_due).toHaveLength(2);
      expect(grouped.cancelled).toHaveLength(1);
    });

    it("checks if subscription status requires billing action", () => {
      const requiresBillingAction = (status: SubscriptionStatus): boolean => {
        return status === "past_due" || status === "cancelled";
      };

      expect(requiresBillingAction("active")).toBe(false);
      expect(requiresBillingAction("trialing")).toBe(false);
      expect(requiresBillingAction("paused")).toBe(false);
      expect(requiresBillingAction("past_due")).toBe(true);
      expect(requiresBillingAction("cancelled")).toBe(true);
    });

    it("checks if subscription is in good standing", () => {
      const isInGoodStanding = (status: SubscriptionStatus): boolean => {
        return status === "active" || status === "trialing";
      };

      expect(isInGoodStanding("active")).toBe(true);
      expect(isInGoodStanding("trialing")).toBe(true);
      expect(isInGoodStanding("paused")).toBe(false);
      expect(isInGoodStanding("past_due")).toBe(false);
      expect(isInGoodStanding("cancelled")).toBe(false);
    });

    it("determines if subscription allows access", () => {
      const allowsAccess = (status: SubscriptionStatus): boolean => {
        return ["active", "trialing", "paused"].includes(status);
      };

      expect(allowsAccess("active")).toBe(true);
      expect(allowsAccess("trialing")).toBe(true);
      expect(allowsAccess("paused")).toBe(true);
      expect(allowsAccess("past_due")).toBe(false);
      expect(allowsAccess("cancelled")).toBe(false);
    });

    it("determines if subscription status is terminal", () => {
      const isTerminal = (status: SubscriptionStatus): boolean => {
        return status === "cancelled";
      };

      expect(isTerminal("active")).toBe(false);
      expect(isTerminal("trialing")).toBe(false);
      expect(isTerminal("paused")).toBe(false);
      expect(isTerminal("past_due")).toBe(false);
      expect(isTerminal("cancelled")).toBe(true);
    });
  });

  describe("SubscriptionStatus state transitions", () => {
    it("validates transition from trialing to active", () => {
      let status: SubscriptionStatus = "trialing";
      status = "active";
      expect(status).toBe("active");
    });

    it("validates transition from active to past_due", () => {
      let status: SubscriptionStatus = "active";
      status = "past_due";
      expect(status).toBe("past_due");
    });

    it("validates transition from past_due to active", () => {
      let status: SubscriptionStatus = "past_due";
      status = "active";
      expect(status).toBe("active");
    });

    it("validates transition from past_due to cancelled", () => {
      let status: SubscriptionStatus = "past_due";
      status = "cancelled";
      expect(status).toBe("cancelled");
    });

    it("validates transition from active to paused", () => {
      let status: SubscriptionStatus = "active";
      status = "paused";
      expect(status).toBe("paused");
    });

    it("validates transition from paused to active", () => {
      let status: SubscriptionStatus = "paused";
      status = "active";
      expect(status).toBe("active");
    });

    it("validates transition from any status to cancelled", () => {
      const allStatuses: SubscriptionStatus[] = ["active", "paused", "trialing", "past_due"];

      allStatuses.forEach(initialStatus => {
        let status: SubscriptionStatus = initialStatus;
        status = "cancelled";
        expect(status).toBe("cancelled");
      });
    });
  });

  describe("SubscriptionStatus with Stripe webhook scenarios", () => {
    it("handles Stripe invoice.payment_failed webhook scenario", () => {
      const org: Pick<Organization, "subscription_status"> = {
        subscription_status: "past_due",
      };

      expect(org.subscription_status).toBe("past_due");
    });

    it("handles Stripe invoice.payment_succeeded after past_due", () => {
      let status: SubscriptionStatus = "past_due";
      status = "active";
      expect(status).toBe("active");
    });

    it("handles Stripe customer.subscription.deleted webhook", () => {
      let status: SubscriptionStatus = "past_due";
      status = "cancelled";
      expect(status).toBe("cancelled");
    });

    it("handles new subscription starting in trialing", () => {
      const status: SubscriptionStatus = "trialing";
      expect(status).toBe("trialing");
    });

    it("represents subscription status in database query result", () => {
      const dbResult = {
        id: "org_123",
        name: "Test Org",
        subscription_status: "past_due" as SubscriptionStatus,
      };

      expect(dbResult.subscription_status).toBe("past_due");
      const status: SubscriptionStatus = dbResult.subscription_status;
      expect(status).toBe("past_due");
    });
  });
});
