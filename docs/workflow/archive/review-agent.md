# Code Review: [TICKET-ID] - [Brief Title]

> **One-liner to launch:**
> `Read and execute docs/prompts/active/review-agent-[TICKET-ID].md`

---

You are a Code Review Agent. Your job is to review the code changes for **[TICKET-ID]: [Full Title]**.

**First, read the Review Agent SOP:** `docs/workflow/REVIEW_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** [TICKET-ID]
**Priority:** P0/P1/P2
**Branch:** `[branch-name]`

---

## What Was Changed

[Brief description of the implementation]

### Files Changed:
- `[file1]` - [what changed]
- `[file2]` - [what changed]

---

## Review Checklist

### Core Fix
- [ ] Change accomplishes what the ticket describes
- [ ] Matches intended behavior in `docs/features/[feature].md`
- [ ] All acceptance criteria met

### Code Quality
- [ ] Follows existing patterns
- [ ] No unnecessary changes
- [ ] Clear, readable code
- [ ] No debug code left in

### Error Handling
- [ ] Errors handled appropriately
- [ ] Edge cases considered

### Security
- [ ] No new data exposure
- [ ] Authorization checks in place

---

## Acceptance Criteria (from Dev Ticket)

- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

---

## How to Review

```bash
git fetch origin
git checkout [branch-name]
git diff main..HEAD
```

---

## Related Documentation

- Feature Doc: `docs/features/[feature].md`
- Dev Ticket: `docs/prompts/archive/dev-agent-[TICKET-ID]-v[N].md`

---

## ⚠️ REQUIRED: Notify PM When Done

**Append to `docs/agent-inbox/completions.md` when you start AND when you finish.**

See `docs/workflow/REVIEW_AGENT_SOP.md` for the exact format.

