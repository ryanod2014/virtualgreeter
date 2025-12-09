# Handling Out-of-Scope Test Regressions

When an agent's PR fails CI due to out-of-scope regressions, here are the options:

---

## Quick Decision Tree

```
Is the failing test in your ticket's files_to_modify?
├── YES → IN-SCOPE (expected, review if test needs updating)
└── NO → OUT-OF-SCOPE REGRESSION
         │
         ├── Was it already failing on main?
         │   └── YES → PRE-EXISTING (not your fault, OK to merge)
         │
         └── Is this a NEW failure?
             └── YES → REGRESSION (must resolve before merge)
```

---

## Resolution Options for Regressions

### Option 1: Fix Your Code
**When:** Your change accidentally broke something else

```bash
# The most common case - you introduced a bug
# Review the failing test to understand what broke
# Fix your implementation to not break that behavior
```

**Example:** You modified a shared utility function and broke a different feature that uses it.

---

### Option 2: Fix the Test
**When:** The old test was wrong or testing outdated behavior

```bash
# Sometimes old tests are:
# - Testing implementation details that shouldn't matter
# - Asserting incorrect expected values
# - Brittle to unrelated changes
```

**Example:** A test was asserting `>=` but should have been `>`, and your change exposed the bug.

---

### Option 3: Expand Your Ticket Scope
**When:** The change was intentional but scope was too narrow

```json
// In docs/data/tickets.json, add the affected file:
{
  "id": "TKT-014",
  "files_to_modify": [
    "apps/widget/src/features/call/CallUI.tsx",
    "apps/widget/src/features/call/RecordingBadge.tsx",
    "apps/widget/src/Widget.tsx"  // ← Add this if you intentionally changed Widget behavior
  ]
}
```

**Example:** Your feature required changes to Widget.tsx that weren't originally scoped.

---

### Option 4: Revert and Rethink
**When:** You can't figure out why tests are failing

```bash
# If the regression is mysterious:
git stash                    # Save your changes
git checkout origin/main     # Go back to clean state
# Then re-apply changes more carefully
```

**Example:** Multiple unrelated tests fail and you're not sure what's causing it.

---

### Option 5: Split the Work
**When:** Your PR is too large and touching too many things

```bash
# Create a new ticket for the regression-causing work
# Submit the safe parts of your PR first
# Address the risky changes in a focused follow-up
```

**Example:** You were fixing billing but accidentally refactored shared code.

---

## Automated Handling (Future)

For full automation, the system could:

1. **Auto-retry once** - Sometimes tests are flaky
2. **Auto-create fix ticket** - If regression is detected, spawn a new ticket to fix it
3. **Auto-notify PM** - Alert human for triage decision
4. **Auto-revert** - If agent can't fix within time limit, revert and log

---

## What NOT To Do

❌ **Don't merge with regressions** - This breaks main for everyone

❌ **Don't delete failing tests** - Unless they're genuinely obsolete

❌ **Don't mark random files as "in scope"** - That defeats the purpose

❌ **Don't ignore CI** - The system exists to protect quality

---

## PM Triage Checklist

When a regression is flagged:

- [ ] Is the failing test actually testing something important?
- [ ] Does the agent's change make sense given the ticket requirements?
- [ ] Is this a test infrastructure issue (flaky test, CI problem)?
- [ ] Should the ticket scope be expanded?
- [ ] Should this be escalated to a human developer?

---

## Example CI Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST SCOPE ANALYSIS FOR TKT-014
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Files in ticket scope:
  • apps/widget/src/features/call/CallUI.tsx
  • apps/widget/src/features/call/RecordingBadge.tsx

Test Failure Summary:
   Total failures:       3
   Pre-existing (main):  1
   New in-scope:         1
   New regressions:      1

⏭️  PRE-EXISTING (already failing on main - not your fault): 1
   ○ stripe.test.ts

📋 IN-SCOPE (new failure in ticket's area - expected): 1
   • CallUI.test.tsx

🚨 REGRESSION (new failure OUTSIDE ticket scope): 1
   ✗ Widget.test.tsx

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ REGRESSIONS DETECTED!
   1 test(s) failed OUTSIDE your ticket scope.

What to do:
   1. Fix the code - Your changes broke something unrelated
   2. Fix the test - If the old test was wrong/outdated
   3. Expand scope - Add file to files_to_modify if intentional
   4. Revert changes - If you can't determine the cause

   DO NOT MERGE until regressions are resolved.
```
