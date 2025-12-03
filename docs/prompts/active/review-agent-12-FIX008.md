# Review Agent 12: FIX-008

You are a Review Agent. Review **FIX-008: Sync localStorage Reconnect Token Expiry to 30s**.

**Branch:** `fix/FIX-008-reconnect-expiry-sync`

## Review Checklist

### 1. Change Verification
- [ ] `CALL_EXPIRY_MS` changed from 5 minutes to 30 seconds
- [ ] Value is `30 * 1000` (30000ms)
- [ ] Comment explains why (matches server timeout)

### 2. Consistency
- [ ] Matches server's `CALL_RECONNECT_TIMEOUT` (30s)
- [ ] No other places reference the old 5-minute value

### 3. No Regressions
- [ ] Reconnection still works within 30s window
- [ ] Token properly expires after 30s

## How to Review
```bash
git checkout fix/FIX-008-reconnect-expiry-sync
git diff main...fix/FIX-008-reconnect-expiry-sync
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 12
- **Ticket:** FIX-008
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/FIX-008-reconnect-expiry-sync
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

