# Review Agent 10: FIX-004

You are a Review Agent. Review **FIX-004: Agent Disconnect Grace Period + Auto-Route**.

**Branch:** `fix/FIX-004-disconnect-recovery`

## Review Checklist

### 1. Grace Period Logic
- [ ] Mid-call disconnect triggers grace period (5-10s)
- [ ] Agent can reconnect within grace period
- [ ] Timer properly cleared on reconnect

### 2. Auto-Routing
- [ ] After timeout, visitor routed to new agent
- [ ] Uses findBestAgentForVisitor (respects pools)
- [ ] Proper error handling if no agents available

### 3. Widget Changes
- [ ] Shows "Your connection errored" message
- [ ] Auto-pops to normal size (not minimized)
- [ ] Transitions to connecting with new agent

### 4. Edge Cases
- [ ] What if no other agents available?
- [ ] What if visitor disconnects during grace period?
- [ ] Multiple rapid disconnects handled?

## How to Review
```bash
git checkout fix/FIX-004-disconnect-recovery
git diff main...fix/FIX-004-disconnect-recovery
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 10
- **Ticket:** FIX-004
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/FIX-004-disconnect-recovery
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

