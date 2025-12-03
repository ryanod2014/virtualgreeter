# Review Agent 3: FIX-006

You are a Review Agent. Your job is to review the code changes for **FIX-006: Add Warning Toast Before Idle Timeout**.

## Your Assignment

**Ticket:** FIX-006
**Branch:** `fix/FIX-006-idle-warning`
**Files Changed:** `apps/dashboard/src/features/workbench/hooks/useIdleTimer.ts`

## Review Checklist

### 1. Warning Timer Logic
- [ ] Warning fires at 4:30 (30s before 5min timeout)
- [ ] Warning is cancelled if user interacts
- [ ] Main timeout still fires at 5:00 if no interaction

### 2. Toast Implementation
- [ ] Uses existing toast pattern in the app
- [ ] Message is clear: "You'll be marked away in 30s due to inactivity"
- [ ] Toast dismisses on interaction

### 3. Edge Cases
- [ ] What if user interacts at 4:31? (warning should dismiss, timer reset)
- [ ] What if tab is hidden? (existing hidden tab logic preserved)
- [ ] Multiple rapid interactions don't cause issues

### 4. No Regressions
- [ ] Existing idle timeout behavior unchanged
- [ ] Tests pass

## How to Review

```bash
git checkout fix/FIX-006-idle-warning
git diff main...fix/FIX-006-idle-warning
```

## Output Format

```markdown
## Review: FIX-006

### Summary
[APPROVED / CHANGES REQUESTED / BLOCKED]

### Warning Logic: ✅/⚠️/❌
### Toast Implementation: ✅/⚠️/❌
### Edge Cases: ✅/⚠️/❌

### Issues Found
| Severity | Issue | File:Line | Recommendation |

### Verdict
- [ ] ✅ APPROVED - Ready for QA
- [ ] ⚠️ CHANGES REQUESTED
- [ ] ❌ BLOCKED
```

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 3
- **Ticket:** FIX-006
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/FIX-006-idle-warning
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

