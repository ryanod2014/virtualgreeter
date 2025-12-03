# Dev Agent: FIX-001 v2

You are a Dev Agent. Your job is to implement fix **FIX-001: Always Respect Pool Routing During Reassignment**.

## ⚠️ IMPORTANT: Branch Exists But Is Empty

A previous agent created the branch but never implemented the fix. You need to:
1. Check out the existing branch (don't create new)
2. Actually implement the fix
3. Commit and push

## Your Assignment

**Ticket:** FIX-001
**Priority:** P1 (High)
**Source:** Q1 Decision - Pool routing must always be respected

**Problem:**
`reassignVisitors()` in pool-manager.ts calls `findBestAgent()` with NO visitor context:
```typescript
const newAgent = this.findBestAgent(); // No poolId, orgId, or pageUrl passed!
```

This means a visitor originally matched to "Sales Pool" via URL routing could be reassigned to an agent in "Support Pool" when their original agent becomes unavailable.

**Review Agent Found:**
- `reassignVisitors()` still calls `findBestAgent()` without visitor context (orgId/pageUrl)
- This violates the pool routing rules

**Solution:**
Use `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)` instead of `findBestAgent()` in `reassignVisitors()`.

**Files to Modify:**
- `apps/server/src/features/routing/pool-manager.ts`

**Acceptance Criteria:**
- [ ] `reassignVisitors()` uses `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)`
- [ ] Visitor on /pricing ONLY gets Sales pool agents, never Support agents
- [ ] If no pool agents available, visitor gets "no agents available" message
- [ ] All verification checks pass

## Your SOP

### Phase 0: Git Setup

```bash
git fetch origin
git checkout fix/FIX-001-pool-routing
git merge main
```

### Phase 0.5: Signal Start (REQUIRED!)

**Immediately after git setup, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-001-v2
- **Ticket:** FIX-001
- **Status:** STARTED
- **Branch:** fix/FIX-001-pool-routing
- **Files Locking:** `apps/server/src/features/routing/pool-manager.ts`
- **Notes:** Beginning pool routing fix implementation
```

**This signals to PM that you're live and which files to lock.**

### Phase 1: Understand (5 min)

1. **Read** `apps/server/src/features/routing/pool-manager.ts`
2. **Find** `reassignVisitors()` function
3. **Find** `findBestAgentForVisitor()` function - understand its signature
4. **Check** what visitor data is available in the context

### Phase 2: Implement

In `reassignVisitors()`:
1. Find where it calls `findBestAgent()` or similar
2. Change to `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)`
3. Make sure visitor object has these properties available in scope

### Phase 3: Self-Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

```bash
git add .
git commit -m "fix(FIX-001): always respect pool routing during reassignment

- Changed reassignVisitors() to use findBestAgentForVisitor()
- Visitors now stay within their matched pool during reassignment
- Falls back to 'no agents available' if no pool agents exist

Closes FIX-001"

git push origin fix/FIX-001-pool-routing
```

### Phase 5: Notify PM

Append to `docs/agent-inbox/completions.md`:

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-001-v2
- **Ticket:** FIX-001
- **Status:** COMPLETE
- **Branch:** fix/FIX-001-pool-routing
- **Output:** Branch pushed
- **Notes:** Pool routing now respected during reassignment
```

## If You Have Questions

Add to findings file and notify via completions.md with status BLOCKED.

