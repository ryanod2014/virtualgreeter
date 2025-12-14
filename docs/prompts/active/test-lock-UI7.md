# TEST LOCK Agent: UI7

> **Feature:** Sidebars & Admin Feature Components
> **Priority:** Medium
> **Category:** Dashboard UI (Features)

---

## Your Task

Lock in current UI behavior for sidebar and miscellaneous feature components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

These components handle navigation sidebars, feedback collection buttons, and survey triggers that appear contextually throughout the app.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/features/admin/components/admin-sidebar.tsx` | Admin navigation, active states | High |
| `apps/dashboard/src/features/feedback/feedback-buttons.tsx` | Feedback collection UI, rating buttons | Medium |
| `apps/dashboard/src/features/surveys/survey-trigger.tsx` | Survey popup trigger, timing | Medium |

---

## Behaviors to Capture

### admin-sidebar.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders all nav items, 2. Shows icons for each item, 3. Highlights active item, 4. Shows collapsed state on mobile |
| **Navigation** | 5. Each item links to correct route, 6. Sub-menus expand/collapse |
| **Permissions** | 7. Hides items user doesn't have access to, 8. Shows all items for admin |

### feedback-buttons.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows thumbs up/down buttons, 2. Shows neutral option if enabled, 3. Shows selected state |
| **Actions** | 4. Calls onFeedback with positive, 5. Calls onFeedback with negative, 6. Disables after selection |
| **Edge Cases** | 7. Handles already-submitted state, 8. Shows loading during submission |

### survey-trigger.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Hidden by default, 2. Shows after trigger conditions met, 3. Shows survey content |
| **Timing** | 4. Respects delay setting, 5. Respects frequency limits, 6. Checks localStorage for previous responses |
| **Actions** | 7. Opens survey modal, 8. Dismisses and remembers dismissal, 9. Submits response |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx`
   - `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI7-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `next/navigation` for routing tests
- Mock `localStorage` for survey trigger persistence
- Use `vi.useFakeTimers()` for timing-based tests

---

## Output

- `apps/dashboard/src/features/admin/components/admin-sidebar.test.tsx`
- `apps/dashboard/src/features/feedback/feedback-buttons.test.tsx`
- `apps/dashboard/src/features/surveys/survey-trigger.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI7-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock `next/navigation` for Link/useRouter
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)




