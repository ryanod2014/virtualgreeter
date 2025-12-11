# TEST LOCK Agent: UI6

> **Feature:** Signaling & Workbench Feature Components
> **Priority:** High
> **Category:** Dashboard UI (Core Features)

---

## Your Task

Lock in current UI behavior for signaling providers and workbench feature components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

These components handle the core real-time functionality: socket connections, dashboard shell state management, and workbench UI elements like stats cards and agent sidebar.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/features/signaling/signaling-provider.tsx` | Socket connection, context provision | Critical |
| `apps/dashboard/src/features/signaling/dashboard-shell.tsx` | Shell state, connection status | High |
| `apps/dashboard/src/features/signaling/app-shell.tsx` | App-level shell, layout | High |
| `apps/dashboard/src/features/workbench/stats-card.tsx` | Stats display, formatting | Medium |
| `apps/dashboard/src/features/workbench/agent-sidebar.tsx` | Agent list, status indicators | High |

---

## Behaviors to Capture

### signaling-provider.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders children when connected, 2. Shows loading while connecting, 3. Shows error on connection failure |
| **Context** | 4. Provides socket to children, 5. Provides connection state, 6. Provides emit/on helpers |
| **Lifecycle** | 7. Connects on mount, 8. Disconnects on unmount, 9. Reconnects on connection loss |

### dashboard-shell.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows connected indicator, 2. Shows disconnected indicator, 3. Renders main content area |
| **State** | 4. Tracks agent status, 5. Tracks incoming call state, 6. Tracks active call state |
| **Actions** | 7. Updates on socket events, 8. Handles status changes |

### app-shell.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders header, 2. Renders sidebar, 3. Renders main content, 4. Responsive layout |
| **Actions** | 5. Toggles mobile menu, 6. Handles navigation |

### stats-card.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows title, 2. Shows value, 3. Shows icon, 4. Shows trend indicator (up/down/neutral) |
| **Formatting** | 5. Formats numbers correctly, 6. Formats percentages, 7. Formats durations |
| **Edge Cases** | 8. Handles zero values, 9. Handles null/undefined |

### agent-sidebar.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Lists agents, 2. Shows agent status (available, busy, away, offline), 3. Shows agent name/avatar |
| **Actions** | 4. Selects agent, 5. Filters agents |
| **Real-time** | 6. Updates when agent status changes, 7. Shows new agent when they come online |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx`
   - `apps/dashboard/src/features/webrtc/active-call-stage.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI6-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `socket.io-client` for signaling tests
- Use `vi.fn()` to track socket event handlers
- Mock context providers when testing consumers

---

## Output

- `apps/dashboard/src/features/signaling/signaling-provider.test.tsx`
- `apps/dashboard/src/features/signaling/dashboard-shell.test.tsx`
- `apps/dashboard/src/features/signaling/app-shell.test.tsx`
- `apps/dashboard/src/features/workbench/stats-card.test.tsx`
- `apps/dashboard/src/features/workbench/agent-sidebar.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI6-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock socket.io-client for signaling components
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)



