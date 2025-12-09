/**
 * QA_REVIEW_AGENT_SOP.md Test
 *
 * Tests that the QA Review Agent SOP documentation includes critical
 * instructions for creating blocker JSON files on failure (TKT-007).
 *
 * Behaviors Tested:
 * 1. SOP includes critical warning about creating BOTH files on failure
 * 2. SOP documents blocker JSON structure with required fields
 * 3. SOP includes instructions for both pass and fail scenarios
 * 4. SOP specifies correct file paths for outputs
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("QA_REVIEW_AGENT_SOP.md", () => {
  const sopPath = join(__dirname, "../../../docs/workflow/QA_REVIEW_AGENT_SOP.md");
  const sopContent = readFileSync(sopPath, "utf-8");

  describe("Blocker Instructions", () => {
    it("includes CRITICAL warning about creating BOTH files on failure", () => {
      expect(sopContent).toContain("CRITICAL");
      expect(sopContent).toContain("BOTH files");
    });

    it("explicitly states blocker JSON is required", () => {
      expect(sopContent).toMatch(/blocker JSON.*required/i);
    });

    it("explains purpose of blocker JSON for Dispatch Agent", () => {
      expect(sopContent).toMatch(/Dispatch Agent.*auto-create.*continuation ticket/i);
    });

    it("numbers the two required files (1. and 2.)", () => {
      expect(sopContent).toMatch(/\*\*1\.\s*Create blocker JSON/);
      expect(sopContent).toMatch(/\*\*2\.\s*Create.*report/);
    });
  });

  describe("Blocker JSON Structure", () => {
    it("documents blocker JSON file path pattern", () => {
      expect(sopContent).toMatch(/docs\/agent-output\/blocked\/QA-.*FAILED.*\.json/);
    });

    it("includes blocker JSON template with ticket_id field", () => {
      expect(sopContent).toContain('"ticket_id"');
    });

    it("includes blocker JSON template with ticket_title field", () => {
      expect(sopContent).toContain('"ticket_title"');
    });

    it("includes blocker JSON template with branch field", () => {
      expect(sopContent).toContain('"branch"');
    });

    it("includes blocker JSON template with blocked_at field", () => {
      expect(sopContent).toContain('"blocked_at"');
    });

    it("includes blocker JSON template with blocker_type field", () => {
      expect(sopContent).toContain('"blocker_type"');
      expect(sopContent).toContain('"qa_failure"');
    });

    it("includes blocker JSON template with summary field", () => {
      expect(sopContent).toContain('"summary"');
    });

    it("includes blocker JSON template with failures array", () => {
      expect(sopContent).toContain('"failures"');
    });

    it("includes blocker JSON template with recommendation field", () => {
      expect(sopContent).toContain('"recommendation"');
    });

    it("includes blocker JSON template with dispatch_action field", () => {
      expect(sopContent).toContain('"dispatch_action"');
      expect(sopContent).toContain('"create_continuation_ticket"');
    });

    it("documents failure category options", () => {
      expect(sopContent).toContain('"category"');
      expect(sopContent).toMatch(/build.*acceptance.*regression.*browser/i);
    });
  });

  describe("Human-Readable Report", () => {
    it("documents human-readable report as second file", () => {
      expect(sopContent).toMatch(/Create.*human-readable report/i);
    });

    it("specifies report file path pattern", () => {
      expect(sopContent).toMatch(/docs\/agent-output\/qa-results\/QA-.*FAILED.*\.md/);
    });
  });

  describe("Pass Scenario", () => {
    it("documents pass scenario output", () => {
      expect(sopContent).toMatch(/If.*PASS/i);
      expect(sopContent).toMatch(/docs\/agent-output\/qa-results\/QA-.*PASSED.*\.md/);
    });

    it("does not require blocker JSON for pass scenario", () => {
      // Find pass section and verify it doesn't mention blocker JSON
      const passSectionMatch = sopContent.match(/#### If PASSED:[\s\S]*?(?=####|$)/);
      if (passSectionMatch) {
        const passSection = passSectionMatch[0];
        expect(passSection).not.toContain("blocker");
      }
    });
  });

  describe("File Structure", () => {
    it("is a markdown file with proper heading structure", () => {
      expect(sopContent).toMatch(/^#\s+QA.*Agent.*SOP/m);
    });

    it("includes section about output files", () => {
      expect(sopContent).toMatch(/##.*Output/i);
    });

    it("includes blocked scenario section", () => {
      expect(sopContent).toMatch(/####.*BLOCKED/i);
    });
  });

  describe("Ordering and Emphasis", () => {
    it("places blocker JSON before human-readable report in fail scenario", () => {
      const blockerJsonIndex = sopContent.indexOf("**1. Create blocker JSON");
      const reportIndex = sopContent.indexOf("**2. Create");
      const humanReadableIndex = sopContent.indexOf("human-readable report");

      expect(blockerJsonIndex).toBeGreaterThan(0);
      expect(reportIndex).toBeGreaterThan(0);
      expect(humanReadableIndex).toBeGreaterThan(0);
      expect(reportIndex).toBeGreaterThan(blockerJsonIndex);
      expect(humanReadableIndex).toBeGreaterThan(blockerJsonIndex);
    });

    it("uses emphasis markers for critical section", () => {
      // Check for CRITICAL markup (uses heading with emoji, not blockquote)
      expect(sopContent).toContain("⚠️ CRITICAL");
      expect(sopContent).toMatch(/##.*CRITICAL.*Output File Requirements/i);
    });
  });

  describe("Completeness", () => {
    it("includes build verification checklist", () => {
      expect(sopContent).toContain("pnpm install");
      expect(sopContent).toContain("pnpm typecheck");
      expect(sopContent).toContain("pnpm build");
      expect(sopContent).toContain("pnpm test");
    });

    it("includes acceptance criteria section", () => {
      expect(sopContent).toMatch(/acceptance.*criteria/i);
    });

    it("includes browser testing requirements", () => {
      expect(sopContent).toMatch(/browser.*test/i);
    });

    it("includes screenshot requirements", () => {
      expect(sopContent).toContain("screenshot");
    });
  });
});
