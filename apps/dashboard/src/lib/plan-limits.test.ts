import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS,
  getPlanLimits,
  canAddAgent,
  canAddSite,
  hasFeature,
  getRemainingAgentSlots,
  getRemainingSiteSlots,
  formatLimitDisplay,
  getUpgradeMessage,
} from "./plan-limits";

describe("plan-limits", () => {
  describe("PLAN_LIMITS constant", () => {
    it("defines limits for free plan", () => {
      expect(PLAN_LIMITS.free).toEqual({
        maxAgents: 1,
        maxSites: 1,
        maxSimultaneousSimulations: 5,
        hasRecording: false,
        hasAdvancedAnalytics: false,
        hasCustomBranding: false,
      });
    });

    it("defines limits for starter plan", () => {
      expect(PLAN_LIMITS.starter).toEqual({
        maxAgents: 3,
        maxSites: 3,
        maxSimultaneousSimulations: 25,
        hasRecording: true,
        hasAdvancedAnalytics: false,
        hasCustomBranding: false,
      });
    });

    it("defines limits for pro plan", () => {
      expect(PLAN_LIMITS.pro).toEqual({
        maxAgents: 10,
        maxSites: 10,
        maxSimultaneousSimulations: 100,
        hasRecording: true,
        hasAdvancedAnalytics: true,
        hasCustomBranding: true,
      });
    });

    it("defines limits for enterprise plan with unlimited values (-1)", () => {
      expect(PLAN_LIMITS.enterprise).toEqual({
        maxAgents: -1,
        maxSites: -1,
        maxSimultaneousSimulations: -1,
        hasRecording: true,
        hasAdvancedAnalytics: true,
        hasCustomBranding: true,
      });
    });
  });

  describe("getPlanLimits", () => {
    it("returns limits for free plan", () => {
      const limits = getPlanLimits("free");
      expect(limits.maxAgents).toBe(1);
      expect(limits.maxSites).toBe(1);
    });

    it("returns limits for starter plan", () => {
      const limits = getPlanLimits("starter");
      expect(limits.maxAgents).toBe(3);
      expect(limits.maxSites).toBe(3);
    });

    it("returns limits for pro plan", () => {
      const limits = getPlanLimits("pro");
      expect(limits.maxAgents).toBe(10);
      expect(limits.maxSites).toBe(10);
    });

    it("returns limits for enterprise plan", () => {
      const limits = getPlanLimits("enterprise");
      expect(limits.maxAgents).toBe(-1);
      expect(limits.maxSites).toBe(-1);
    });
  });

  describe("canAddAgent", () => {
    it("returns true when current count is below limit for free plan", () => {
      expect(canAddAgent("free", 0)).toBe(true);
    });

    it("returns false when current count equals limit for free plan", () => {
      expect(canAddAgent("free", 1)).toBe(false);
    });

    it("returns false when current count exceeds limit for free plan", () => {
      expect(canAddAgent("free", 2)).toBe(false);
    });

    it("returns true when current count is below limit for starter plan", () => {
      expect(canAddAgent("starter", 2)).toBe(true);
    });

    it("returns false when current count equals limit for starter plan", () => {
      expect(canAddAgent("starter", 3)).toBe(false);
    });

    it("returns true when current count is below limit for pro plan", () => {
      expect(canAddAgent("pro", 9)).toBe(true);
    });

    it("returns false when current count equals limit for pro plan", () => {
      expect(canAddAgent("pro", 10)).toBe(false);
    });

    it("returns true for enterprise plan regardless of count (unlimited)", () => {
      expect(canAddAgent("enterprise", 0)).toBe(true);
      expect(canAddAgent("enterprise", 100)).toBe(true);
      expect(canAddAgent("enterprise", 1000)).toBe(true);
    });
  });

  describe("canAddSite", () => {
    it("returns true when current count is below limit for free plan", () => {
      expect(canAddSite("free", 0)).toBe(true);
    });

    it("returns false when current count equals limit for free plan", () => {
      expect(canAddSite("free", 1)).toBe(false);
    });

    it("returns true when current count is below limit for starter plan", () => {
      expect(canAddSite("starter", 2)).toBe(true);
    });

    it("returns false when current count equals limit for starter plan", () => {
      expect(canAddSite("starter", 3)).toBe(false);
    });

    it("returns true when current count is below limit for pro plan", () => {
      expect(canAddSite("pro", 5)).toBe(true);
    });

    it("returns false when current count equals limit for pro plan", () => {
      expect(canAddSite("pro", 10)).toBe(false);
    });

    it("returns true for enterprise plan regardless of count (unlimited)", () => {
      expect(canAddSite("enterprise", 0)).toBe(true);
      expect(canAddSite("enterprise", 500)).toBe(true);
    });
  });

  describe("hasFeature", () => {
    describe("hasRecording feature", () => {
      it("returns false for free plan", () => {
        expect(hasFeature("free", "hasRecording")).toBe(false);
      });

      it("returns true for starter plan", () => {
        expect(hasFeature("starter", "hasRecording")).toBe(true);
      });

      it("returns true for pro plan", () => {
        expect(hasFeature("pro", "hasRecording")).toBe(true);
      });

      it("returns true for enterprise plan", () => {
        expect(hasFeature("enterprise", "hasRecording")).toBe(true);
      });
    });

    describe("hasAdvancedAnalytics feature", () => {
      it("returns false for free plan", () => {
        expect(hasFeature("free", "hasAdvancedAnalytics")).toBe(false);
      });

      it("returns false for starter plan", () => {
        expect(hasFeature("starter", "hasAdvancedAnalytics")).toBe(false);
      });

      it("returns true for pro plan", () => {
        expect(hasFeature("pro", "hasAdvancedAnalytics")).toBe(true);
      });

      it("returns true for enterprise plan", () => {
        expect(hasFeature("enterprise", "hasAdvancedAnalytics")).toBe(true);
      });
    });

    describe("hasCustomBranding feature", () => {
      it("returns false for free plan", () => {
        expect(hasFeature("free", "hasCustomBranding")).toBe(false);
      });

      it("returns false for starter plan", () => {
        expect(hasFeature("starter", "hasCustomBranding")).toBe(false);
      });

      it("returns true for pro plan", () => {
        expect(hasFeature("pro", "hasCustomBranding")).toBe(true);
      });

      it("returns true for enterprise plan", () => {
        expect(hasFeature("enterprise", "hasCustomBranding")).toBe(true);
      });
    });
  });

  describe("getRemainingAgentSlots", () => {
    it("returns remaining slots for free plan", () => {
      expect(getRemainingAgentSlots("free", 0)).toBe(1);
      expect(getRemainingAgentSlots("free", 1)).toBe(0);
    });

    it("returns remaining slots for starter plan", () => {
      expect(getRemainingAgentSlots("starter", 0)).toBe(3);
      expect(getRemainingAgentSlots("starter", 2)).toBe(1);
      expect(getRemainingAgentSlots("starter", 3)).toBe(0);
    });

    it("returns remaining slots for pro plan", () => {
      expect(getRemainingAgentSlots("pro", 5)).toBe(5);
      expect(getRemainingAgentSlots("pro", 10)).toBe(0);
    });

    it("returns 0 when current count exceeds limit", () => {
      expect(getRemainingAgentSlots("free", 5)).toBe(0);
      expect(getRemainingAgentSlots("starter", 10)).toBe(0);
    });

    it("returns -1 for enterprise plan (unlimited)", () => {
      expect(getRemainingAgentSlots("enterprise", 0)).toBe(-1);
      expect(getRemainingAgentSlots("enterprise", 100)).toBe(-1);
    });
  });

  describe("getRemainingSiteSlots", () => {
    it("returns remaining slots for free plan", () => {
      expect(getRemainingSiteSlots("free", 0)).toBe(1);
      expect(getRemainingSiteSlots("free", 1)).toBe(0);
    });

    it("returns remaining slots for starter plan", () => {
      expect(getRemainingSiteSlots("starter", 0)).toBe(3);
      expect(getRemainingSiteSlots("starter", 2)).toBe(1);
    });

    it("returns remaining slots for pro plan", () => {
      expect(getRemainingSiteSlots("pro", 3)).toBe(7);
      expect(getRemainingSiteSlots("pro", 10)).toBe(0);
    });

    it("returns 0 when current count exceeds limit", () => {
      expect(getRemainingSiteSlots("free", 5)).toBe(0);
    });

    it("returns -1 for enterprise plan (unlimited)", () => {
      expect(getRemainingSiteSlots("enterprise", 0)).toBe(-1);
      expect(getRemainingSiteSlots("enterprise", 200)).toBe(-1);
    });
  });

  describe("formatLimitDisplay", () => {
    it("formats as current / max for normal limits", () => {
      expect(formatLimitDisplay(0, 1)).toBe("0 / 1");
      expect(formatLimitDisplay(2, 5)).toBe("2 / 5");
      expect(formatLimitDisplay(10, 10)).toBe("10 / 10");
    });

    it("formats as current / Unlimited when max is -1", () => {
      expect(formatLimitDisplay(0, -1)).toBe("0 / Unlimited");
      expect(formatLimitDisplay(50, -1)).toBe("50 / Unlimited");
      expect(formatLimitDisplay(999, -1)).toBe("999 / Unlimited");
    });
  });

  describe("getUpgradeMessage", () => {
    it("returns upgrade message for agents limit", () => {
      expect(getUpgradeMessage("agents")).toBe(
        "You've reached your plan's agents limit. Upgrade to add more agents."
      );
    });

    it("returns upgrade message for sites limit", () => {
      expect(getUpgradeMessage("sites")).toBe(
        "You've reached your plan's sites limit. Upgrade to add more sites."
      );
    });
  });
});






