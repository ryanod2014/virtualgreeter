# TEST LOCK Agent: UI2

> **Feature:** Admin Settings Client Components
> **Priority:** High
> **Category:** Dashboard UI

---

## Your Task

Lock in current UI behavior for admin settings client components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

Admin settings client components handle organization configuration: billing, recordings, blocklist, dispositions, and general organization settings. These are complex forms with validation and API interactions.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/app/(app)/admin/settings/organization/organization-settings-client.tsx` | Org name/settings forms, save actions | High |
| `apps/dashboard/src/app/(app)/admin/settings/dispositions/dispositions-client.tsx` | CRUD dispositions, list display | High |
| `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.tsx` | Recording toggles, retention settings | Medium |
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Add/remove blocked items, list display | Medium |
| `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.tsx` | Plan display, upgrade/downgrade actions | High |

---

## Behaviors to Capture

### organization-settings-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows current org name, 2. Shows settings form fields, 3. Shows loading state |
| **Actions** | 4. Updates form on input change, 5. Calls save on submit, 6. Shows success/error feedback |
| **Validation** | 7. Validates required fields, 8. Disables submit when invalid |

### dispositions-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists existing dispositions, 2. Shows add form, 3. Shows empty state |
| **Actions** | 4. Adds new disposition, 5. Edits existing, 6. Deletes disposition, 7. Reorders list |
| **Edge Cases** | 8. Handles empty list, 9. Confirms before delete |

### recording-settings-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows recording toggle state, 2. Shows retention period, 3. Shows storage info |
| **Actions** | 4. Toggles recording on/off, 5. Updates retention period, 6. Saves changes |

### blocklist-settings-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists blocked items, 2. Shows add input, 3. Shows empty state |
| **Actions** | 4. Adds to blocklist, 5. Removes from blocklist, 6. Validates input format |

### billing-settings-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows current plan, 2. Shows billing cycle, 3. Shows payment method, 4. Shows seat count |
| **Actions** | 5. Opens upgrade modal, 6. Opens cancel modal, 7. Updates payment method |
| **Edge Cases** | 8. Handles no subscription, 9. Shows trial info if applicable |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx`
   - `apps/dashboard/src/app/(app)/admin/settings/billing/cancel-subscription-modal.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI2-[TIMESTAMP].md`

---

## Output

- `apps/dashboard/src/app/(app)/admin/settings/organization/organization-settings-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/settings/dispositions/dispositions-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/settings/recordings/recording-settings-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.test.tsx`
- `apps/dashboard/src/app/(app)/admin/settings/billing/billing-settings-client.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI2-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock any data fetching hooks or server actions
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)



