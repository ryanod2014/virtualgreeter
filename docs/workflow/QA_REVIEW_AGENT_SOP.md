# QA Review Agent SOP (Standard Operating Procedure)

> **Purpose:** Automated testing and validation of tickets in "needs review" status before merging to main.
> **Environment:** Claude Code with Playwright MCP for browser testing
> **One-liner to launch:** `You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute: docs/prompts/active/qa-review-[TICKET-ID].md`

---

## 🎯 Your Mission

Test tickets that dev agents have completed and are awaiting review. Your job is to:

1. **Verify the implementation** works as specified
2. **Run all available tests** (build, lint, typecheck, unit tests, browser tests)
3. **Make a decision:**
   - ✅ **PASS** → Push to main
   - ❌ **FAIL** → Send to blocked for dispatch to create continuation ticket

---

## Quick Reference

| File | Purpose |
|------|---------|
| `docs/data/tickets.json` | Source of truth for ticket specs |
| `docs/data/dev-status.json` | Tracks completed dev work ready for review |
| `docs/agent-output/blocked/` | Where you report failures |
| `docs/prompts/active/qa-review-*.md` | Your assignment prompts |

---

## Prerequisites: Playwright MCP Setup

Before you can do browser testing, ensure Playwright MCP is configured.

### Install Playwright MCP (One-Time Setup)

```bash
# Install globally
npm install -g @playwright/mcp@latest

# Or use npx (no install needed)
npx @playwright/mcp@latest
```

### Claude Code MCP Configuration

