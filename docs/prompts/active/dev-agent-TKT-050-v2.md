# Dev Agent Continuation: TKT-050-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-050
> **Branch:** `agent/tkt-050` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2 (previous: v1)

---

## 🔴 PREVIOUS ATTEMPT FAILED - DO NOT REPEAT

**What v1 Dev Agent tried:**
The v1 agent correctly updated the production code in `apps/server/src/features/billing/stripe-webhook-handler.ts`:
- Changed default case to map unknown Stripe statuses to 'cancelled' (fail-safe) ✅
- Updated warning message format ✅
- Implementation is CORRECT

**Why it didn't work:**
The dev agent **forgot to update the corresponding unit test** to match the new behavior.

**Key mistake to avoid:**
When you change production behavior, you MUST update the corresponding tests to verify the NEW behavior.

---

## ❌ QA FAILED - Test Update Required

**QA Summary:**
Unit test still expects old behavior (default to 'active') instead of new behavior (default to 'cancelled')

**Failures Found:**
- Test: `stripe-webhook-handler.test.ts:341 - defaults unknown status to 'active' with console warning`
- Expected: Test checks for 'active' status and old warning format
- Actual: Implementation returns 'cancelled' with new warning format
- Result: Test fails with AssertionError - 1 failed | 29 passed (30)

**What You Must Fix:**
1. Update test name on line 341: change `"defaults unknown status to 'active' with console warning"` to `"defaults unknown status to 'cancelled' with console warning (fail-safe)"`
2. Update expected warning message assertion (around line 369) to match the NEW format from the implementation
3. Update the assertion to verify DB status is 'cancelled' (not 'active')
4. Run `pnpm test` to verify 30/30 tests pass

---

## Your Task

1. **Checkout existing branch:**
   ```bash
   git checkout agent/tkt-050
   git pull origin agent/tkt-050
   ```

2. **Read the test file to understand what needs updating:**
   ```bash
   cat apps/server/src/features/billing/stripe-webhook-handler.test.ts | grep -A20 "line 341"
   ```

3. **Update the test file** `apps/server/src/features/billing/stripe-webhook-handler.test.ts`:
   - Line ~341: Update test name to reflect 'cancelled' default
   - Line ~369: Update expected warning message to match implementation
   - Verify the status assertion checks for 'cancelled' not 'active'

4. **Verify fix works:**
   ```bash
   cd apps/server
   pnpm test -- stripe-webhook-handler.test.ts
   # Must show: 30 passed (30)
   ```

5. **Push for re-QA:**
   ```bash
   git add apps/server/src/features/billing/stripe-webhook-handler.test.ts
   git commit -m "TKT-050-v2: Update test to match fail-safe default to cancelled"
   git push origin agent/tkt-050
   ```

---

## Original Acceptance Criteria

- [x] Unknown Stripe status maps to 'cancelled' ✅ (DONE in v1)
- [x] Warning logged with full Stripe event for debugging ✅ (DONE in v1)
- [x] Known statuses work as before ✅ (DONE in v1)
- [ ] Tests pass (NEEDS FIX in v2)

---

## Files in Scope

**MUST UPDATE:**
- `apps/server/src/features/billing/stripe-webhook-handler.test.ts` - Update test to match new behavior

**DO NOT MODIFY:**
- `apps/server/src/features/billing/stripe-webhook-handler.ts` - Implementation is correct

---

## Out of Scope

- ❌ Do NOT change the implementation code (it's already correct)
- ❌ Do NOT add new tests (just fix the existing one)
- ❌ Do NOT modify other webhook handlers

---

## 📜 Attempt History

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1 | Updated production code to default unknown status to 'cancelled' with new warning format | Forgot to update unit test - test still expects old behavior ('active') |

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-050 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-050.md` then `./scripts/agent-cli.sh update-ticket TKT-050 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

