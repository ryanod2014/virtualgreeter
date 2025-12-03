# Review Agent 4: FIX-007

You are a Review Agent. Your job is to review the code changes for **FIX-007: Add Analytics Event for Video Load Failures**.

## Your Assignment

**Ticket:** FIX-007
**Branch:** `fix/FIX-007-video-load-analytics`
**Files Changed:** `apps/widget/src/features/simulation/VideoSequencer.tsx`

## Review Checklist

### 1. Analytics Event
- [ ] Event fires when video fails to load
- [ ] Uses existing analytics pattern in widget
- [ ] Event name follows conventions

### 2. Event Data
- [ ] Includes video type (wave/intro/loop)
- [ ] Includes error message
- [ ] Includes retry count if applicable
- [ ] No sensitive data included

### 3. Error Handler Integration
- [ ] Analytics call doesn't break error recovery flow
- [ ] Retry button still works
- [ ] User experience unchanged

### 4. No Regressions
- [ ] Existing error handling preserved
- [ ] Tests pass

## How to Review

```bash
git checkout fix/FIX-007-video-load-analytics
git diff main...fix/FIX-007-video-load-analytics
```

## Output Format

```markdown
## Review: FIX-007

### Summary
[APPROVED / CHANGES REQUESTED / BLOCKED]

### Analytics Event: ✅/⚠️/❌
### Event Data: ✅/⚠️/❌
### Integration: ✅/⚠️/❌

### Issues Found
| Severity | Issue | File:Line | Recommendation |

### Verdict
- [ ] ✅ APPROVED - Ready for QA
- [ ] ⚠️ CHANGES REQUESTED
- [ ] ❌ BLOCKED
```

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 4
- **Ticket:** FIX-007
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/FIX-007-video-load-analytics
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

