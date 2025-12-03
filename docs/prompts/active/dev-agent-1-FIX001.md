# Dev Agent 1: FIX-001

You are a Dev Agent. Your job is to implement fix **FIX-001: Always Respect Pool Routing During Reassignment**.

## Your Assignment

**Ticket:** FIX-001
**Priority:** P1 (High)
**Source:** Q1 Decision - Pool routing must always be respected

**Problem:**
`reassignVisitors()` in pool-manager.ts calls `findBestAgent()` with NO pool ID:
```typescript
const newAgent = this.findBestAgent(); // No poolId passed!
```
This means a visitor originally matched to "Sales Pool" via URL routing could be reassigned to an agent in "Support Pool" when their original agent becomes unavailable.

**Solution:**
Always use `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)` instead of `findBestAgent()` in the `reassignVisitors()` function. This ensures:
1. Pool matching is preserved during reassignment
2. If no pool agents are available, visitor sees "no agents available" rather than wrong-pool agent
3. The existing fallback logic in `findBestAgentForVisitor` handles the "no agents in pool" case correctly

**Files to Modify:**
- `apps/server/src/features/routing/pool-manager.ts`

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] `reassignVisitors()` uses `findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)` instead of `findBestAgent()`
- [ ] Visitor on /pricing ONLY gets Sales pool agents, never Support agents
- [ ] If no pool agents available, visitor gets "no agents available" message
- [ ] All verification checks pass (typecheck, lint, test, build)

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup (REQUIRED FIRST!)

**Before writing ANY code:**

```bash
# Make sure you're on main and up to date
git checkout main
git pull origin main

# Create your feature branch
git checkout -b fix/FIX-001-pool-routing
```

### Phase 1: Understand (5 min)

1. **Read** `apps/server/src/features/routing/pool-manager.ts`
2. **Find** the `reassignVisitors()` function (around line 781-785)
3. **Understand** how `findBestAgentForVisitor()` works vs `findBestAgent()`
4. **Check** what visitor data is available in the reassignment context

### Phase 2: Implement

Make the change:
1. In `reassignVisitors()`, replace `this.findBestAgent()` with `this.findBestAgentForVisitor(visitor.orgId, visitor.pageUrl)`
2. Ensure the visitor object has `orgId` and `pageUrl` properties available
3. If visitor data structure needs adjustment, trace where visitors are stored/retrieved

### Phase 3: Self-Verification (Required!)

Run ALL of these and they must ALL pass:

```bash
pnpm typecheck    # TypeScript compilation
pnpm lint         # ESLint checks
pnpm test         # Unit tests
pnpm build        # Full build
```

If ANY fail, fix them before proceeding.

### Phase 4: Git Commit

**After all checks pass:**

```bash
git add .
git commit -m "fix(FIX-001): always respect pool routing during reassignment

- Changed reassignVisitors() to use findBestAgentForVisitor()
- Visitors now stay within their matched pool during reassignment
- Falls back to 'no agents available' if no pool agents exist

Closes FIX-001"

git push origin fix/FIX-001-pool-routing
```

### Phase 5: Completion Report

When done, report:

```markdown
## Fix Complete: FIX-001 - Always Respect Pool Routing

### Git
**Branch:** `fix/FIX-001-pool-routing`
**Commit:** [commit hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `apps/server/src/features/routing/pool-manager.ts` | [Description] |

### Verification Results
- [ ] `pnpm typecheck`: ✅ PASSED / ❌ FAILED
- [ ] `pnpm lint`: ✅ PASSED / ❌ FAILED
- [ ] `pnpm test`: ✅ PASSED / ❌ FAILED
- [ ] `pnpm build`: ✅ PASSED / ❌ FAILED

### Human Review Required?
- [ ] None - backend logic only, no UI changes

### Acceptance Criteria Check
- [ ] Uses findBestAgentForVisitor() - ✅ Met / ❌ Not Met
- [ ] Pool routing preserved - ✅ Met / ❌ Not Met
- [ ] All checks pass - ✅ Met / ❌ Not Met

### Questions/Concerns
[Any edge cases found, assumptions made, or concerns]

### Status: READY FOR REVIEW
```

## Rules

1. **Stay in scope** - Only modify pool-manager.ts
2. **Match existing style** - Don't introduce new patterns
3. **All checks must pass** - No exceptions
4. **Be honest** - If something doesn't work, say so

## If You Have Questions

Add to `docs/findings/session-2024-12-02.md` under Questions section.
Then note that you're blocked and what you need.

