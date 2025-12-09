# QA Review Agent SOP (Standard Operating Procedure)

> **Purpose:** Automated testing and validation of tickets in "needs review" status before merging to main.
> **Environment:** Claude Code with Playwright MCP for browser testing
> **One-liner to launch:** `You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute: docs/prompts/active/qa-review-[TICKET-ID].md`

---

## 🚨 Session Management (REQUIRED)

**You MUST register your session with the workflow database.** This tracks running QA agents and enables proper status reporting.

### On Start (FIRST THING YOU DO)

```bash
# Register your QA session
export AGENT_SESSION_ID=$(./scripts/agent-cli.sh start --ticket $TICKET_ID --type qa)
echo "QA Session started: $AGENT_SESSION_ID"
```

### During Testing (Every 10 Minutes)

```bash
# Send heartbeat to show you're still testing
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID
```

### On QA Pass

```bash
# Mark session complete with PASSED report
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report docs/agent-output/qa-results/QA-$TICKET_ID-PASSED.md

# Update ticket status to merged
./scripts/agent-cli.sh update-ticket $TICKET_ID --status merged
```

### On QA Fail

```bash
# Mark session as blocked with failure report
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "Description of failures" --type qa_failure

# Update ticket status
./scripts/agent-cli.sh update-ticket $TICKET_ID --status qa_failed
```

---

## 🔧 Agent CLI Reference

The `agent-cli.sh` script is the interface to the workflow database.

**Location:** `scripts/agent-cli.sh`

**QA-Specific Commands:**
```bash
# Start QA session (REQUIRED - do this first!)
./scripts/agent-cli.sh start --ticket TKT-XXX --type qa

# Send heartbeat (every 10 minutes)
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID

# Mark QA as passed (session complete)
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report docs/agent-output/qa-results/QA-TKT-XXX-PASSED.md

# Mark QA as failed (creates blocker)
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "Acceptance criteria X failed" --type qa_failure

# Update ticket status after QA pass
./scripts/agent-cli.sh update-ticket TKT-XXX --status merged

# Update ticket status after QA fail
./scripts/agent-cli.sh update-ticket TKT-XXX --status qa_failed
```

---

## 🎯 Your Mission

Test tickets that dev agents have completed and are awaiting review. Your job is to:

1. **TRY TO BREAK IT** - You are adversarial, not just verifying happy path
2. **Use the browser** - Playwright MCP testing is MANDATORY
3. **Take screenshots** - Every test needs visual evidence
4. **Test edge cases** - Empty inputs, invalid data, rapid clicks, etc.
5. **Make a decision** based on ticket type (see below)

---

## 🔀 Two Different Flows: UI vs Non-UI Tickets

**CRITICAL: The outcome of QA depends on whether the ticket involves UI changes.**

### Non-UI Tickets (Auto-Merge)

For tickets that do NOT modify UI files (backend, API, database, etc.):

```
QA tests → All pass → Auto-merge to main
                  ↓
              FAIL → Create blocker, no merge
```

**What counts as non-UI:**
- API route changes (`/api/**/*.ts`)
- Database migrations
- Server-side logic
- CLI tools
- Configuration files

### UI Tickets (Requires PM Approval)

For tickets that modify UI files (`.tsx`, `.css`, `/components/`, `/app/(dashboard)/`):

```
QA tests → All pass → Generate magic link → Submit to PM inbox → WAIT
                                                                  ↓
                                              PM approves → Merge to main
                                              PM rejects → Create blocker
```

**You do NOT auto-merge UI tickets.** The PM must review the actual UI and approve.

**What counts as UI:**
- React components (`.tsx` files in `/components/`, `/features/`, `/app/`)
- Styles (`.css`, Tailwind classes)
- Layout changes
- Any user-facing visual change

### How to Determine Ticket Type

Check the ticket's `files_to_modify` field:

```bash
cat docs/data/tickets.json | jq '.tickets[] | select(.id == "TKT-XXX") | .files_to_modify'
```

If ANY file matches these patterns → **UI ticket**:
- `*.tsx` (except `*.test.tsx`)
- `*/components/*`
- `*/features/*`
- `*/app/(dashboard)/*`
- `*/app/(app)/*`
- `*.css`

---

## 🔗 Magic Link Generation (UI Tickets Only)

For UI tickets, after all tests pass, you MUST generate a magic login link.

### Step 1: Create Test Account

