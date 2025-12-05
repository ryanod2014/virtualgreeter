# TEST LOCK Agent: [FEATURE-ID]

> **Feature:** [Feature name from inventory]
> **Priority:** [Critical/High/Medium/Low]
> **Doc:** `docs/features/[category]/[feature].md`

---

## Your Task

Lock in current behavior for all code in this feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

[1-2 sentence summary from feature doc]

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `[path]` | `[functions/classes]` | [High/Medium/Low] |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### [File 1]

| Function | Behaviors to Test |
|----------|-------------------|
| `functionName` | 1. Happy path: [desc], 2. Edge: [desc], 3. Error: [desc] |

### [File 2]

| Function | Behaviors to Test |
|----------|-------------------|
| `functionName` | 1. [desc], 2. [desc] |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `[doc path]`
3. Read each source file listed above
4. Read existing test patterns: `apps/server/src/features/routing/pool-manager.test.ts`
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report

---

## Output

- Test files in same directory as source files
- Completion report: `docs/agent-output/test-lock/[FEATURE-ID]-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")
