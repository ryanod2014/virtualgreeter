# TEST LOCK Agent: UI4

> **Feature:** Platform Client Components
> **Priority:** High
> **Category:** Dashboard UI (Platform/Superadmin)

---

## Your Task

Lock in current UI behavior for platform (superadmin) client components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Platform client components are superadmin-level views for managing organizations, viewing cancellations, feedback, retargeting campaigns, and funnel analytics across the entire platform.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.tsx` | Org list, search, details | High |
| `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.tsx` | Cancellation list, reasons, trends | High |
| `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.tsx` | Feedback list, filtering, responses | Medium |
| `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.tsx` | Campaign list, create/edit campaigns | Medium |
| `apps/dashboard/src/app/(app)/platform/funnel/funnel-client.tsx` | Funnel visualization, conversion rates | Medium |

---

## Behaviors to Capture

### organizations-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists organizations, 2. Shows org details (name, plan, seats), 3. Shows search input, 4. Shows loading state |
| **Actions** | 5. Searches organizations, 6. Opens org detail view, 7. Filters by plan type, 8. Paginates |
| **Edge Cases** | 9. Handles empty search results, 10. Handles no organizations |

### cancellations-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists cancellations, 2. Shows cancellation reason, 3. Shows date/org info, 4. Shows trends chart |
| **Actions** | 5. Filters by date range, 6. Filters by reason, 7. Exports data |
| **Edge Cases** | 8. Handles no cancellations, 9. Handles date range with no data |

### feedback-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists feedback items, 2. Shows rating/score, 3. Shows feedback text, 4. Shows respondent info |
| **Actions** | 5. Filters by rating, 6. Filters by date, 7. Opens detail view, 8. Marks as reviewed |
| **Edge Cases** | 9. Handles no feedback, 10. Handles long feedback text |

### retargeting-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists campaigns, 2. Shows campaign status, 3. Shows metrics (sent, opened, clicked) |
| **Actions** | 4. Creates new campaign, 5. Edits campaign, 6. Toggles campaign active/inactive, 7. Deletes campaign |
| **Edge Cases** | 8. Handles no campaigns, 9. Validates campaign form |

### funnel-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows funnel stages, 2. Shows conversion rates, 3. Shows drop-off points, 4. Shows date range selector |
| **Actions** | 5. Changes date range, 6. Drills into stage details |
| **Edge Cases** | 7. Handles no data, 8. Handles partial funnel data |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/app/(app)/admin/pools/pools-client.test.tsx`
   - `apps/dashboard/src/lib/components/call-log-filter-conditions.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI4-[TIMESTAMP].md`

---

## Output

- `apps/dashboard/src/app/(app)/platform/organizations/organizations-client.test.tsx`
- `apps/dashboard/src/app/(app)/platform/cancellations/cancellations-client.test.tsx`
- `apps/dashboard/src/app/(app)/platform/feedback/feedback-client.test.tsx`
- `apps/dashboard/src/app/(app)/platform/retargeting/retargeting-client.test.tsx`
- `apps/dashboard/src/app/(app)/platform/funnel/funnel-client.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI4-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock data fetching hooks and API calls
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)