Create a Supabase user with the exact state needed to see the feature:

```bash
# Example: Create test user for payment failure testing
# Use Supabase dashboard or API to create user
# Email: test-{ticket-id}@review.local
# Password: review-{ticket-id}-{random}
```

### Step 2: Set Up Required State

Configure the database so the test account shows the feature:

```bash
# Example: Set org to past_due for PaymentBlocker testing
sqlite3 apps/server/data/app.db "UPDATE organizations SET subscription_status='past_due' WHERE id='test-org';"
```

### Step 3: Generate Magic Link

Call the PM dashboard API to create a review token:

```bash
curl -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-XXX",
    "user_email": "test-tkt-xxx@review.local",
    "user_password": "review-tkt-xxx-abc123",
    "redirect_path": "/admin/settings/billing",
    "preview_base_url": "https://your-branch.vercel.app"
  }'
```

Response:
```json
{
  "success": true,
  "token": "abc123...",
  "magic_url": "https://your-branch.vercel.app/api/review-login?token=abc123...",
  "expires_at": "2025-12-15T..."
}
```

### Step 4: Submit to PM Inbox

Include the `magic_url` in the inbox item (NOT preview_url + test_account):

```bash
curl -X POST http://localhost:3456/api/v2/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-XXX",
    "type": "ui_review",
    "message": "UI changes ready for review",
    "branch": "agent/tkt-xxx",
    "files": ["src/components/Feature.tsx"],
    "magic_url": "https://your-branch.vercel.app/api/review-login?token=abc123...",
    "redirect_path": "/admin/settings/billing"
  }'
```

### Step 5: WAIT for PM Approval

**DO NOT mark the ticket as passed or merged.** 

Update ticket status to `needs_pm_review`:

```bash
./scripts/agent-cli.sh update-ticket TKT-XXX --status needs_pm_review
```

The PM will:
1. Click the magic link
2. Land on the exact page, logged in
3. Test the feature themselves
4. Approve or reject in the PM dashboard

Only AFTER PM approval will the ticket proceed to merge.

---

## ⚠️ What Gets Your QA Rejected

Your QA report will be considered INVALID if you:

- ❌ Only run `pnpm test` without browser testing
- ❌ Skip screenshots (no visual evidence)
- ❌ Only test the happy path (no edge cases)
- ❌ Don't actually use Playwright MCP tools
- ❌ Say "verified manually" without screenshots
- ❌ Pass a feature without trying to break it

**Good QA = Finding bugs.** If you test thoroughly and find nothing, that's fine. But if you test lazily and miss obvious bugs, that's bad QA.

---

## 📸 UI Change Requirements (MANDATORY)

If the ticket modifies UI files (`.tsx`, `.css`, `/components/`, `/app/`), you MUST capture screenshots.

### Screenshot Requirements

**Without screenshots, UI changes are AUTO-REJECTED back to you.**

1. **Capture screenshots** of every UI state:
   - Before state (if applicable)
   - After state showing the change
   - Admin view vs regular user view (if different)
   - Mobile viewport (375px width)
   - Error states

2. **Save screenshots to:**
   ```
   docs/agent-output/qa-screenshots/[TICKET-ID]-[description].png
   ```
   
   Examples:
   ```
   docs/agent-output/qa-screenshots/TKT-005B-modal-admin.png
   docs/agent-output/qa-screenshots/TKT-005B-modal-agent.png
   docs/agent-output/qa-screenshots/TKT-005B-mobile.png
   ```

3. **Use Playwright MCP to capture:**
   ```javascript
   // Using Playwright MCP
   await page.screenshot({ path: 'docs/agent-output/qa-screenshots/TKT-XXX-description.png' });
   ```

### Database Access for Testing

Some UI changes require specific database states to test (e.g., `past_due` subscription status).

**You have full database access for testing purposes.**

Common test setup commands:
```bash
# Set organization to past_due status
sqlite3 apps/server/data/app.db "UPDATE organizations SET subscription_status='past_due' WHERE id='test-org';"

# Reset to active
sqlite3 apps/server/data/app.db "UPDATE organizations SET subscription_status='active' WHERE id='test-org';"

# Set user as admin
sqlite3 apps/server/data/app.db "UPDATE users SET role='admin' WHERE email='test@example.com';"

# Set user as agent
sqlite3 apps/server/data/app.db "UPDATE users SET role='agent' WHERE email='test@example.com';"
```

