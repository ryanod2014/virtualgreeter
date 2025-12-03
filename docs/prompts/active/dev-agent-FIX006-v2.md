# Dev Agent: FIX-006 v2

You are a Dev Agent. Your job is to implement fix **FIX-006: Show Idle Warning Toast at 4:30**.

## ⚠️ IMPORTANT: Branch Exists But Is Empty

A previous agent created the branch but never implemented the fix. Check out existing branch.

## Your Assignment

**Ticket:** FIX-006
**Priority:** P2 (Medium)
**Source:** UX finding - Visitors don't know they're about to be disconnected

**Problem:**
Visitors who go idle (no interaction) for 5 minutes get disconnected, but there's no warning. They should see a warning at 4:30 giving them 30 seconds to interact.

**Review Agent Found:**
- No warning toast exists at 4:30
- No toast component exists
- `@radix-ui/react-toast` is installed but unused
- Need to implement from scratch

**Solution:**
Show a toast/warning at 4:30 of idle time: "Still there? Click to stay connected"

**Files to Modify:**
- `apps/widget/src/Widget.tsx` (or create a new toast component)
- May need to add idle tracking if not present

**Acceptance Criteria:**
- [ ] Toast appears at 4:30 of idle time
- [ ] Message: "Still there? Click to stay connected" (or similar)
- [ ] Clicking toast resets idle timer
- [ ] Toast disappears if user interacts elsewhere
- [ ] Uses consistent styling with rest of widget
- [ ] All verification checks pass

## Your SOP

### Phase 0: Git Setup

```bash
git fetch origin
git checkout fix/FIX-006-idle-warning
git merge main
```

### Phase 0.5: Signal Start (REQUIRED!)

**Immediately after git setup, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-006-v2
- **Ticket:** FIX-006
- **Status:** STARTED
- **Branch:** fix/FIX-006-idle-warning
- **Files Locking:** `apps/widget/src/Widget.tsx`
- **Notes:** Beginning idle warning toast implementation
```

**This signals to PM that you're live and which files to lock.**

### Phase 1: Understand (5 min)

1. **Check** if idle tracking exists in the widget
2. **Find** the 5-minute idle disconnect logic
3. **Look at** how other notifications/toasts are shown
4. **Check** if `@radix-ui/react-toast` is already set up

### Phase 2: Implement

1. Add state for showing idle warning
2. Set timer to show warning at 4:30 (270000ms)
3. Create toast/warning component:
```tsx
// Simple warning banner or use radix toast
{showIdleWarning && (
  <div className="idle-warning" onClick={resetIdleTimer}>
    Still there? Click to stay connected
  </div>
)}
```
4. On click, reset idle timer and hide warning
5. If user interacts elsewhere, hide warning
6. Match widget styling

### Phase 3: Self-Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

```bash
git add .
git commit -m "fix(FIX-006): show idle warning toast at 4:30

- Added warning toast before idle disconnect
- User can click to stay connected
- Prevents unexpected disconnections

Closes FIX-006"

git push origin fix/FIX-006-idle-warning
```

### Phase 5: Notify PM

Append to `docs/agent-inbox/completions.md`:

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-006-v2
- **Ticket:** FIX-006
- **Status:** COMPLETE
- **Branch:** fix/FIX-006-idle-warning
- **Output:** Branch pushed
- **Notes:** Idle warning toast implemented. Has UI changes - needs human review.
```

## Human Review Required

- [x] **UI Changes** - New toast/warning component

## If You Have Questions

Add to findings file and notify via completions.md with status BLOCKED.

