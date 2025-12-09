/**
 * run-qa-agent.sh Test
 *
 * Tests the QA agent runner script template generation for TKT-007.
 *
 * Behaviors Tested:
 * 1. Script includes blocker JSON template in prompt
 * 2. Script instructs to create BOTH blocker JSON and report MD on failure
 * 3. Script has correct blocker JSON structure with required fields
 * 4. Script includes dispatch_action field for automation
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("run-qa-agent.sh", () => {
  const scriptPath = join(__dirname, "../../../scripts/run-qa-agent.sh");
  const scriptContent = readFileSync(scriptPath, "utf-8");

  describe("Blocker JSON Template", () => {
    it("includes blocker JSON template in the prompt", () => {
      expect(scriptContent).toContain("## If FAILED - Blocker JSON Template:");
      // In bash strings, quotes are escaped with backslashes
      expect(scriptContent).toContain('dispatch_action');
      expect(scriptContent).toContain('create_continuation_ticket');
    });

    it("includes all required blocker JSON fields", () => {
      // Check for ticket_id field (content is escaped in bash string)
      expect(scriptContent).toContain('ticket_id');
      expect(scriptContent).toContain('$TICKET_UPPER');

      // Check for ticket_title field
      expect(scriptContent).toContain('ticket_title');
      expect(scriptContent).toContain('$TITLE');

      // Check for branch field
      expect(scriptContent).toContain('branch');
      expect(scriptContent).toContain('$BRANCH');

      // Check for blocked_at field
      expect(scriptContent).toContain('blocked_at');
      expect(scriptContent).toContain('ISO timestamp');

      // Check for blocker_type field
      expect(scriptContent).toContain('blocker_type');
      expect(scriptContent).toContain('qa_failure');

      // Check for summary field
      expect(scriptContent).toContain('summary');
      expect(scriptContent).toContain('One-line summary of failure');

      // Check for failures array
      expect(scriptContent).toContain('failures');

      // Check for recommendation field
      expect(scriptContent).toContain('recommendation');
      expect(scriptContent).toContain('What needs to be fixed');

      // Check for dispatch_action field
      expect(scriptContent).toContain('dispatch_action');
      expect(scriptContent).toContain('create_continuation_ticket');
    });

    it("includes failure category options in template", () => {
      expect(scriptContent).toContain('category');
      expect(scriptContent).toMatch(/build\|acceptance\|regression\|browser/);
    });

    it("includes error and check fields in failures array", () => {
      expect(scriptContent).toContain('check');
      expect(scriptContent).toContain('Which check failed');
      expect(scriptContent).toContain('error');
      expect(scriptContent).toContain('Error message');
    });
  });

  describe("Failure Output Instructions", () => {
    it("instructs QA agent to create BOTH blocker JSON and report MD on failure", () => {
      expect(scriptContent).toContain("If FAIL - Create BOTH files");
    });

    it("specifies blocker JSON path with correct pattern", () => {
      expect(scriptContent).toMatch(/Blocker JSON:.*docs\/agent-output\/blocked\/QA-.*-FAILED-.*\.json/);
    });

    it("specifies report MD path with correct pattern", () => {
      expect(scriptContent).toMatch(/Report MD:.*QA-.*-FAILED-.*\.md/);
    });

    it("includes BOTH files requirement before step 6", () => {
      // Find the "If FAIL" instruction and verify it comes before step 6
      const ifFailIndex = scriptContent.indexOf("If FAIL - Create BOTH files");
      const step6Index = scriptContent.indexOf("6. **DO NOT modify any files");

      expect(ifFailIndex).toBeGreaterThan(0);
      expect(step6Index).toBeGreaterThan(0);
      expect(ifFailIndex).toBeLessThan(step6Index);
    });
  });

  describe("Pass Instructions", () => {
    it("instructs to write report only on pass (not blocker JSON)", () => {
      expect(scriptContent).toContain("If PASS - Write report to MAIN REPO");
    });

    it("includes merge command instructions for passed tests", () => {
      expect(scriptContent).toContain("If tests PASS, include this merge command");
      expect(scriptContent).toContain("git checkout origin/$BRANCH -- $FILES_TO_MODIFY");
    });
  });

  describe("Script Structure", () => {
    it("has proper shebang for bash execution", () => {
      expect(scriptContent.startsWith("#!/bin/bash")).toBe(true);
    });

    it("includes worktree setup instructions", () => {
      expect(scriptContent).toContain("WORKTREE_DIR");
      expect(scriptContent).toContain("agent-worktrees");
    });

    it("includes build verification commands", () => {
      expect(scriptContent).toContain("pnpm install");
      expect(scriptContent).toContain("pnpm typecheck");
      expect(scriptContent).toContain("pnpm build");
      expect(scriptContent).toContain("pnpm test");
    });
  });

  describe("Variable Interpolation", () => {
    it("uses bash variables for ticket information", () => {
      expect(scriptContent).toMatch(/\$\{?TICKET_UPPER\}?/);
      expect(scriptContent).toMatch(/\$\{?TITLE\}?/);
      expect(scriptContent).toMatch(/\$\{?BRANCH\}?/);
    });

    it("uses bash variables for paths", () => {
      expect(scriptContent).toMatch(/\$\{?MAIN_REPO\}?/);
      expect(scriptContent).toMatch(/\$\{?WORKTREE_DIR\}?/);
      expect(scriptContent).toMatch(/\$\{?QA_RESULTS_DIR\}?/);
    });
  });
});