**Always reset test data after testing:**
```bash
# Example cleanup
sqlite3 apps/server/data/app.db "UPDATE organizations SET subscription_status='active' WHERE id LIKE 'test-%';"
```

---

## 🔗 Preview URL Requirements (MANDATORY for UI Changes)

For UI changes, you MUST provide a preview URL so PMs can interact with the feature live.

### When to Provide Preview URL

| Scenario | What to Provide |
|----------|-----------------|
| Simple UI (no auth needed) | Vercel preview URL with demo param |
| Feature requiring auth | Preview URL + test account credentials |
| Feature requiring DB state | Preview URL + test account + setup notes |

### Vercel Preview URLs

Every feature branch automatically gets a Vercel preview deployment:
```
https://[branch-name].vercel.app
```

For branches like `agent/tkt-005b-payment-blocker`, the preview URL would be:
```
https://agent-tkt-005b-payment-blocker.your-project.vercel.app
```

### Demo Mode (Development Only)

For simple components that can render in isolation, use demo mode:
```
http://localhost:3000?demo=feature-name
```

Examples:
- `?demo=payment-blocker-admin` - Shows PaymentBlocker as admin
- `?demo=payment-blocker-agent` - Shows PaymentBlocker as agent

**Note:** Demo mode only works in development. Use Vercel preview for remote PMs.

### Test Account Requirements

For features requiring authentication, create a test account:

1. **Create test user** with predictable credentials:
   ```bash
   # Example: Create test user for payment failure testing
   sqlite3 apps/server/data/app.db "INSERT INTO users (email, role) VALUES ('test-past-due-admin@example.com', 'admin');"
   ```

2. **Set up required DB state**:
   ```bash
   # Example: Set org to past_due for PaymentBlocker testing
   sqlite3 apps/server/data/app.db "UPDATE organizations SET subscription_status='past_due' WHERE id='test-org';"
   ```

3. **Document in QA report** (included in inbox item):
   ```json
   {
     "preview_url": "https://agent-tkt-005b.your-project.vercel.app/dashboard",
     "test_account": {
       "email": "test-past-due-admin@example.com",
       "password": "test123",
       "setup_notes": "Org is set to past_due status. Login to see PaymentBlocker modal."
     }
   }
   ```

### Including Preview in Inbox Item

When QA passes, the inbox item is created with:

```javascript
createInboxItem(ticketId, {
  type: 'ui_review',
  message: 'UI changes ready for review',
  branch: 'agent/tkt-005b-payment-blocker',
  files: ['src/components/PaymentBlocker.tsx'],
  screenshots: [...],
  preview_url: 'https://agent-tkt-005b.vercel.app/dashboard',
  test_account: {
    email: 'test-admin@example.com',
    password: 'test123',
    setup_notes: 'Org is in past_due status'
  }
});
```

---

## Quick Reference

| File | Purpose |
|------|---------|
| `docs/data/tickets.json` | Source of truth for ticket specs |
| `docs/data/dev-status.json` | Tracks completed dev work ready for review |
| `docs/agent-output/blocked/` | Where you report failures |
| `docs/prompts/active/qa-review-*.md` | Your assignment prompts |

---

## ⚠️ CRITICAL: Output File Requirements

**You MUST write to the correct locations. Wrong paths = workflow breaks.**

### If QA PASSES ✅

Write **ONE file**:
```
docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED-[timestamp].md
```

Example: `docs/agent-output/qa-results/QA-TKT-062-PASSED-2025-12-07T1430.md`

### If QA FAILS ❌

Write **TWO files**:

1. **Blocker JSON** (for Dispatch Agent to process):
```
docs/agent-output/blocked/QA-[TICKET-ID]-FAILED-[timestamp].json
```

2. **Human-readable report**:
```
docs/agent-output/qa-results/QA-[TICKET-ID]-FAILED-[timestamp].md
```

Example:
- `docs/agent-output/blocked/QA-TKT-062-FAILED-2025-12-07T1430.json`
- `docs/agent-output/qa-results/QA-TKT-062-FAILED-2025-12-07T1430.md`

### ❌ WRONG Output Locations (Don't Use These)

- `docs/agent-output/reviews/` ← WRONG
- `docs/agent-output/findings/` ← WRONG (for dev findings, not QA)
- Worktree paths ← WRONG (write to main repo)

**Always write to the MAIN repo** (`/Users/.../Digital_greeter/docs/agent-output/`), NOT the worktree.

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

