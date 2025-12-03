# Dev Agent 4: FIX-003

You are a Dev Agent. Your job is to implement fix **FIX-003: Show Handoff Message During RNA Reassignment**.

## Your Assignment

**Ticket:** FIX-003
**Priority:** P2 (Medium)
**Source:** Q5 Decision - Clear communication during handoff

**Problem:**
When RNA times out and visitor is reassigned to a new agent, they just see "Connecting..." with no indication that anything changed. The visitor has no idea their original agent didn't answer and they're being connected to someone new.

**Solution:**
Show message: "[Agent Name] got pulled away, connecting you to [New Agent Name]"

**Files to Modify:**
- `apps/widget/src/Widget.tsx` - Handle reassignment event, show message
- `apps/server/src/features/signaling/socket-handlers.ts` - Include agent names in reassignment event

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] Server sends previous agent name and new agent name in reassignment event
- [ ] Widget displays handoff message when reassignment occurs
- [ ] Message is clear and friendly: "[Name] got pulled away, connecting you to [New Name]"
- [ ] Message displays for appropriate duration (check HANDOFF_MESSAGE_DURATION in constants)
- [ ] All verification checks pass (typecheck, lint, test, build)

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup (REQUIRED FIRST!)

```bash
git checkout main
git pull origin main
git checkout -b fix/FIX-003-handoff-message
```

### Phase 1: Understand (5 min)

1. **Read** `apps/server/src/features/signaling/socket-handlers.ts` - Find RNA timeout/reassignment logic
2. **Read** `apps/widget/src/Widget.tsx` - Find where reassignment events are handled
3. **Check** `packages/domain/src/constants.ts` for HANDOFF_MESSAGE_DURATION
4. **Understand** what data is currently sent during reassignment

### Phase 2: Implement

**Step 1: Update server** (`socket-handlers.ts`)
- Find where reassignment event is emitted after RNA timeout
- Include `previousAgentName` and `newAgentName` in the payload

**Step 2: Update widget** (`Widget.tsx`)
- Handle the reassignment event
- Show handoff message with agent names
- Display for HANDOFF_MESSAGE_DURATION then continue to "Connecting..."

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
git commit -m "fix(FIX-003): show handoff message during RNA reassignment

- Server now sends agent names in reassignment event
- Widget displays '[Name] got pulled away, connecting to [New Name]'
- Clear communication during agent handoff

Closes FIX-003"

git push origin fix/FIX-003-handoff-message
```

### Phase 5: Completion Report

```markdown
## Fix Complete: FIX-003 - Handoff Message

### Git
**Branch:** `fix/FIX-003-handoff-message`
**Commit:** [hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `socket-handlers.ts` | Added agent names to reassignment event |
| `Widget.tsx` | Display handoff message on reassignment |

### Verification Results
- [ ] `pnpm typecheck`: ✅/❌
- [ ] `pnpm lint`: ✅/❌
- [ ] `pnpm test`: ✅/❌
- [ ] `pnpm build`: ✅/❌

### Human Review Required?
- [x] UI Changes - Widget.tsx (message display)

### Status: READY FOR REVIEW
```

## Rules
1. **Stay in scope** - Only modify the 2 listed files
2. **Match existing style**
3. **All checks must pass**

## If You Have Questions
Add to `docs/findings/session-2024-12-02.md`

