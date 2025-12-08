# QA Review Agent Prompt Template

> **Instructions for PM/Dispatch:** Copy this template to `docs/prompts/active/qa-review-[TICKET-ID].md` and fill in the bracketed sections.

---

## ⚠️ CRITICAL: Where to Write Your Output

**You MUST write to these EXACT paths in the MAIN repo (not the worktree):**

### If PASSED ✅
```
docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED-[timestamp].md
```

### If FAILED ❌ (Write BOTH files!)
```
docs/agent-output/blocked/QA-[TICKET-ID]-FAILED-[timestamp].json   ← Required for Dispatch
docs/agent-output/qa-results/QA-[TICKET-ID]-FAILED-[timestamp].md  ← Human-readable
```

**❌ DO NOT write to:** `reviews/`, `findings/`, or worktree paths.

---

## Ticket to Review

- **Ticket ID:** [e.g., TKT-001]
- **Ticket Title:** [e.g., Co-Browse Sensitive Data Sanitization]
- **Branch:** `[e.g., agent/TKT-001-cobrowse-sanitization]`
- **Priority:** [critical/high/medium/low]

---

## Ticket Spec Summary

### Issue
[Copy from tickets.json - what problem was being fixed]

### Fix Required
[Copy from tickets.json - what the dev was supposed to do]

### Files Modified
[Copy from tickets.json - files_to_modify]
- `[path/to/file1.ts]`
- `[path/to/file2.ts]`

### Out of Scope
[Copy from tickets.json - what should NOT have been touched]
- [item 1]
- [item 2]

---

## Acceptance Criteria to Verify

[Copy from tickets.json - acceptance_criteria]

1. [ ] [AC1]
2. [ ] [AC2]
3. [ ] [AC3]
4. [ ] [AC4]
5. [ ] [AC5]

---

## Dev Checks (Already Completed by Dev)

[Copy from tickets.json - dev_checks]
- [ ] [Check 1]
- [ ] [Check 2]

---

## QA Notes

[Copy from tickets.json - qa_notes]

---

## Testing Environment

- **Local URL:** http://localhost:3000
- **Test Account:** [if needed, reference .agent-credentials.json]
- **Prerequisites:** 
  - [ ] `pnpm install` completed
  - [ ] Development server running (if browser tests needed)

---

## Browser Tests Required?

[Based on ticket type, specify if browser testing is needed]

- [ ] Yes - UI changes that need visual verification
- [ ] No - Backend/API only changes

If yes, key flows to test:
1. [Flow 1 description]
2. [Flow 2 description]

---

## Screenshot Verification (REQUIRED for UI changes)

**Screenshot Directory:** `docs/agent-output/qa-results/screenshots/[TICKET-ID]/`

Screenshots to capture:
1. [ ] **Before (main):** Baseline from main branch
2. [ ] **After (feature):** Result after feature changes
3. [ ] **Key states:** Modal open, hover states, error states
4. [ ] **Different viewports:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)

Use Playwright MCP:
```typescript
mcp__playwright__browser_take_screenshot({ 
  path: "docs/agent-output/qa-results/screenshots/[TICKET-ID]/01-before.png",
  fullPage: true 
})
```

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch specified above
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing if applicable
6. Make PASS/FAIL decision
7. Write appropriate report to `docs/agent-output/qa-results/`
8. If FAILED, also write blocker to `docs/agent-output/blocked/`

---

## Launch Command

```
You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute: docs/prompts/active/qa-review-[TICKET-ID].md
```

---

## Expected Outputs

### If PASSED:
- `docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED-[timestamp].md`
- Ticket ready for merge to main

### If FAILED:
- `docs/agent-output/qa-results/QA-[TICKET-ID]-FAILED-[timestamp].md`
- `docs/agent-output/blocked/QA-[TICKET-ID]-FAILED-[timestamp].json`
- Ticket sent to dispatch for continuation

