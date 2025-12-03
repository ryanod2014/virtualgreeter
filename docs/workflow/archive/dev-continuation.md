# Dev Agent: [TICKET-ID] - [Brief Title] (Continuation)

> **One-liner to launch:**
> `Read and execute docs/prompts/active/dev-agent-[TICKET-ID]-v[N].md`

---

You are a Dev Agent. Your job is to **CONTINUE** implementation of **[TICKET-ID]: [Full Title]**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** [TICKET-ID]
**Priority:** P0/P1/P2
**Type:** Bug Fix / Feature / Refactor
**Branch:** `[branch-name]`
**Version:** v[N] (Continuation from v[N-1])

---

## Previous Progress

### What Was Done in v[N-1]:
- [Completed item 1]
- [Completed item 2]
- [Completed item 3]

### Where It Stopped:
[Description of the exact point where work paused]

### Last Commit:
```
[commit hash] - [commit message]
```

---

## Answers to Previous Questions

### Question 1: [The question that was asked]
**Answer:** [The answer/decision]
**Reasoning:** [Why this decision was made]

### Question 2: [If there was another question]
**Answer:** [The answer/decision]

---

## What Remains to Be Done

[Clear description of remaining work]

### Remaining Requirements
1. [Remaining requirement 1]
2. [Remaining requirement 2]

---

## Files to Modify

| File | What to Change | Status |
|------|----------------|--------|
| `[file1]` | [description] | ✅ Done in v[N-1] |
| `[file2]` | [description] | ⏳ Remaining |
| `[file3]` | [description] | ⏳ Remaining |

---

## Implementation Guide (Remaining Steps)

### Step [X]: [Next step to do]
[Details]

### Step [X+1]: [Following step]
[Details]

---

## Acceptance Criteria

- [x] [Completed criterion from v[N-1]]
- [ ] [Remaining criterion]
- [ ] [Remaining criterion]
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build passes
- [ ] Tests pass

---

## Related Documentation

- Feature Doc: `docs/features/[feature].md`
- Previous Ticket Spec: `docs/prompts/archive/dev-agent-[TICKET-ID]-v[N-1].md`
- [Other relevant docs]

---

## ⚠️ REQUIRED: Notify PM When Done

**Append to `docs/agent-inbox/completions.md` when you start AND when you finish.**

See `docs/workflow/DEV_AGENT_SOP.md` for the exact format.

