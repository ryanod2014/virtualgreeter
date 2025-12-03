# Dev Agent: FIX-003 v2

You are a Dev Agent. Your job is to implement fix **FIX-003: Show Handoff Message During RNA Reassignment**.

## ⚠️ IMPORTANT: Branch Exists But Is Empty

A previous agent created the branch but never implemented the fix. Check out existing branch.

## Your Assignment

**Ticket:** FIX-003
**Priority:** P2 (Medium)
**Source:** Q5 Decision - Clear communication during handoff

**Problem:**
When RNA (Ring No Answer) times out and visitor is reassigned to a new agent, they just see "Connecting..." with no indication of what happened. The visitor doesn't know their original agent didn't answer.

**Review Agent Found - Nothing Implemented:**
- Reassignment event does NOT include previousAgentName
- Reassignment event does NOT include newAgentName
- Widget does NOT handle reassignment event for this
- No message component exists

**Solution:**
Show message: "[Agent Name] got pulled away, connecting you to [New Agent Name]"

**Files to Modify:**
- `apps/server/src/features/signaling/socket-handlers.ts` - Include agent names in reassignment event
- `apps/widget/src/Widget.tsx` (or relevant component) - Handle reassignment, show message

**Acceptance Criteria:**
- [ ] Server sends `previousAgentName` and `newAgentName` in reassignment event
- [ ] Widget displays handoff message when reassignment occurs
- [ ] Message: "[Name] got pulled away, connecting you to [New Name]"
- [ ] Message displays for appropriate duration before transitioning
- [ ] Handles edge case: missing agent name gracefully
- [ ] All verification checks pass

## Your SOP

### Phase 0: Git Setup

```bash
git fetch origin
git checkout fix/FIX-003-handoff-message
git merge main
```

### Phase 0.5: Signal Start (REQUIRED!)

**Immediately after git setup, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-003-v2
- **Ticket:** FIX-003
- **Status:** STARTED
- **Branch:** fix/FIX-003-handoff-message
- **Files Locking:** `apps/server/src/features/signaling/socket-handlers.ts`, `apps/widget/src/Widget.tsx`
- **Notes:** Beginning handoff message implementation
```

**This signals to PM that you're live and which files to lock.**

### Phase 1: Understand (5 min)

1. **Read** `socket-handlers.ts` - Find RNA timeout/reassignment logic
2. **Find** where AGENT_REASSIGNED or similar event is emitted
3. **Read** Widget.tsx - Find connection state handling
4. **Check** `packages/domain/src/constants.ts` for any HANDOFF constants

### Phase 2: Implement

**Server (`socket-handlers.ts`):**
1. Find where reassignment event is emitted after RNA timeout
2. Get the previous agent's name from agent data
3. Get the new agent's name
4. Include both in the event payload:
```typescript
visitorSocket?.emit(SOCKET_EVENTS.AGENT_REASSIGNED, {
  // existing fields...
  previousAgentName: previousAgent?.name || 'Your agent',
  newAgentName: newAgent.name,
});
```

**Widget:**
1. Handle the reassignment event with new payload
2. Create a state for showing handoff message
3. Display: "[previousAgentName] got pulled away, connecting you to [newAgentName]"
4. After 2-3 seconds, transition to normal "Connecting..." state

### Phase 3: Self-Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

```bash
git add .
git commit -m "fix(FIX-003): show handoff message during RNA reassignment

- Server now sends agent names in reassignment event
- Widget displays '[Name] got pulled away, connecting to [New Name]'
- Clear communication during agent handoff

Closes FIX-003"

git push origin fix/FIX-003-handoff-message
```

### Phase 5: Notify PM

Append to `docs/agent-inbox/completions.md`:

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-003-v2
- **Ticket:** FIX-003
- **Status:** COMPLETE
- **Branch:** fix/FIX-003-handoff-message
- **Output:** Branch pushed
- **Notes:** Handoff message implemented. Has UI changes - needs human review.
```

## Human Review Required

- [x] **UI Changes** - Widget shows handoff message

## If You Have Questions

Add to findings file and notify via completions.md with status BLOCKED.