Add to your MCP configuration (`~/.config/claude-code/mcp.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
```

### Available Playwright MCP Tools

Once configured, you'll have access to:

| Tool | Purpose |
|------|---------|
| `playwright_navigate` | Go to a URL |
| `playwright_screenshot` | Take a screenshot |
| `playwright_click` | Click an element |
| `playwright_fill` | Type into an input |
| `playwright_select` | Select dropdown option |
| `playwright_evaluate` | Run JavaScript on page |
| `playwright_get_text` | Get text content |
| `playwright_wait` | Wait for element/condition |
| `playwright_expect` | Assert on page state |

---

## Process (6 Steps)

### Step 0: Signal Start (REQUIRED)

**Create file:** `docs/agent-output/started/QA-[TICKET-ID]-[timestamp].json`

```json
{
  "agent_type": "qa-review",
  "ticket_id": "[TICKET-ID]",
  "started_at": "[ISO timestamp]",
  "branch": "[branch-name]",
  "status": "in_progress"
}
```

---

### Step 1: Get Ticket Context

#### 1.1 Read the Ticket Spec

```bash
# Find the ticket in tickets.json
cat docs/data/tickets.json | jq '.tickets[] | select(.id == "[TICKET-ID]")'
```

Extract and understand:
- **issue:** What problem was being fixed
- **fix_required:** What the dev was supposed to do
- **acceptance_criteria:** What must be true for this to pass
- **dev_checks:** What the dev should have already verified
- **qa_notes:** Special testing instructions

#### 1.2 Read the Dev Completion Report

```bash
cat docs/agent-output/completions/[TICKET-ID]-*.md
```

Understand:
- What the dev agent actually did
- Any deviations from spec
- Any concerns they raised

#### 1.3 Checkout the Branch

```bash
git fetch origin
git checkout [branch-name]
git pull origin [branch-name]
```

---

### Step 2: Generate Test Checklist

Create a comprehensive checklist based on ticket + your tools:

```markdown
## QA Checklist: [TICKET-ID]

### Build Verification
- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes  
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes

### Acceptance Criteria
[Generate from ticket acceptance_criteria]
- [ ] [AC1]
- [ ] [AC2]
- [ ] [AC3]

### Code Review Checks
- [ ] Changes are within `files_to_modify` scope
- [ ] No changes to out_of_scope files
- [ ] Code follows existing patterns
- [ ] No obvious security issues
- [ ] No hardcoded values that should be configurable

### Browser Tests (if UI changes)
- [ ] Feature renders correctly
- [ ] User interactions work as expected
- [ ] No console errors
- [ ] Responsive on different viewports
- [ ] Accessibility basics (keyboard nav, aria labels)

### Screenshot Verification (REQUIRED for UI changes)
- [ ] Take BEFORE screenshot (on main branch or previous state)
- [ ] Take AFTER screenshot (on feature branch)
- [ ] Save screenshots to `docs/agent-output/qa-results/screenshots/`
- [ ] Include screenshot paths in QA report
- [ ] Visual diff confirms expected changes only

### Integration Checks
- [ ] API calls work correctly
- [ ] Database state is correct after operations
- [ ] Webhooks trigger correctly (if applicable)

### Regression Checks
- [ ] Existing related functionality still works
- [ ] No new console warnings/errors
```

---

### Step 3: Execute Build Verification

These tests MUST pass. Any failure = immediate BLOCKED status.

```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck
# Expected: 0 errors

# Linting
pnpm lint
# Expected: 0 errors

# Build
pnpm build
# Expected: Successful build

# Unit tests
pnpm test
# Expected: All tests pass
```

**If ANY of these fail:**
→ Go to Step 6: Report BLOCKED

---

### Step 4: Execute Acceptance Criteria Tests

For each acceptance criterion in the ticket, verify it's satisfied.

#### 4.1 Code Inspection Tests

Some criteria can be verified by reading the code:

```bash
# Check if function was added
grep -n "maskSensitiveFields" apps/widget/src/features/cobrowse/domSerializer.ts

# Check if test file exists
ls apps/widget/src/features/cobrowse/domSerializer.test.ts

# Check specific implementation
cat apps/widget/src/features/cobrowse/domSerializer.ts | grep -A 20 "maskSensitiveFields"
```

#### 4.2 Browser Tests (UI Features)

Use Playwright MCP for interactive testing:

```typescript
// Navigate to the page
playwright_navigate({ url: "http://localhost:3000/dashboard" })

// Take a screenshot for visual verification
playwright_screenshot({ path: "before-action.png" })

// Interact with elements
playwright_click({ selector: "button[data-testid='cancel-button']" })

// Verify modal appears
playwright_wait({ selector: ".modal", state: "visible" })

// Check text content
playwright_get_text({ selector: ".modal-body" })

// Verify expected text
playwright_expect({ selector: ".modal-body", text: "data will be retained" })

// Fill form inputs
playwright_fill({ selector: "input[name='confirmText']", value: "DELETE" })

// Check button becomes enabled
playwright_expect({ selector: "button[type='submit']", enabled: true })
```

#### 4.3 API Tests

For API changes, test the endpoints:

```bash
# Start the server if not running
pnpm dev &

# Test API endpoint
curl -X POST http://localhost:3000/api/billing/seats \
  -H "Content-Type: application/json" \
  -d '{"seats": 100}' \
  | jq

# Expected: 400 error with message "Maximum seat limit is 50"
```

#### 4.4 Database Tests

For database changes:

```bash
# Connect to Supabase (use credentials from .agent-credentials.json)
# Verify schema changes, data integrity, etc.
```

---

### Step 5: Make Decision

Based on your testing:

#### All Tests Pass → APPROVED

1. Create passing QA report
2. Merge to main (if you have permissions) OR mark for human merge
3. Archive agent files
4. Update ticket status

#### Any Test Fails → BLOCKED

1. Document exactly what failed
2. Create blocker file for dispatch
3. Do NOT merge

---

### Step 6: Report Results

#### If APPROVED:

**Create file:** `docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED-[timestamp].md`

```markdown
# QA Report: [TICKET-ID] - PASSED ✅

**Ticket:** [TICKET-ID] - [Title]
**Branch:** [branch-name]
**Tested At:** [ISO timestamp]
**QA Agent:** qa-review-[TICKET-ID]

---

## Summary

All acceptance criteria verified. Ready for merge to main.

---

## Build Verification

| Check | Status | Notes |
|-------|--------|-------|
| pnpm install | ✅ PASS | |
| pnpm typecheck | ✅ PASS | |
| pnpm lint | ✅ PASS | |
| pnpm build | ✅ PASS | |
| pnpm test | ✅ PASS | X tests passed |

---

## Acceptance Criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | [AC1] | ✅ VERIFIED | [How you verified] |
| 2 | [AC2] | ✅ VERIFIED | [How you verified] |
| 3 | [AC3] | ✅ VERIFIED | [How you verified] |

---

## Additional Tests Performed

- [List any additional tests you ran]
- [Browser tests, manual verification, etc.]

---

## Screenshots (REQUIRED for UI changes)

| Screenshot | Description | Path |
|------------|-------------|------|
| Before (main) | Baseline state | `screenshots/[TICKET-ID]/01-before-main.png` |
| After (feature) | Feature changes | `screenshots/[TICKET-ID]/02-after-feature.png` |
| [State/Component] | [Description] | `screenshots/[TICKET-ID]/03-xxx.png` |

**Visual Diff Summary:**
- ✅ Expected change: [What changed as intended]
- ✅ No unintended visual regressions detected

---

## Recommendation

**APPROVE FOR MERGE**

```bash
# Merge command (for human to execute):
git checkout main
git pull origin main
git merge --squash [branch-name]
git commit -m "feat([scope]): [TICKET-ID] - [Title]"
git push origin main
```
```

**Then update ticket status:**

```bash
# Update tickets.json status to "done"
# Move from "needs_review" to "done"
```

#### If BLOCKED:

> **CRITICAL:** You MUST create BOTH files below. The blocker JSON is required for the Dispatch Agent to auto-create continuation tickets.

**1. Create blocker JSON (for Dispatch Agent):**

**File:** `docs/agent-output/blocked/QA-[TICKET-ID]-FAILED-[timestamp].json`

```json
{
  "ticket_id": "[TICKET-ID]",
  "ticket_title": "[Title]",
  "branch": "[branch-name]",
  "blocked_at": "[ISO timestamp]",
  "blocker_type": "qa_failure",
  "summary": "[One-line summary of failure]",
  "failures": [
    {
      "category": "build|acceptance|regression|browser",
      "criterion": "[Which criterion failed]",
      "expected": "[What should have happened]",
      "actual": "[What actually happened]",
      "evidence": "[Console output, screenshot path, etc.]"
    }
  ],
  "recommendation": "[What needs to be fixed]",
  "dispatch_action": "create_continuation_ticket"
}
```

**2. Create human-readable report (for human review):**

**File:** `docs/agent-output/qa-results/QA-[TICKET-ID]-FAILED-[timestamp].md`

```markdown
# QA Report: [TICKET-ID] - FAILED ❌

**Ticket:** [TICKET-ID] - [Title]
**Branch:** [branch-name]
**Tested At:** [ISO timestamp]
**QA Agent:** qa-review-[TICKET-ID]

---

## Summary

**BLOCKED** - [One-line summary of failure]

---

## Build Verification

| Check | Status | Notes |
|-------|--------|-------|
| pnpm install | ✅/❌ | [notes if failed] |
| pnpm typecheck | ✅/❌ | [notes if failed] |
| pnpm lint | ✅/❌ | [notes if failed] |
| pnpm build | ✅/❌ | [notes if failed] |
| pnpm test | ✅/❌ | [notes if failed] |

---

## Failures

### Failure 1: [Title]

**Category:** [build | acceptance | regression | browser]
**Criterion:** [Which acceptance criterion failed]

**Expected:**
[What should have happened]

**Actual:**
[What actually happened]

**Evidence:**
```
[Console output, error messages, etc.]
```

**Screenshot:** [path if applicable]

---

## Screenshots (Evidence)

| Screenshot | Description | Path |
|------------|-------------|------|
| Expected | What it should look like | `screenshots/[TICKET-ID]/01-expected.png` |
| Actual | What it actually shows | `screenshots/[TICKET-ID]/02-actual.png` |
| Failure | Screenshot of the failure | `screenshots/[TICKET-ID]/03-failure.png` |

---

## Recommendation for Dispatch

[Specific guidance on what needs to be fixed]

**Suggested continuation ticket focus:**
1. [Fix item 1]
2. [Fix item 2]

---

## DO NOT MERGE

This branch should NOT be merged until issues are resolved.
```

---

## Cleanup

After reporting results, clean up:

```bash
# Remove your start file
rm docs/agent-output/started/QA-[TICKET-ID]-*.json

# If passed, archive dev completion
mv docs/agent-output/completions/[TICKET-ID]-*.md docs/agent-output/archive/
```

---

## Decision Flowchart

```
START
  │
  ├─► Checkout branch
  │
  ├─► pnpm install → FAIL → BLOCKED
  │                    │
  │                    ▼
  ├─► pnpm typecheck → FAIL → BLOCKED
  │                      │
  │                      ▼
  ├─► pnpm lint → FAIL → BLOCKED
  │                │
  │                ▼
  ├─► pnpm build → FAIL → BLOCKED
  │                 │
  │                 ▼
  ├─► pnpm test → FAIL → BLOCKED
  │                │
  │                ▼
  ├─► Check each Acceptance Criterion
  │     │
  │     ├─► AC1 verified? → NO → BLOCKED
  │     ├─► AC2 verified? → NO → BLOCKED
  │     ├─► AC3 verified? → NO → BLOCKED
  │     │
  │     ▼
  ├─► All ACs verified
  │     │
  │     ▼
  └─► APPROVED → Ready for Merge
```

---

## Browser Testing Patterns

### Screenshot Verification Pattern

**ALWAYS take screenshots for visual verification:**

```typescript
// 1. Create screenshots directory if needed
// docs/agent-output/qa-results/screenshots/TKT-XXX/

// 2. Take BEFORE screenshot (main branch state)
mcp__playwright__browser_navigate({ url: "http://localhost:3000/page" })
mcp__playwright__browser_take_screenshot({ 
  path: "docs/agent-output/qa-results/screenshots/TKT-XXX/01-before-main.png",
  fullPage: true 
})

// 3. Switch to feature branch, rebuild, restart dev server

// 4. Take AFTER screenshot (feature branch state)
mcp__playwright__browser_navigate({ url: "http://localhost:3000/page" })
mcp__playwright__browser_take_screenshot({ 
  path: "docs/agent-output/qa-results/screenshots/TKT-XXX/02-after-feature.png",
  fullPage: true 
})

// 5. Take specific element screenshots for detailed verification
mcp__playwright__browser_take_screenshot({ 
  element: ".modal-content",
  path: "docs/agent-output/qa-results/screenshots/TKT-XXX/03-modal-detail.png"
})

// 6. Screenshot different states (hover, active, error)
mcp__playwright__browser_click({ selector: "button.trigger" })
mcp__playwright__browser_wait_for({ selector: ".modal", state: "visible" })
mcp__playwright__browser_take_screenshot({ 
  path: "docs/agent-output/qa-results/screenshots/TKT-XXX/04-modal-open.png"
})
```

**Screenshot Naming Convention:**
```
docs/agent-output/qa-results/screenshots/TKT-XXX/
├── 01-before-main.png          # Main branch baseline
├── 02-after-feature.png        # Feature branch result
├── 03-[component]-detail.png   # Specific component
├── 04-[state]-[action].png     # State after action
└── 05-error-state.png          # Error states if applicable
```

**Include in QA Report:**
```markdown
## Screenshots

| Screenshot | Description | Path |
|------------|-------------|------|
| Before (main) | Baseline from main branch | `screenshots/TKT-XXX/01-before-main.png` |
| After (feature) | Result after changes | `screenshots/TKT-XXX/02-after-feature.png` |
| Modal Open | Modal in active state | `screenshots/TKT-XXX/04-modal-open.png` |

**Visual Diff Summary:**
- ✅ Expected change: [description]
- ✅ No unintended visual regressions
```

---

### Testing a Modal

```typescript
// 1. Navigate to the page with the modal trigger
playwright_navigate({ url: "http://localhost:3000/settings" })

// 2. Click the trigger button
playwright_click({ selector: "[data-testid='cancel-subscription-btn']" })

// 3. Wait for modal to appear
playwright_wait({ selector: ".modal", state: "visible" })

// 4. Verify modal content
playwright_get_text({ selector: ".modal-body" })
// Should contain expected copy

// 5. Test form interaction
playwright_fill({ selector: "input[name='confirmation']", value: "DELETE" })

// 6. Verify button becomes enabled
playwright_expect({ selector: "button[type='submit']", enabled: true })

// 7. Submit and verify result
playwright_click({ selector: "button[type='submit']" })
playwright_wait({ selector: ".success-toast", state: "visible" })
```

### Testing a Form Flow

```typescript
// Navigate
playwright_navigate({ url: "http://localhost:3000/billing" })

// Fill form
playwright_fill({ selector: "#seats", value: "10" })
playwright_select({ selector: "#billing-period", value: "annual" })

// Submit
playwright_click({ selector: "button[type='submit']" })

// Wait for result
playwright_wait({ selector: ".confirmation", state: "visible" })

// Verify success
playwright_expect({ selector: ".confirmation", text: "Subscription updated" })
```

### Testing API Response in Browser

```typescript
// Navigate to page that makes API call
playwright_navigate({ url: "http://localhost:3000/dashboard" })

// Use evaluate to check network requests
playwright_evaluate({
  script: `
    // Get the most recent API response from network tab
    // Or check for expected data in the DOM
    document.querySelector('[data-org-status]')?.dataset.orgStatus
  `
})
```

---

## Common Failure Modes

| Failure Type | Common Cause | Resolution |
|--------------|--------------|------------|
| Typecheck fails | Missing type, incorrect import | Dev needs to fix types |
| Build fails | Syntax error, missing dependency | Dev needs to fix build |
| Test fails | Regression introduced | Dev needs to fix test or code |
| AC not met | Incomplete implementation | Dev needs to complete work |
| Out of scope changes | Dev modified wrong files | Dev needs to revert changes |
| Browser test fails | UI doesn't match spec | Dev needs to fix UI |

---

## Rules

1. **Be thorough** - Test EVERY acceptance criterion
2. **Be objective** - Pass/fail based on criteria, not feelings
3. **Document everything** - Future agents need to understand your findings
4. **Don't fix bugs** - Report them, don't fix them
5. **Don't skip tests** - Even if dev says they tested it
6. **Use Playwright MCP** - Don't assume UI works without testing it
7. **Check scope** - Ensure changes are within `files_to_modify`

---

## Escalation

If you encounter something you can't test:

1. Document what you CAN'T test and why
2. Still make a pass/fail decision on what you CAN test
3. Note in report: "Partial coverage - [reason]"
4. Let dispatch/human decide if partial coverage is acceptable

---

## Time Limits

- Small tickets (1-2 files): 30-60 minutes
- Medium tickets (3-5 files): 1-2 hours
- Large tickets (5+ files): 2-4 hours

If you're stuck longer than the time limit, report BLOCKED with reason "complexity - needs human review"

