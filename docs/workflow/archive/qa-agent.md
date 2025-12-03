# QA Agent: [TICKET-ID] - [Brief Title]

> **One-liner to launch:**
> `Read and execute docs/prompts/active/qa-agent-[TICKET-ID]-v[N].md`

---

You are a QA Agent. Your job is to test **[TICKET-ID]: [Full Title]**.

**First, read the QA Agent SOP:** `docs/workflow/QA_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** [TICKET-ID]
**Priority:** P0/P1/P2
**Branch:** `[branch-name]`
**Version:** v[N]

---

## What Was Implemented

[Brief description of what the dev agent built]

### Files Changed:
- `[file1]` - [what changed]
- `[file2]` - [what changed]

---

## Expected Behavior

Reference: `docs/features/[feature].md`

[Description of how this should work according to feature docs]

---

## Test Scenarios

### Automated Tests (You Execute)

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | [Happy path] | [steps] | [expected] |
| 2 | [Edge case] | [steps] | [expected] |
| 3 | [Error case] | [steps] | [expected] |

### Human Tests (Create in human-qa-queue.md if needed)

| # | Scenario | Why Human? |
|---|----------|------------|
| 1 | [Visual/UX test] | [reason] |

---

## Build Verification

```bash
pnpm typecheck --filter=[package]
pnpm lint --filter=[package]
pnpm build --filter=[package]
```

All must pass!

---

## Testing Instructions

### Environment Setup
[Any specific setup needed]

### How to Test
1. [Step 1]
2. [Step 2]
3. [Step 3]

---

## Related Documentation

- Feature Doc: `docs/features/[feature].md`
- Dev Ticket: `docs/prompts/archive/dev-agent-[TICKET-ID]-v[N].md`

---

## ⚠️ REQUIRED: Notify PM When Done

**Append to `docs/agent-inbox/completions.md` when you start AND when you finish.**

See `docs/workflow/QA_AGENT_SOP.md` for the exact format.

**If human QA is needed, also add entry to `docs/human-qa-queue.md`.**