## Process (7 Steps)

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

### Step 2: Design Your Testing Protocol (THINK FIRST)

**Before you run any tests, STOP and THINK.** Design a comprehensive testing strategy.

#### 2.1 Analyze What You're Testing

Ask yourself:
- **What is this feature?** (UI component, API endpoint, background job, etc.)
- **What user flows does it affect?** (List all paths a user could take)
- **What could go wrong?** (Error states, edge cases, race conditions)
- **What are the acceptance criteria really testing?**

#### 2.2 Inventory Your Testing Tools

| Tool | Use For | Available? |
|------|---------|------------|
| `pnpm test` | Unit tests | ✅ Always |
| `pnpm typecheck` | Type safety | ✅ Always |
| `pnpm build` | Build verification | ✅ Always |
| `pnpm dev` | Running the app | Depends on build |
| Playwright MCP | Browser testing | If dev server runs |
| `curl` | API testing | ✅ Always |
| Code inspection | Logic verification | ✅ Always |
| `grep`/`rg` | Pattern searching | ✅ Always |

#### 2.3 Design Your Test Matrix

For EACH acceptance criterion, document:

```markdown
## Test Protocol for [TICKET-ID]

### Acceptance Criterion 1: [AC text]

**How I will verify this:**
1. [Primary method - e.g., Browser test with Playwright]
2. [Fallback method - e.g., Code inspection if browser unavailable]
3. [Evidence I'll collect - e.g., Screenshots, console output]

**Happy path test:**
- User action: [what user does]
- Expected result: [what should happen]
- How to verify: [specific tool/method]

**Edge cases to test:**
1. [Edge case 1] - Expected: [result]
2. [Edge case 2] - Expected: [result]
3. [Edge case 3] - Expected: [result]

**Adversarial tests:**
1. [Try to break it by...] - Should: [expected behavior]
2. [Try to break it by...] - Should: [expected behavior]
```

#### 2.4 Plan for Blocked Paths

If browser testing is blocked (build fails), plan alternatives:

| If Blocked By | Alternative Verification |
|---------------|-------------------------|
| Build fails (PRE-EXISTING on main) | **TRY pnpm dev ANYWAY** - it often works! |
| Build fails (NEW - ticket caused it) | FAIL the ticket immediately |
| Dev server won't start | Code inspection + unit test coverage check |
| Playwright MCP unavailable | Manual curl/API tests + code inspection |
| Auth required | Check auth logic in code + API tests |

**⚠️ IMPORTANT: `pnpm dev` does NOT depend on `pnpm typecheck` or `pnpm build`!**

Even if typecheck/build fails, **ALWAYS TRY running `pnpm dev`**:

```bash
# Even if these fail:
pnpm typecheck  # ❌ 39 errors (pre-existing)
pnpm build      # ❌ fails (pre-existing)

# This will likely STILL WORK:
pnpm dev        # ✅ Starts dashboard:3000, widget:5173, server:3001
```

The dev servers use runtime transpilation (tsx, vite, next) that doesn't require a clean typecheck. Only skip browser testing if `pnpm dev` actually fails to start.

**IMPORTANT:** Pre-existing build failures that exist on main branch are NOT the ticket's fault. You should:
1. Verify the errors exist on BOTH main AND the feature branch
2. If same errors on both → proceed with code-based verification
3. If NEW errors only on feature branch → FAIL the ticket

#### 2.5 Document Your Protocol

Before proceeding, write out your complete test plan:

```markdown
## My Testing Protocol for [TICKET-ID]

### Available Tools:
- [List what you can use]

### Blocked Tools (and why):
- [List what you can't use and why]

### For Each AC:
| AC | Primary Test | Fallback Test | Evidence |
|----|--------------|---------------|----------|
| AC1 | Browser test | Code inspection | Screenshot/Code snippet |
| AC2 | API test | Code inspection | Response/Code snippet |

### Edge Cases I Will Test:
1. [Case] → Method: [how]
2. [Case] → Method: [how]

### Adversarial Tests I Will Try:
1. [Attack] → Expected defense: [what]
2. [Attack] → Expected defense: [what]

### My Pass/Fail Criteria:
- PASS if: [conditions]
- FAIL if: [conditions]
```

---

### Step 3: Generate Test Checklist

Create a comprehensive checklist based on your protocol:

