# Code Review: FIX-001 - Always Respect Pool Routing During Reassignment

> **One-liner to launch:**
> `Read and execute docs/prompts/active/review-agent-FIX001-v2.md`

---

You are a Code Review Agent. Your job is to review the code changes for **FIX-001: Always Respect Pool Routing During Reassignment**.

## Your Assignment

**Ticket:** FIX-001
**Priority:** P1 (High)
**Branch:** `fix/FIX-001-pool-routing`

**What Was Changed:**
The `reassignVisitors()` function now uses `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)` instead of `findBestAgent()`, ensuring visitors stay within their matched pool during reassignment.

**Files Changed:**
- `apps/server/src/features/routing/pool-manager.ts`

## Review Checklist

### 1. Core Fix
- [ ] `reassignVisitors()` now calls `findBestAgentForVisitor()` instead of `findBestAgent()`
- [ ] Visitor's `orgId` and `pageUrl` are passed correctly
- [ ] Pool routing is respected during reassignment

### 2. Error Handling
- [ ] Handles case where no pool agents available
- [ ] Falls back gracefully (visitor gets "no agents" message, not wrong pool agent)

### 3. Code Quality
- [ ] Follows existing patterns in pool-manager.ts
- [ ] No breaking changes to other callers
- [ ] Clear variable names

### 4. Security
- [ ] No new data exposure
- [ ] Authorization unchanged

## Your SOP

### Step 0: Signal Start (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent FIX-001
- **Ticket:** FIX-001
- **Status:** STARTED
- **Branch:** `fix/FIX-001-pool-routing`
- **Notes:** Beginning code review
```

### Step 1: Get the Diff

```bash
git diff main..fix/FIX-001-pool-routing
```

### Step 2: Review the Change

Focus on `reassignVisitors()` function - verify it now respects pool routing.

### Step 3: Generate Report and Notify PM

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent FIX-001
- **Ticket:** FIX-001
- **Status:** APPROVED / CHANGES_REQUESTED
- **Branch:** `fix/FIX-001-pool-routing`
- **Output:** Review report above
- **Notes:** [summary]
```

---

## ⚠️ REQUIRED: Notify PM When Done

**This is mandatory. PM checks completions.md to update the task board.**

