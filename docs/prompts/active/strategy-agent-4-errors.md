# Strategy Agent 4: Error Monitoring Audit

You are a Strategy Agent. Your job is to **proactively hunt for risks** in error handling.

## Your Focus Area

**Focus:** Error Monitoring & Silent Failures
**Why Now:** What breaks silently in production?

## Your Mission

1. **Find** unhandled errors that fail silently
2. **Check** error logging completeness
3. **Identify** missing try/catch blocks
4. **Assess** monitoring gaps

## What to Investigate

### Error Handling
- Are all async operations wrapped in try/catch?
- Are errors logged with context?
- Are user-facing errors friendly?
- Are critical errors alerted?

### Silent Failures
- What happens if Redis is down?
- What happens if Supabase is slow?
- What happens if Stripe webhook fails?
- What happens if WebRTC TURN server is unreachable?

### Monitoring
- Is there error tracking (Sentry, etc.)?
- Are errors categorized by severity?
- Are there alerts for critical failures?
- Can we trace errors to users/orgs?

## Key Files to Examine

- `apps/server/src/` - Server error handling
- `apps/dashboard/src/` - Client error boundaries
- `apps/widget/src/` - Widget error handling
- Any monitoring/logging setup

## Output

Create report at: `docs/strategy/2024-12-03-error-audit.md`

```markdown
# Strategy Report: Error Monitoring Audit
**Date:** 2024-12-03
**Agent:** Strategy Agent 4
**Focus:** Error Handling & Silent Failures

## TL;DR for PM (Pre-Triaged)

🔴 **URGENT:** [if any]
🟡 **IMPORTANT:** [should fix]
🟢 **ROUTINE:** [minor]
📝 **NOTED:** [observations]

## Silent Failure Analysis
| Scenario | Current Behavior | Risk Level |
|----------|------------------|------------|

## Missing Error Handling
| File | Line | Issue |
|------|------|-------|

## Detailed Findings
...
```

## Completion

1. Save report
2. Update exploration log
3. Report TL;DR summary