```markdown
## QA Checklist: [TICKET-ID]

### Build Verification
- [ ] `pnpm install` succeeds
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes  
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes

### Acceptance Criteria (Happy Path)
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

### ⚠️ MANDATORY: External Services Verification
- [ ] Checked ticket for `external_services` field
- [ ] If external services required: Are they ACTUALLY configured?
- [ ] If database file needed: Does file exist at expected path?
- [ ] If API keys needed: Are they in `.env` or credentials file?
- [ ] **FAIL if external resources are missing** (see "External Services Check" below)

### ⚠️ MANDATORY: Browser Tests
- [ ] Started dev server (`pnpm dev`)
- [ ] Navigated to affected page with Playwright
- [ ] Feature renders correctly
- [ ] User interactions work as expected
- [ ] No console errors (check with browser_console_messages)
- [ ] Tested at mobile viewport (375px width)

### ⚠️ MANDATORY: Screenshot Evidence
- [ ] Created screenshots directory
- [ ] Screenshot: Initial state BEFORE interaction
- [ ] Screenshot: AFTER successful action
- [ ] Screenshot: Error state (forced error)
- [ ] Screenshot: Mobile viewport
- [ ] All screenshot paths included in report

### ⚠️ MANDATORY: Adversarial/Edge Case Testing
- [ ] Tested empty required inputs
- [ ] Tested invalid input (special chars, XSS attempt)
- [ ] Tested boundary values (0, -1, very large numbers)
- [ ] Tested rapid button clicks (5+ times)
- [ ] Tested double form submission
- [ ] Documented each edge case result with evidence

### Integration Checks
- [ ] API calls work correctly
- [ ] Database state is correct after operations
- [ ] Webhooks trigger correctly (if applicable)

### Regression Checks
- [ ] Existing related functionality still works
- [ ] No new console warnings/errors
```

**Note:** If you skip the MANDATORY sections, your QA will be rejected.

---

### Step 4: Execute Build Verification

Run build checks and **compare results between main and feature branch**.

```bash
# Install dependencies
pnpm install

# Type checking
pnpm typecheck
# Expected: 0 errors (or same as main)

# Linting
pnpm lint
# Expected: 0 errors (or same as main)

# Build
pnpm build
# Expected: Successful build (or same as main)

# Unit tests
pnpm test
# Expected: All tests pass (or same as main)
```

#### Handling Build Failures

**CRITICAL: Not all build failures are the ticket's fault!**

```bash
# Step 1: Run checks on feature branch, note any failures
pnpm typecheck 2>&1 | tee /tmp/feature-typecheck.log

# Step 2: Check if same errors exist on main
git stash  # Save any local changes
git checkout main
pnpm typecheck 2>&1 | tee /tmp/main-typecheck.log
git checkout -  # Go back to feature branch
git stash pop  # Restore changes

# Step 3: Compare results
diff /tmp/main-typecheck.log /tmp/feature-typecheck.log
```

| Scenario | Action |
|----------|--------|
| **Errors on feature ONLY** | ❌ FAIL - Ticket introduced errors |
| **Same errors on main AND feature** | ⚠️ PRE-EXISTING - Proceed with testing |
| **More errors on feature than main** | ❌ FAIL - Ticket made it worse |
| **Fewer errors on feature than main** | ✅ Ticket fixed some issues |

**If errors are PRE-EXISTING:**
1. Document them in your report as "pre-existing, not caused by this ticket"
2. Proceed to Step 5 using code inspection and available tools
3. Do NOT fail the ticket for issues it didn't cause

**If errors are NEW (introduced by ticket):**
→ FAIL the ticket, go to Step 7: Report BLOCKED

---

### Step 5: Execute Acceptance Criteria Tests

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

### Step 6: Make Decision

Based on your testing AND the ticket type:

#### Any Test Fails → BLOCKED (Both UI and Non-UI)

1. Document exactly what failed
2. Create blocker file for dispatch
3. Do NOT merge
4. Update ticket status to `qa_failed`

#### All Tests Pass → Depends on Ticket Type

**Non-UI Tickets (Auto-Merge):**
1. Create passing QA report
2. Merge to main (if you have permissions) OR mark for human merge
3. Archive agent files
4. Update ticket status to `merged`

**UI Tickets (Submit to PM):**
1. Create test account with required state
2. Generate magic login link (see "Magic Link Generation" section above)
3. Create passing QA report (but NOT merged yet)
4. Submit to PM inbox with magic_url
5. Update ticket status to `needs_pm_review`
6. **DO NOT MERGE** - wait for PM approval

