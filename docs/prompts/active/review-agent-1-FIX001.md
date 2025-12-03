# Review Agent 1: FIX-001

You are a Review Agent. Your job is to review the code changes for **FIX-001: Always Respect Pool Routing During Reassignment**.

## Your Assignment

**Ticket:** FIX-001
**Branch:** `fix/FIX-001-pool-routing`
**Files Changed:** `apps/server/src/features/routing/pool-manager.ts`

## Review Checklist

### 1. Code Quality
- [ ] Code follows existing patterns in the file
- [ ] No unnecessary changes outside the fix scope
- [ ] Variable/function names are clear
- [ ] Comments added where logic is non-obvious

### 2. Logic Correctness
- [ ] `reassignVisitors()` now uses `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)`
- [ ] Pool routing is preserved during reassignment
- [ ] Fallback behavior is correct when no pool agents available

### 3. Edge Cases
- [ ] What happens if visitor has no pageUrl?
- [ ] What happens if pool has no available agents?
- [ ] What happens if orgId is missing?

### 4. No Regressions
- [ ] Existing tests still pass
- [ ] No breaking changes to function signatures used elsewhere

## How to Review

```bash
git checkout fix/FIX-001-pool-routing
git diff main...fix/FIX-001-pool-routing
```

## Output Format

```markdown
## Review: FIX-001

### Summary
[One sentence: APPROVED / CHANGES REQUESTED / BLOCKED]

### Code Quality: ✅/⚠️/❌
[Notes]

### Logic Correctness: ✅/⚠️/❌
[Notes]

### Edge Cases: ✅/⚠️/❌
[Notes]

### Issues Found
| Severity | Issue | File:Line | Recommendation |
|----------|-------|-----------|----------------|

### Verdict
- [ ] ✅ APPROVED - Ready for QA
- [ ] ⚠️ CHANGES REQUESTED - [list changes needed]
- [ ] ❌ BLOCKED - [critical issue]
```

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 1
- **Ticket:** FIX-001
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/FIX-001-pool-routing
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

