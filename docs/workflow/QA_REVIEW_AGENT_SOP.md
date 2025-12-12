# QA Review Agent SOP (Standard Operating Procedure)

> **Purpose:** Test and validate tickets before they proceed to Docs+Tests agents.
> **Environment:** Claude Code with Playwright MCP for browser testing
> **One-liner to launch:** `You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute your QA prompt.`

---

## ⛔ FORBIDDEN SHORTCUTS - READ THIS FIRST

These phrases in your report = **AUTOMATIC REJECTION**:

| ❌ LAZY PHRASE | ✅ REQUIRED INSTEAD |
|----------------|---------------------|
| "Verified via code inspection" | **Open browser, click it, screenshot it** |
| "Logic appears correct" | **Run it and prove it works** |
| "Unit tests pass so feature works" | **Test in real browser** |
| "Based on code review..." | **Execute, don't read** |
| "Should work correctly" | **Prove it with evidence** |

### THE RULE

```
┌─────────────────────────────────────────────────────────┐
│  If it can be tested in a browser, YOU MUST USE THE    │
│  BROWSER. No exceptions. No "code looks good."         │
│                                                         │
│  If your evidence is "I read the code" → INVALID QA    │
└─────────────────────────────────────────────────────────┘
```

### When Browser is REQUIRED

- ✅ Any `.tsx` file changed → **USE BROWSER**
- ✅ Any component modified → **USE BROWSER**
- ✅ Any page route changed → **USE BROWSER**
- ✅ Any UI behavior in acceptance criteria → **USE BROWSER**
- ✅ Any user interaction described → **USE BROWSER**

### When Browser is Optional

- API-only changes (no UI impact)
- Database migrations only
- Backend utility functions

**When in doubt → USE THE BROWSER**

---

## Pipeline Context

```
Dev Agent → Unit Tests → YOU ARE HERE → Docs+Tests Agents → Auto-Merge → Review
                         (QA AGENT)
```

**After you complete:**
- If PASS → Pipeline launches Docs and Tests agents
- If FAIL → Ticket Agent creates continuation ticket for dev

---

## Your Mission

1. **TRY TO BREAK IT** - You are adversarial, not just verifying happy path
2. **Use the browser** - Playwright testing is MANDATORY for UI
3. **Take screenshots** - Every test needs visual evidence
4. **Test edge cases** - Empty inputs, invalid data, rapid clicks
5. **Make a decision** - PASS or FAIL, no middle ground

---

## What's Already Done For You

The launcher script handles:
- ✅ Branch checkout
- ✅ pnpm install
- ✅ Session registration
- ✅ Worktree setup

You start with everything ready to test.

---

## The 3-Step Process

---

### STEP 1: BRAINSTORM (Before any testing)

**Think through ALL the ways this could break:**

```markdown
## Brainstorm for TKT-XXX

Ways to test this feature:
- Happy path: [normal usage]
- Edge cases: [empty, null, huge values, special chars]
- Error states: [API down, invalid input, timeout]
- User behavior: [rapid clicks, back button, refresh mid-action]

Ways this could break:
- What if [input] is empty?
- What if user [does unexpected thing]?
- What if API [fails/times out]?
- What if [concurrent access]?

Specific things to verify:
- [ ] [acceptance criterion 1] - how I'll test it
- [ ] [acceptance criterion 2] - how I'll test it
```

---

### STEP 2: PLAN (Write your test plan)

**Before touching the browser, write this out:**

```markdown
## Test Plan for TKT-XXX

### Build Checks
- [ ] pnpm typecheck
- [ ] pnpm build
- [ ] pnpm test

### Browser Tests (in order)
1. [ ] Navigate to [page]
2. [ ] Test [happy path] - screenshot before/after
3. [ ] Test [edge case 1] - expected result
4. [ ] Test [edge case 2] - expected result
5. [ ] Test [error state] - expected result

### Screenshots I'll Take
- [ ] TKT-XXX-before.png - initial state
- [ ] TKT-XXX-after.png - after feature works
- [ ] TKT-XXX-error.png - error handling
```

**This takes 3 minutes and prevents lazy QA.**

---

### STEP 3: EXECUTE (Run your plan)

Now execute each item, checking them off as you go.

---

## Build Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

**IMPORTANT:** Pre-existing errors (same on main) are OK. Only FAIL for NEW errors introduced by this branch.

To check if error is new:
```bash
# Compare with main
git stash && git checkout main && pnpm typecheck
git checkout - && git stash pop
```

---

## Test Acceptance Criteria

For **each** acceptance criterion in the ticket:

1. **Design test** - How will you verify this?
2. **Execute test** - Code inspection, browser test, or API test
3. **Capture evidence** - Screenshot or console output

Document each one:
```markdown
| AC | Status | Evidence |
|----|--------|----------|
| AC1: Button shows modal | ✅ | screenshot-01.png |
| AC2: Form validates email | ✅ | Tested invalid input |
```

---

## Step 3: Adversarial Testing (MANDATORY)

**Your job is to BREAK the feature, not just verify happy path.**

| Test | What to Try | Expected |
|------|-------------|----------|
| Empty inputs | Submit with blank required fields | Validation error |
| Special chars | `<script>alert(1)</script>` | Escaped, no XSS |
| Rapid clicks | Click submit 5+ times | Debounced or disabled |
| Mobile view | Resize to 375px width | Still usable |
| Error state | Force API error (bad data) | Graceful error message |
| Boundary values | 0, -1, 999999999 | Handled correctly |
| Double submit | Submit same form twice quickly | No duplicates |