---

### Step 7: Report Results

#### If APPROVED (Non-UI) or SUBMITTED (UI):

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

## ⚠️ MANDATORY: Browser Testing

**Browser testing is NOT optional.** If the ticket involves ANY UI changes, you MUST:

1. Start the dev server (`pnpm dev`)
2. Navigate to the affected pages using Playwright MCP
3. Test ALL user interactions
4. Take screenshots as evidence
5. Test on mobile viewport (375px)

### Why Browser Testing is Mandatory

- Unit tests don't catch visual bugs
- Dev agents often miss edge cases
- "It works on my machine" is not QA
- Screenshots provide evidence for the report
- Without browser testing, you're just running `pnpm test` which the dev already did

### Starting the Dev Server

```bash
# Start in background
pnpm dev &

# Wait for it to be ready (usually localhost:3000)
sleep 10

# Then use Playwright MCP tools
```

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
2. **Be adversarial** - Your job is to BREAK things, not just verify happy path
3. **Be objective** - Pass/fail based on criteria, not feelings
4. **Document everything** - Future agents need to understand your findings
5. **Don't fix bugs** - Report them, don't fix them
6. **Don't skip tests** - Even if dev says they tested it
7. **MUST use Playwright MCP** - Browser testing is MANDATORY, not optional
8. **MUST take screenshots** - Every test needs visual evidence
9. **Check scope** - Ensure changes are within `files_to_modify`
10. **Verify external integrations** - Mocked tests don't prove third-party services work
11. **FAIL if "Post-Merge Actions Required"** - If human setup is needed, ticket is NOT done

---

## ⚠️ MANDATORY: Adversarial Testing

**You are not just verifying it works. You are trying to FIND BUGS.**

Your QA is INCOMPLETE if you only test the happy path. You MUST attempt to break the feature.

### Required Edge Case Tests

For EVERY feature, test these scenarios:

#### Input Validation
| Test | What to Try | Expected |
|------|-------------|----------|
| Empty inputs | Submit form with blank required fields | Should show validation error |
| Whitespace only | Enter "   " (spaces) in required fields | Should treat as empty |
| Special characters | Enter `<script>alert(1)</script>` | Should escape/reject, no XSS |
| SQL injection | Enter `'; DROP TABLE users; --` | Should escape, no SQL injection |
| Very long input | Enter 10,000+ character string | Should truncate or reject gracefully |
| Negative numbers | Enter -1 where positive expected | Should validate |
| Zero | Enter 0 where non-zero expected | Should validate |
| Maximum values | Enter 999999999 or MAX_INT | Should handle gracefully |
| Unicode/emoji | Enter 🔥💀🎉 in text fields | Should handle or reject gracefully |

#### User Interaction
| Test | What to Try | Expected |
|------|-------------|----------|
| Rapid clicks | Click submit 5+ times rapidly | Should debounce or disable button |
| Double submission | Submit same form twice | Should prevent duplicate |
| Cancel mid-action | Start action, navigate away | Should not corrupt state |
| Back button | Complete action, press back | Should handle gracefully |
| Refresh mid-action | Refresh during loading state | Should recover |
| Multiple tabs | Same action in 2 tabs simultaneously | Should handle race condition |

#### Authorization
| Test | What to Try | Expected |
|------|-------------|----------|
| Unauthorized access | Access feature without login | Should redirect to login |
| Wrong role | Access admin feature as regular user | Should show 403 or redirect |
| Expired session | Let session expire, then act | Should prompt re-login |

#### Visual/Responsive
| Test | What to Try | Expected |
|------|-------------|----------|
| Mobile viewport | Resize to 375px width | Should be usable |
| Tablet viewport | Resize to 768px width | Should be usable |
| Empty state | Test with no data | Should show helpful message |
| Loading state | Check during API calls | Should show loading indicator |
| Error state | Force an API error | Should show user-friendly error |
| Long content | Test with very long text | Should truncate or scroll |

### How to Document Edge Case Testing

In your QA report, include a section:

```markdown
## Edge Case Testing

| Category | Test | Result | Evidence |
|----------|------|--------|----------|
| Input | Empty required field | ✅ PASS - Shows "Required" error | screenshot-03-empty-input.png |
| Input | XSS attempt | ✅ PASS - Escaped properly | screenshot-04-xss-escaped.png |
| Input | SQL injection | ✅ PASS - No error, escaped | screenshot-05-sql-safe.png |
| Interaction | Rapid clicks | ❌ FAIL - Created 3 duplicate records | screenshot-06-duplicates.png |
| Responsive | Mobile 375px | ✅ PASS - Button visible | screenshot-07-mobile.png |
```

