# TEST LOCK Agent: UI10

> **Feature:** Miscellaneous & Widget Components
> **Priority:** Low
> **Category:** Dashboard UI & Widget

---

## Your Task

Lock in current UI behavior for miscellaneous dashboard components and remaining widget components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

This batch covers remaining components: mobile redirect logic, logo display, widget demo, and widget-side components (initialization and unmute modal).

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/lib/components/MobileRedirect.tsx` | Mobile detection, redirect logic | Medium |
| `apps/dashboard/src/lib/components/logo.tsx` | Logo display, variants | Low |
| `apps/dashboard/src/lib/components/WidgetDemo.tsx` | Demo widget display, interactions | Medium |
| `apps/widget/src/main.tsx` | Widget initialization, config validation | High |
| `apps/widget/src/features/simulation/UnmuteModal.tsx` | Unmute prompt, audio unlock | High |

---

## Behaviors to Capture

### MobileRedirect.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Detection** | 1. Detects mobile device correctly, 2. Detects tablet as mobile (or not based on config) |
| **Redirect** | 3. Redirects mobile users to mobile page, 4. Does not redirect desktop users |
| **Edge Cases** | 5. Handles SSR (no window), 6. Respects override/bypass parameter |

### logo.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders logo image, 2. Applies correct size variant, 3. Applies correct color variant |
| **Variants** | 4. Shows full logo by default, 5. Shows icon-only when specified, 6. Shows dark/light variant |

### WidgetDemo.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Renders demo widget container, 2. Shows widget in different states, 3. Shows controls for state switching |
| **Interactions** | 4. Switches widget state on control click, 5. Shows minimized state, 6. Shows expanded state |
| **Edge Cases** | 7. Handles responsive sizing |

### main.tsx (Widget)

| Area | Behaviors to Test |
|------|-------------------|
| **Initialization** | 1. `init()` creates container element, 2. Validates required config (orgId), 3. Validates serverUrl format |
| **Validation** | 4. Returns error for missing orgId, 5. Returns error for invalid serverUrl, 6. Returns success for valid config |
| **DOM** | 7. Prevents duplicate initialization, 8. Creates shadow DOM container, 9. Injects styles into shadow root |

### UnmuteModal.tsx (Widget)

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows when audio is muted/locked, 2. Shows unmute button, 3. Shows explanation text |
| **Actions** | 4. Calls onUnmute when button clicked, 5. Closes modal after unmute |
| **Edge Cases** | 6. Handles iOS-specific behavior, 7. Handles already-unmuted state |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/widget/src/Widget.test.tsx`
   - `apps/widget/src/features/webrtc/LiveCallView.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI10-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `window.matchMedia` for mobile detection
- Mock `navigator.userAgent` for device detection
- Mock audio context for unmute testing
- For widget main.tsx, mock DOM APIs

---

## Output

- `apps/dashboard/src/lib/components/MobileRedirect.test.tsx`
- `apps/dashboard/src/lib/components/logo.test.tsx`
- `apps/dashboard/src/lib/components/WidgetDemo.test.tsx`
- `apps/widget/src/main.test.ts`
- `apps/widget/src/features/simulation/UnmuteModal.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI10-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons (dashboard components)
- [ ] Mock browser APIs for device detection
- [ ] One behavior per `it()` block
- [ ] Test Display, Actions, and Edge Cases
- [ ] All tests PASS (they test current behavior)



