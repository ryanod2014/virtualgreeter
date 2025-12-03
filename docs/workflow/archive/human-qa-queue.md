# Human QA Queue

> **Purpose:** Testing scenarios that require human verification.
>
> QA Agents add entries here. Humans mark Pass/Fail and remove when complete.

---

## 🔴 Pending Human QA

*No items currently pending*

---

## Format Template

When QA Agents add items, use this format:

```markdown
## [TICKET-ID] - [Brief Description]

**Priority:** P0/P1/P2
**Branch:** `[branch-name]`  
**Related Feature Doc:** `docs/features/[feature].md`
**QA Agent:** [Agent identifier]
**Created:** [Date]

### Test Scenarios

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 1 | [description] | 1. [step] 2. [step] 3. [step] | [expected] | ⬜ |
| 2 | [description] | 1. [step] 2. [step] | [expected] | ⬜ |

### Environment
- URL: [staging URL or localhost:3000]
- Test Account: [email / password if needed]
- Prerequisites: [any setup steps]

### Notes for Human Tester
[Context, gotchas, or things to watch for]

---
```

---

## ✅ Completed Human QA

*Move completed items here with results*

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not tested |
| ✅ | Passed |
| ❌ | Failed |
| ⏭️ | Skipped (with reason) |

---

## Human Tester Workflow

1. Pick the highest priority item
2. Set up the environment (checkout branch, start servers)
3. Execute each scenario
4. Mark Pass/Fail in the table
5. If FAILED: Add notes describing the failure
6. When all scenarios done:
   - If ALL PASS: Move to "Completed Human QA" section
   - If ANY FAIL: Leave in "Pending" and notify PM (comment in completions.md)

