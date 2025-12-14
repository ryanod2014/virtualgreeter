# TEST LOCK Agent: UI3

> **Feature:** Admin Feature Client Components
> **Priority:** High
> **Category:** Dashboard UI

---

## Your Task

Lock in current UI behavior for admin feature client components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Admin feature clients handle core admin functionality: call logs, agent details, site setup, and admin layout. These components display data and handle admin-level interactions.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/app/(app)/admin/calls/calls-client.tsx` | Call list display, filtering, pagination | High |
| `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.tsx` | Agent stats display, date range selection | High |
| `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.tsx` | Site configuration, embed code | High |
| `apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx` | Layout rendering, navigation state | Medium |

---

## Behaviors to Capture

### calls-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders call list table, 2. Shows call details (duration, agent, visitor), 3. Shows empty state, 4. Shows loading state |
| **Actions** | 5. Filters by date range, 6. Filters by agent, 7. Filters by disposition, 8. Paginates results, 9. Opens call detail |
| **Edge Cases** | 10. Handles no calls, 11. Handles filter with no results |

### agent-stats-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows agent name/info, 2. Shows call count, 3. Shows average duration, 4. Shows charts/graphs |
| **Actions** | 5. Changes date range, 6. Refreshes data |
| **Edge Cases** | 7. Handles no stats data, 8. Handles loading state |

### site-setup-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows site list, 2. Shows embed code, 3. Shows configuration options |
| **Actions** | 4. Adds new site, 5. Edits site settings, 6. Copies embed code, 7. Deletes site |
| **Edge Cases** | 8. Handles no sites, 9. Validates domain format |

### admin-layout-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders sidebar, 2. Renders main content area, 3. Shows current nav item as active |
| **Actions** | 4. Toggles sidebar on mobile, 5. Navigates between sections |
| **Edge Cases** | 6. Handles different screen sizes |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/app/(app)/admin/agents/agents-client.test.tsx`
   - `apps/dashboard/src/app/(app)/admin/pools/pools-client.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI3-[TIMESTAMP].md`

---

## Output

- `apps/dashboard/src/app/(app)/admin/calls/calls-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/agents/[agentId]/agent-stats-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/sites/site-setup-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/admin-layout-client.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI3-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock data fetching hooks and API calls
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)




