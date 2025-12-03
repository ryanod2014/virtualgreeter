# Dev Agent 6: FIX-006

You are a Dev Agent. Your job is to implement fix **FIX-006: Add Warning Toast Before Idle Timeout**.

## Your Assignment

**Ticket:** FIX-006
**Priority:** P2 (Medium)
**Source:** Q5 Decision - Prevent surprise away-marking

**Problem:**
When an agent is idle for 5 minutes in a visible tab, they are immediately marked as away with no warning. An agent actively looking at their screen but not moving their mouse gets surprised.

**Solution:**
Add a warning toast at 4:30 (30 seconds before timeout) saying "You'll be marked away in 30s due to inactivity". Agent can move mouse/interact to reset timer.

**Files to Modify:**
- `apps/dashboard/src/features/workbench/hooks/useIdleTimer.ts` - Add warning at 4:30

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] Warning toast appears at 4:30 (30s before 5min timeout)
- [ ] Toast message: "You'll be marked away in 30s due to inactivity"
- [ ] Any user interaction dismisses toast and resets timer
- [ ] If no interaction, agent goes away at 5:00 as before
- [ ] All verification checks pass

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup (REQUIRED FIRST!)

```bash
git checkout main
git pull origin main
git checkout -b fix/FIX-006-idle-warning
```

### Phase 1: Understand (5 min)

1. **Read** `apps/dashboard/src/features/workbench/hooks/useIdleTimer.ts`
2. **Find** how the 5-minute timeout is implemented
3. **Check** how toasts are shown in the dashboard (look for toast imports/usage)
4. **Understand** how timer resets work

### Phase 2: Implement

1. Add a warning timer at 4:30 (270 seconds)
2. Show toast notification with warning message
3. If user interacts, cancel warning and reset main timer
4. If 5:00 hits, proceed with away-marking as normal

### Phase 3: Self-Verification (Required!)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Phase 4: Git Commit

```bash
git add .
git commit -m "fix(FIX-006): add warning toast before idle timeout

- Show warning toast at 4:30 before 5min idle timeout
- User interaction dismisses warning and resets timer
- Prevents surprise away-marking

Closes FIX-006"

git push origin fix/FIX-006-idle-warning
```

### Phase 5: Completion Report

```markdown
## Fix Complete: FIX-006 - Idle Warning Toast

### Git
**Branch:** `fix/FIX-006-idle-warning`
**Commit:** [hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `useIdleTimer.ts` | Added warning timer and toast |

### Verification Results
- [ ] `pnpm typecheck`: ✅/❌
- [ ] `pnpm lint`: ✅/❌
- [ ] `pnpm test`: ✅/❌
- [ ] `pnpm build`: ✅/❌

### Human Review Required?
- [ ] Minor UI (toast notification)

### Status: READY FOR REVIEW
```

## Rules
1. **Stay in scope** - Only modify useIdleTimer.ts
2. **Match existing toast patterns** - Use same toast library/style as rest of app
3. **All checks must pass**

