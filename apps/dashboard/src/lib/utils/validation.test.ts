import { describe, it, expect } from "vitest";
import {
  VALIDATION,
  validateNumber,
  clampToValidRange,
  parseAndValidateInput,
} from "./validation";

/**
 * Validation Utilities Tests
 *
 * Test Lock D3: Tiered Routing - Priority Rank Validation
 *
 * Captures current behavior for:
 * 1. validateNumber - Validates numeric values against min/max constraints
 * 2. clampToValidRange - Clamps values to valid range
 * 3. parseAndValidateInput - Parses string input and validates
 *
 * Priority rank validation (1-99) is used for tiered agent routing.
 */

describe("validation.ts", () => {
  // ---------------------------------------------------------------------------
  // VALIDATION CONSTANTS
  // ---------------------------------------------------------------------------

  describe("VALIDATION constants", () => {
    it("defines priority_rank with min 1 and max 99", () => {
      expect(VALIDATION.priority_rank.min).toBe(1);
      expect(VALIDATION.priority_rank.max).toBe(99);
    });

    it("priority_rank has correct label", () => {
      expect(VALIDATION.priority_rank.label).toBe("Priority rank");
    });

    it("priority_rank has empty unit string", () => {
      expect(VALIDATION.priority_rank.unit).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // validateNumber - PRIORITY_RANK
  // ---------------------------------------------------------------------------

  describe("validateNumber - priority_rank", () => {
    describe("Valid values", () => {
      it("returns null for minimum value (1)", () => {
        const result = validateNumber(1, "priority_rank");
        expect(result).toBeNull();
      });

      it("returns null for maximum value (99)", () => {
        const result = validateNumber(99, "priority_rank");
        expect(result).toBeNull();
      });

      it("returns null for mid-range value (50)", () => {
        const result = validateNumber(50, "priority_rank");
        expect(result).toBeNull();
      });

      it("returns null for primary tier value (1)", () => {
        const result = validateNumber(1, "priority_rank");
        expect(result).toBeNull();
      });

      it("returns null for standard tier value (2)", () => {
        const result = validateNumber(2, "priority_rank");
        expect(result).toBeNull();
      });

      it("returns null for backup tier value (3)", () => {
        const result = validateNumber(3, "priority_rank");
        expect(result).toBeNull();
      });
    });

    describe("Invalid values - Below minimum", () => {
      it("returns error for 0 (below min of 1)", () => {
        const result = validateNumber(0, "priority_rank");
        expect(result).toBe("Priority rank must be at least 1");
      });

      it("returns error for negative numbers", () => {
        const result = validateNumber(-1, "priority_rank");
        expect(result).toBe("Priority rank must be at least 1");
      });

      it("returns error for large negative numbers", () => {
        const result = validateNumber(-100, "priority_rank");
        expect(result).toBe("Priority rank must be at least 1");
      });
    });

    describe("Invalid values - Above maximum", () => {
      it("returns error for 100 (above max of 99)", () => {
        const result = validateNumber(100, "priority_rank");
        expect(result).toBe("Priority rank must be at most 99");
      });

      it("returns error for large numbers", () => {
        const result = validateNumber(1000, "priority_rank");
        expect(result).toBe("Priority rank must be at most 99");
      });
    });

    describe("Invalid values - Non-integers", () => {
      it("returns error for decimal values", () => {
        const result = validateNumber(1.5, "priority_rank");
        expect(result).toBe("Priority rank must be a whole number");
      });

      it("returns error for float values", () => {
        const result = validateNumber(2.9, "priority_rank");
        expect(result).toBe("Priority rank must be a whole number");
      });
    });

    describe("Invalid values - Null/undefined", () => {
      it("returns error for null", () => {
        const result = validateNumber(null, "priority_rank");
        expect(result).toBe("Priority rank is required");
      });

      it("returns error for undefined", () => {
        const result = validateNumber(undefined, "priority_rank");
        expect(result).toBe("Priority rank is required");
      });
    });

    describe("Invalid values - NaN", () => {
      it("returns error for NaN", () => {
        const result = validateNumber(NaN, "priority_rank");
        expect(result).toBe("Priority rank must be a valid number");
      });
    });
  });

  // ---------------------------------------------------------------------------
  // clampToValidRange - PRIORITY_RANK
  // ---------------------------------------------------------------------------

  describe("clampToValidRange - priority_rank", () => {
    it("returns min (1) for null", () => {
      const result = clampToValidRange(null, "priority_rank");
      expect(result).toBe(1);
    });

    it("returns min (1) for undefined", () => {
      const result = clampToValidRange(undefined, "priority_rank");
      expect(result).toBe(1);
    });

    it("returns min (1) for NaN", () => {
      const result = clampToValidRange(NaN, "priority_rank");
      expect(result).toBe(1);
    });

    it("clamps values below min to 1", () => {
      const result = clampToValidRange(0, "priority_rank");
      expect(result).toBe(1);
    });

    it("clamps negative values to 1", () => {
      const result = clampToValidRange(-5, "priority_rank");
      expect(result).toBe(1);
    });

    it("clamps values above max to 99", () => {
      const result = clampToValidRange(100, "priority_rank");
      expect(result).toBe(99);
    });

    it("clamps large values to 99", () => {
      const result = clampToValidRange(1000, "priority_rank");
      expect(result).toBe(99);
    });

    it("rounds decimal values and clamps", () => {
      const result = clampToValidRange(1.6, "priority_rank");
      expect(result).toBe(2);
    });

    it("returns valid values unchanged", () => {
      expect(clampToValidRange(1, "priority_rank")).toBe(1);
      expect(clampToValidRange(50, "priority_rank")).toBe(50);
      expect(clampToValidRange(99, "priority_rank")).toBe(99);
    });
  });

  // ---------------------------------------------------------------------------
  // parseAndValidateInput - PRIORITY_RANK
  // ---------------------------------------------------------------------------

  describe("parseAndValidateInput - priority_rank", () => {
    describe("Valid string inputs", () => {
      it("parses and validates '1' as valid", () => {
        const result = parseAndValidateInput("1", "priority_rank");
        expect(result.value).toBe(1);
        expect(result.error).toBeNull();
      });

      it("parses and validates '99' as valid", () => {
        const result = parseAndValidateInput("99", "priority_rank");
        expect(result.value).toBe(99);
        expect(result.error).toBeNull();
      });

      it("parses and validates '3' (backup tier) as valid", () => {
        const result = parseAndValidateInput("3", "priority_rank");
        expect(result.value).toBe(3);
        expect(result.error).toBeNull();
      });
    });

    describe("Invalid string inputs - Out of range", () => {
      it("returns error for '0'", () => {
        const result = parseAndValidateInput("0", "priority_rank");
        expect(result.value).toBeNull();
        expect(result.error).toBe("Priority rank must be at least 1");
      });

      it("returns error for '100'", () => {
        const result = parseAndValidateInput("100", "priority_rank");
        expect(result.value).toBeNull();
        expect(result.error).toBe("Priority rank must be at most 99");
      });

      it("returns error for negative string '-1'", () => {
        const result = parseAndValidateInput("-1", "priority_rank");
        expect(result.value).toBeNull();
        expect(result.error).toBe("Priority rank must be at least 1");
      });
    });

    describe("Invalid string inputs - Non-numeric", () => {
      it("returns error for non-numeric string 'abc'", () => {
        const result = parseAndValidateInput("abc", "priority_rank");
        expect(result.value).toBeNull();
        expect(result.error).toBe("Priority rank must be a valid number");
      });

      it("returns error for empty string", () => {
        const result = parseAndValidateInput("", "priority_rank");
        expect(result.value).toBeNull();
        expect(result.error).toBe("Priority rank is required");
      });
    });

    describe("Edge cases", () => {
      it("parses string with leading zeros '01' as 1", () => {
        const result = parseAndValidateInput("01", "priority_rank");
        expect(result.value).toBe(1);
        expect(result.error).toBeNull();
      });

      it("handles string with whitespace (parseInt behavior)", () => {
        // parseInt("  5  ", 10) returns 5
        const result = parseAndValidateInput("  5  ", "priority_rank");
        expect(result.value).toBe(5);
        expect(result.error).toBeNull();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // validateNumber - OTHER FIELDS (Regression tests)
  // ---------------------------------------------------------------------------

  describe("validateNumber - trigger_delay (regression)", () => {
    it("validates trigger_delay range (0-300)", () => {
      expect(validateNumber(0, "trigger_delay")).toBeNull();
      expect(validateNumber(300, "trigger_delay")).toBeNull();
      expect(validateNumber(-1, "trigger_delay")).toBe("Trigger delay must be at least 0 seconds");
      expect(validateNumber(301, "trigger_delay")).toBe("Trigger delay must be at most 300 seconds");
    });
  });

  describe("validateNumber - max_simultaneous_simulations (regression)", () => {
    it("validates max_simultaneous_simulations range (1-100)", () => {
      expect(validateNumber(1, "max_simultaneous_simulations")).toBeNull();
      expect(validateNumber(100, "max_simultaneous_simulations")).toBeNull();
      expect(validateNumber(0, "max_simultaneous_simulations")).toBe("Max simultaneous visitors must be at least 1 visitors");
      expect(validateNumber(101, "max_simultaneous_simulations")).toBe("Max simultaneous visitors must be at most 100 visitors");
    });
  });
});





