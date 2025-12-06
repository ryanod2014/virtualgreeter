# TEST LOCK Agent: UI1

> **Feature:** Modal Components
> **Priority:** Critical
> **Category:** Dashboard UI

---

## Your Task

Lock in current UI behavior for modal components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Modal components handle critical user interactions: confirmations, form submissions, and user decisions. These must be thoroughly tested to prevent UI regressions.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.tsx` | Pause confirmation, form submission, loading states | High |
| `apps/dashboard/src/features/workbench/post-call-disposition-modal.tsx` | Disposition selection, notes input, submission | High |
| `apps/dashboard/src/features/surveys/ellis-survey-modal.tsx` | Survey display, response collection, submission | High |

---

## Behaviors to Capture

### pause-account-modal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Returns null when not open, 2. Shows modal content when open, 3. Displays warning message |
| **Actions** | 4. Calls onConfirm when confirmed, 5. Calls onClose when cancelled, 6. Shows loading state during submission |
| **Edge Cases** | 7. Disables buttons during loading, 8. Handles submission errors |

### post-call-disposition-modal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Returns null when not visible, 2. Shows disposition options, 3. Shows notes textarea |
| **Actions** | 4. Selects disposition on click, 5. Updates notes on input, 6. Calls onSubmit with data, 7. Calls onSkip when skipped |
| **Validation** | 8. Submit enabled/disabled based on selection |

### ellis-survey-modal.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Returns null when not open, 2. Shows survey questions, 3. Shows progress indicator |
| **Actions** | 4. Records responses, 5. Advances to next question, 6. Submits on completion |
| **Edge Cases** | 7. Handles empty responses, 8. Shows completion state |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx`
   - `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI1-[TIMESTAMP].md`

---

## Output

- `apps/dashboard/src/app/(app)/admin/settings/billing/pause-account-modal.test.tsx`
- `apps/dashboard/src/features/workbench/post-call-disposition-modal.test.tsx`
- `apps/dashboard/src/features/surveys/ellis-survey-modal.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI1-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)
- [ ] Followed patterns from reference test files
