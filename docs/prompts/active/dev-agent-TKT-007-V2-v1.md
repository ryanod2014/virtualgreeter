# Dev Agent Continuation: TKT-007-V2

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-007-V2-v1.md`

---

## ⚠️ CONTINUATION - Previous Attempt Failed

**Original Ticket:** TKT-007
**Blocker Type:** REGRESSION-FAILED
**Attempt:** v2

### What Went Wrong

Regression tests failed - dev broke code outside ticket scope

### Error Output
```
/Users/ryanodonnell/projects/Digital_greeter/scripts/run-regression-tests.sh: line 63: agent/${TICKET_ID,,}: bad substitution
```

Note: This appears to be a script syntax error, not an actual code issue. The previous work may be complete.

### Your Task

1. Verify the previous work is actually complete
2. Run `pnpm typecheck` and `pnpm build` to confirm no issues
3. If all checks pass, commit and push

---

You are a Dev Agent. Your job is to implement **TKT-007-V2: Fix Public Feedback Feature Documentation**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-007-V2
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-007-fix-public-feedback-feature-do` (ALREADY EXISTS - continue from here)
**Version:** v2

---

## The Problem

The 'Public Feedback' feature documentation describes it as 'Post-call feedback for visitors' but the actual feature is a UserVoice-style feature request voting system for authenticated dashboard users.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `docs/features/visitor/public-feedback.md` | Implement required changes |


**Feature Documentation:**
- `docs/features/visitor/public-feedback.md`



---

## What to Implement

1. Rename to 'Feature Request Voting & Bug Reporting'
2. Update description to explain it's for authenticated dashboard users
3. Clarify that 'public' means cross-organization visibility, not anonymous access

---

## Acceptance Criteria

- [ ] Feature doc accurately describes the voting/feedback system
- [ ] No mention of 'visitors' or 'post-call' in context of feedback
- [ ] Clear that authentication is required

---

## Out of Scope

- ❌ Do NOT modify actual feature code
- ❌ Do NOT change feature behavior

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Documentation only - no production risk | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Read updated doc for accuracy
- Verify no broken links

---

## QA Notes

N/A - documentation only.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-007-V2-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-007-V2-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-007-V2-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-007-V2-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