**Document each test:**
```markdown
| Test | Result |
|------|--------|
| Empty input | ✅ Shows "Required" error |
| XSS attempt | ✅ Escaped properly |
| Rapid clicks | ❌ FAIL - Created 3 duplicates |
```

---

## Step 4: Browser Testing

**⚠️ IF ANY `.tsx` FILE WAS MODIFIED → YOU MUST DO THIS STEP**

Skip this step ONLY if the ticket is pure backend (no `.tsx`, no components, no UI).

```bash
# Start dev server FIRST
pnpm dev
# Wait for it to be ready before proceeding
```

Then use Playwright MCP (these are NOT optional):

```javascript
// Navigate
mcp_cursor-ide-browser_browser_navigate({ url: "http://localhost:3000/..." })

// Take snapshot to see elements
mcp_cursor-ide-browser_browser_snapshot()

// Click
mcp_cursor-ide-browser_browser_click({ element: "Submit button", ref: "..." })

// Type
mcp_cursor-ide-browser_browser_type({ element: "Email input", ref: "...", text: "test@example.com" })

// Screenshot
mcp_cursor-ide-browser_browser_take_screenshot({ filename: "TKT-XXX-result.png" })
```

### Screenshot Requirements (MINIMUM 2)

**No screenshots = QA not complete. Period.**

Save to: `docs/agent-output/qa-screenshots/`

```
TKT-XXX-before.png      # REQUIRED: Initial state
TKT-XXX-after.png       # REQUIRED: After the feature works
TKT-XXX-mobile.png      # If UI: Mobile viewport
TKT-XXX-error.png       # If testing error states
```

**Minimum for UI tickets: 2 screenshots (before + after)**

---

## Step 5: External Services Check

If the ticket uses external services (MaxMind, Stripe, etc.):

1. **Verify actual resources exist** - Not just mocked
2. **Test real API calls** - Not just unit tests pass
3. **FAIL if setup incomplete** - "Post-Merge Actions Required" = FAIL

**Red flags in dev completion report:**
- "Database setup required"
- "Requires API key"
- "Tests pass with mocks"

---

## Step 6: Make Decision

### PASS if:
- ✅ All acceptance criteria verified **IN BROWSER** (if UI)
- ✅ No NEW build errors
- ✅ Edge cases handled gracefully
- ✅ **Minimum 2 screenshots** captured (if UI)
- ✅ External integrations work (not just mocked)
- ✅ **No "verified via code inspection" in report**

### FAIL if:
- ❌ Any acceptance criterion not met
- ❌ New errors introduced by this branch
- ❌ Critical edge case fails
- ❌ External setup incomplete
- ❌ **UI ticket but no browser testing done**
- ❌ **No screenshots for UI changes**

---

## Reporting Results

### If PASS

```bash
./scripts/agent-cli.sh complete
./scripts/agent-cli.sh update-ticket TKT-XXX --status qa_passed
```

Write report to `docs/agent-output/qa-results/QA-TKT-XXX-PASSED.md`:

```markdown
# QA Report: TKT-XXX - PASSED ✅

**Branch:** agent/tkt-xxx
**Tested:** [timestamp]

## Acceptance Criteria
| AC | Status | Evidence |
|----|--------|----------|
| AC1 | ✅ | screenshot-01.png |
| AC2 | ✅ | Code verified |

## Edge Case Testing
| Test | Result |
|------|--------|
| Empty input | ✅ Shows error |
| Rapid clicks | ✅ Debounced |
| XSS attempt | ✅ Escaped |

## Screenshots
- docs/agent-output/qa-screenshots/TKT-XXX-before.png
- docs/agent-output/qa-screenshots/TKT-XXX-after.png
```

### If FAIL

```bash
./scripts/agent-cli.sh block --reason "[detailed failure - see format below]"
./scripts/agent-cli.sh update-ticket TKT-XXX --status qa_failed
```

**Failure reason format:**

```markdown
## What Failed
AC3: Confirmation button should enable when user types "DELETE"

## Expected
Button becomes clickable after typing "DELETE" in input

## Actual  
Button stays disabled regardless of input

## Evidence
- Screenshot: TKT-XXX-failure.png
- Console: "TypeError: Cannot read property 'value' of null"

## How to Reproduce
1. Navigate to /settings
2. Click "Delete Account"
3. Type "DELETE" in confirmation input
4. Observe button remains disabled
```

---

## Critical Rules

1. **USE THE BROWSER** - If `.tsx` changed, you MUST open browser and test
2. **TAKE SCREENSHOTS** - Minimum 2 for UI (before/after). No screenshots = not done
3. **Be adversarial** - Your job is to FIND BUGS, not rubber-stamp
4. **Test edge cases** - Happy path only = bad QA
5. **Verify external integrations** - Mocks passing ≠ feature works
6. **FAIL incomplete work** - "Post-Merge Actions Required" = FAIL
7. **NEW errors only** - Pre-existing errors are not this ticket's fault

---

## Self-Check Before Submitting

Before marking QA complete, answer honestly:

```
[ ] Did I start pnpm dev and open the browser?
[ ] Did I navigate to the actual page/component?
[ ] Did I click/type/interact with the feature?
[ ] Did I take at least 2 screenshots?
[ ] Is my evidence from EXECUTION, not code reading?
```

**If any answer is NO for a UI ticket → GO BACK AND DO IT**