### If You Find a Bug

1. **Document it thoroughly** with screenshots
2. **Include reproduction steps** 
3. **Mark QA as FAILED** - even if happy path works
4. **Bugs found = good QA** - finding bugs is your job!

### If You Skip Edge Case Testing

Your QA will be considered **INCOMPLETE** and may be rejected. The whole point of QA is to catch bugs before they reach production.

---

## ⚠️ MANDATORY: External Services Verification

**Mocked tests are NOT proof that external integrations work.**

If the ticket integrates with ANY third-party service, you MUST verify the actual integration works, not just that the code exists.

### Step 1: Check for External Dependencies

Look for these patterns in the ticket and code:

| Pattern in Code | External Dependency | What to Verify |
|-----------------|---------------------|----------------|
| `@maxmind/geoip2-node` | MaxMind database | File exists at expected path |
| `stripe` package | Stripe API | API keys configured, test mode works |
| `@sendgrid/mail` | SendGrid | API key set, can send test email |
| `aws-sdk`, `@aws-sdk/*` | AWS services | Credentials configured, bucket exists |
| `twilio` | Twilio | Credentials set, phone number valid |
| Database file reads | Local database | File exists and contains valid data |

### Step 2: Verify External Resources Exist

```bash
# Check for database files
ls -la apps/server/data/*.mmdb 2>/dev/null || echo "❌ No MaxMind database found"

# Check for env vars
grep -E "MAXMIND|STRIPE|SENDGRID|AWS|TWILIO" .env.local 2>/dev/null || echo "⚠️ Check .env for API keys"

# Check credentials file
cat docs/data/.agent-credentials.json | jq 'keys'
```

### Step 3: Test the Actual Integration

**❌ WRONG:** Unit tests pass with mocks → "PASS"

**✅ RIGHT:** Verify the actual service works:

| Service Type | How to Verify |
|--------------|---------------|
| Database file | `ls -la [expected-path]` → file exists and has size > 0 |
| API key | Make a real API call (in test mode) |
| Geolocation | Look up a known IP address and verify country |
| Email | Check if test email can be sent |
| Payment | Verify Stripe dashboard shows test connection |

### Step 4: Fail if External Setup is Incomplete

**If external resources are missing, the ticket is NOT complete.**

Even if:
- ✅ Code looks correct
- ✅ Unit tests pass (with mocks)
- ✅ Build passes
- ✅ Dev agent wrote "complete" report

**FAIL the QA** if you cannot verify the actual integration works.

### Example: TKT-062 MaxMind (What QA Should Have Caught)

**Dev Completion Report said:**
> "Replaced ip-api.com with MaxMind GeoLite2"

**What QA should have checked:**
```bash
# Does the database file exist?
ls -la apps/server/data/GeoLite2-City.mmdb
# Result: No such file ❌

# Can we test a real IP lookup?
curl -X POST localhost:3001/api/test-geolocation -d '{"ip":"8.8.8.8"}'
# Result: Error - database not found ❌
```

**Correct QA Result: FAIL**
```json
{
  "blocker_type": "external_setup_incomplete",
  "summary": "MaxMind database file not deployed - integration cannot be verified",
  "failures": [{
    "category": "external_integration",
    "criterion": "MaxMind geolocation works",
    "expected": "IP lookup returns country code",
    "actual": "Database file not found at apps/server/data/GeoLite2-City.mmdb",
    "evidence": "ls -la shows file does not exist"
  }],
  "recommendation": "Human must: (1) Create MaxMind account, (2) Download GeoLite2-City.mmdb, (3) Deploy to apps/server/data/"
}
```

### Red Flags in Completion Reports

Watch for these phrases that suggest external setup wasn't done:

| Red Flag | What It Means |
|----------|---------------|
| "Post-Merge Actions Required" | Something isn't done yet! |
| "Database setup required" | External file needs to be downloaded |
| "Requires API key" | Human needs to get credentials |
| "Will fail gracefully if..." | Feature won't work without setup |
| "Tests pass with mocks" | Real integration not verified |

**If you see "Post-Merge Actions Required" → The ticket is NOT complete. FAIL it.**

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

