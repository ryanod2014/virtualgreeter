# Dev Agent 5: FIX-004

You are a Dev Agent. Your job is to implement fix **FIX-004: Agent Disconnect Grace Period + Auto-Route**.

## Your Assignment

**Ticket:** FIX-004
**Priority:** P1 (High)
**Source:** Q4 Decision - Recovery when agent disconnects mid-call

**Problem:**
When an agent disconnects **during an active call**, the call ends immediately with no recovery:
- No grace period for agent to reconnect
- No attempt to route visitor to another agent
- Visitor just sees "Call ended" and must start over

**Solution:**
1. Add short grace period (5-10s) for agent to reconnect
2. If no reconnect, show visitor "Your connection errored"
3. Auto-pop NORMAL sized widget (not minimized) with new agent
4. This is different from intentional end - visitor didn't choose to end

**Files to Modify:**
- `apps/server/src/features/signaling/socket-handlers.ts` - Grace period logic for mid-call disconnect
- `apps/widget/src/Widget.tsx` - Error state + auto-reconnect to new agent

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] Agent disconnect mid-call triggers grace period (5-10s)
- [ ] If agent reconnects within grace period, call continues
- [ ] If timeout, visitor sees "Your connection errored" message
- [ ] Widget auto-pops to normal size with new agent (not minimized)
- [ ] Visitor doesn't have to manually restart
- [ ] All verification checks pass

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup (REQUIRED FIRST!)

```bash
git checkout main
git pull origin main
git checkout -b fix/FIX-004-disconnect-recovery
```

### Phase 1: Understand (10 min)

1. **Read** `apps/server/src/features/signaling/socket-handlers.ts:1373-1391` - Current disconnect handling
2. **Find** existing grace period logic (AGENT_DISCONNECT_GRACE_PERIOD) - it exists for pre-call
3. **Read** `apps/widget/src/Widget.tsx` - Understand call end handling
4. **Understand** difference between intentional end vs disconnect

### Phase 2: Implement

**Step 1: Server - Add mid-call grace period** (`socket-handlers.ts`)
- When agent disconnects during active call, DON'T immediately end
- Start grace period timer (use existing pattern)
- If agent reconnects, cancel timer and continue
- If timeout, then route visitor to new agent

**Step 2: Server - Route to new agent on timeout**
- Use `findBestAgentForVisitor()` to find new agent
- Emit event to visitor with error message + new agent info
- Include flag indicating this is error recovery, not intentional end

**Step 3: Widget - Handle error recovery** (`Widget.tsx`)
- Handle new event type for disconnect recovery
- Show "Your connection errored" message
- Auto-transition to connecting state with new agent
- Widget should be NORMAL size (not minimized)

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
git commit -m "fix(FIX-004): add grace period and auto-recovery for mid-call disconnect

- Agent disconnect during call now has grace period
- If agent doesn't reconnect, visitor auto-routed to new agent
- Widget shows error message then connects to new agent
- Visitor doesn't have to manually restart call

Closes FIX-004"

git push origin fix/FIX-004-disconnect-recovery
```

### Phase 5: Completion Report

```markdown
## Fix Complete: FIX-004 - Disconnect Recovery

### Git
**Branch:** `fix/FIX-004-disconnect-recovery`
**Commit:** [hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `socket-handlers.ts` | Grace period for mid-call disconnect, auto-routing |
| `Widget.tsx` | Error state, auto-reconnect UI |

### Verification Results
- [ ] `pnpm typecheck`: ✅/❌
- [ ] `pnpm lint`: ✅/❌
- [ ] `pnpm test`: ✅/❌
- [ ] `pnpm build`: ✅/❌

### Human Review Required?
- [x] UI Changes - Widget.tsx (error message, state transition)
- [x] WebRTC - Reconnection flow

### Status: READY FOR REVIEW
```

## Rules
1. **Stay in scope** - Only modify the 2 listed files
2. **Match existing patterns** - Use existing grace period logic as template
3. **All checks must pass**

## If You Have Questions
Add to `docs/findings/session-2024-12-02.md`

