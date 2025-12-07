# TEST LOCK Agent: UI5

> **Feature:** Dashboard Client Components
> **Priority:** High
> **Category:** Dashboard UI (Agent-facing)

---

## Your Task

Lock in current UI behavior for agent-facing dashboard client components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

These components power the agent dashboard experience: viewing their calls, the main dashboard layout, public feedback pages, and the workbench where agents take calls.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.tsx` | Agent's call history, filtering | High |
| `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx` | Dashboard layout, navigation | High |
| `apps/dashboard/src/app/(app)/feedback/public-feedback-client.tsx` | Public feedback form display | Medium |
| `apps/dashboard/src/features/workbench/workbench-client.tsx` | Workbench UI, call handling | Critical |

---

## Behaviors to Capture

### agent-calls-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists agent's calls, 2. Shows call details (time, duration, visitor), 3. Shows empty state, 4. Shows loading state |
| **Actions** | 5. Filters by date range, 6. Filters by disposition, 7. Opens call detail, 8. Paginates |
| **Edge Cases** | 9. Handles no calls, 10. Handles filter with no results |

### dashboard-layout-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders navigation sidebar, 2. Renders main content area, 3. Shows agent status indicator, 4. Shows active nav item |
| **Actions** | 5. Toggles sidebar on mobile, 6. Changes agent status |
| **Edge Cases** | 7. Handles different screen sizes, 8. Handles offline state |

### public-feedback-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows feedback form, 2. Shows rating selector, 3. Shows text input, 4. Shows success message after submit |
| **Actions** | 5. Selects rating, 6. Enters feedback text, 7. Submits feedback |
| **Validation** | 8. Requires rating, 9. Shows error on submit failure |

### workbench-client.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows waiting state when no call, 2. Shows incoming call UI, 3. Shows active call UI, 4. Shows agent status |
| **Actions** | 5. Accepts incoming call, 6. Rejects incoming call, 7. Ends active call, 8. Toggles mute/video |
| **Edge Cases** | 9. Handles call timeout, 10. Handles disconnection, 11. Shows reconnecting state |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx`
   - `apps/dashboard/src/features/webrtc/active-call-stage.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI5-[TIMESTAMP].md`

---

## Output

- `apps/dashboard/src/app/(app)/dashboard/calls/agent-calls-client.test.tsx`
- `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.test.tsx`
- `apps/dashboard/src/app/(app)/feedback/public-feedback-client.test.tsx`
- `apps/dashboard/src/features/workbench/workbench-client.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI5-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock WebRTC and socket connections for workbench
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)

