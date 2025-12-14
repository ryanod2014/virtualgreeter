# TEST LOCK Agent: UI8

> **Feature:** Lib Components - Forms & Pickers
> **Priority:** Medium
> **Category:** Dashboard UI (Shared Components)

---

## Your Task

Lock in current UI behavior for shared form and picker components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

These are reusable form components used throughout the dashboard: date range pickers, country selectors, multi-select dropdowns, and FAQ accordions.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/lib/components/date-range-picker.tsx` | Date selection, range validation | High |
| `apps/dashboard/src/lib/components/country-selector.tsx` | Country search, selection | Medium |
| `apps/dashboard/src/lib/components/multi-select-dropdown.tsx` | Multiple selection, search | High |
| `apps/dashboard/src/lib/components/FAQAccordion.tsx` | Expand/collapse, content display | Low |

---

## Behaviors to Capture

### date-range-picker.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows current date range, 2. Opens calendar on click, 3. Highlights selected range, 4. Shows preset options (Today, Last 7 days, etc.) |
| **Actions** | 5. Selects start date, 6. Selects end date, 7. Applies preset range, 8. Clears selection |
| **Validation** | 9. Prevents end before start, 10. Respects min/max dates |
| **Edge Cases** | 11. Handles single day selection, 12. Handles timezone correctly |

### country-selector.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows placeholder when empty, 2. Shows selected country with flag, 3. Opens dropdown on click, 4. Shows searchable country list |
| **Actions** | 5. Filters countries on search, 6. Selects country on click, 7. Clears selection |
| **Edge Cases** | 8. Handles no search results, 9. Handles keyboard navigation |

### multi-select-dropdown.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows placeholder when empty, 2. Shows selected items as chips/tags, 3. Opens dropdown on click, 4. Shows checkboxes for each option |
| **Actions** | 5. Adds item on click, 6. Removes item on click, 7. Clears all selections, 8. Searches/filters options |
| **Edge Cases** | 9. Handles max selections limit, 10. Handles empty options list |

### FAQAccordion.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows all questions collapsed by default, 2. Shows expand icon, 3. Shows question text |
| **Actions** | 4. Expands on question click, 5. Collapses on second click, 6. Only one open at a time (if exclusive mode) |
| **Edge Cases** | 7. Handles empty FAQ list, 8. Handles long content |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/lib/components/call-log-filter-conditions.test.tsx`
   - `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI8-[TIMESTAMP].md`

---

## Mocking Notes

- May need to mock date libraries (date-fns, dayjs)
- Mock country data if fetched externally

---

## Output

- `apps/dashboard/src/lib/components/date-range-picker.test.tsx`
- `apps/dashboard/src/lib/components/country-selector.test.tsx`
- `apps/dashboard/src/lib/components/multi-select-dropdown.test.tsx`
- `apps/dashboard/src/lib/components/FAQAccordion.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI8-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Test keyboard accessibility where applicable
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)





