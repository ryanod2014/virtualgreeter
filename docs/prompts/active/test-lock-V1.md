# TEST LOCK Agent: V1

> **Feature:** Widget Lifecycle
> **Priority:** Critical
> **Doc:** `docs/features/visitor/widget-lifecycle.md`

---

## Your Task

Lock in current behavior for all code in the Widget Lifecycle feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Widget Lifecycle manages the complete UI state machine of the embedded video widget that website visitors interact with. It handles visibility states (hidden → minimized → open → fullscreen), drag-and-drop positioning with corner snapping, trigger delays, auto-hide behavior, device detection, theme switching, and seamless integration with the video sequencer and call flow.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/widget/src/Widget.tsx` | `Widget` component, state machine, drag handlers | High |
| `apps/widget/src/main.tsx` | `init()`, `validateConfig()` | High |
| `apps/widget/src/widget-styles.ts` | `getWidgetStyles()` | Medium |
| `apps/widget/src/features/signaling/useSignaling.ts` | `storeWidgetState()`, `shouldSkipIntroForAgent()` | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### Widget.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **State Machine** | 1. Initial state is "hidden", 2. Transitions to "open" after trigger delay + agent assigned, 3. Stays "hidden" if no agent, 4. "open" → "minimized" on minimize click, 5. "open" → "waiting_for_agent" on camera/mic click, 6. "in_call" → "minimized" on call end |
| **Trigger Delay** | 7. Uses widgetSettings.trigger_delay value, 8. Accounts for time already on page (visitorConnectedAt), 9. Timer cleared on unmount |
| **Auto-Hide** | 10. Minimizes after auto_hide_delay when no interaction, 11. Cancelled when userHasInteractedRef is true, 12. Only active when state is "open" |
| **Device Detection** | 13. isMobileDevice() returns true for small screens (<768px), 14. Returns true for touch devices without fine pointer, 15. Widget hides when devices="desktop" and on mobile |
| **Drag & Drop** | 16. handleDragStart captures initial position, 17. handleDragMove updates transform directly (no React state), 18. handleDragEnd snaps to nearest of 5 positions, 19. Drag disabled when isFullscreen=true |

### main.tsx

| Function | Behaviors to Test |
|----------|-------------------|
| `validateConfig` | 1. Returns error for missing orgId, 2. Returns error for invalid serverUrl, 3. Returns success for valid config |
| `init` | 4. Prevents duplicate initialization (checks existing element), 5. Creates Shadow DOM container, 6. Injects styles into shadow root |

### useSignaling.ts (Widget State Persistence)

| Function | Behaviors to Test |
|----------|-------------------|
| `storeWidgetState` | 1. Saves agent, videoUrls, timestamp to localStorage |
| `shouldSkipIntroForAgent` | 2. Returns true for same agent + same video URLs, 3. Returns false for different agent, 4. Returns false for different video URLs |
| `getStoredWidgetState` | 5. Returns null if no stored state, 6. Returns null if expired, 7. Returns valid state if within expiry |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/visitor/widget-lifecycle.md`
3. Read each source file listed above
4. Read existing test patterns: `apps/dashboard/middleware.test.ts`
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/V1-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `socket.io-client` for signaling connection
- Mock `localStorage` for state persistence
- Mock `window.innerWidth` and `matchMedia` for device detection
- For React component testing, use `@testing-library/react` or similar

---

## Output

- `apps/widget/src/Widget.test.tsx`
- `apps/widget/src/main.test.ts`
- `apps/widget/src/features/signaling/useSignaling.test.ts` (widget state tests)
- Completion report: `docs/agent-output/test-lock/V1-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (validation, success, errors)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")

