# TEST LOCK Agent: A5

> **Feature:** Co-Browse Viewer
> **Priority:** High
> **Doc:** `docs/features/agent/cobrowse-viewer.md`

---

## Your Task

Lock in current behavior for all code in the Co-Browse Viewer feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Co-Browse Viewer allows agents to see a real-time, read-only view of the visitor's screen during an active call. It displays the visitor's DOM, tracks their mouse cursor position, synchronizes scroll state, and highlights text selections - all without allowing any agent interaction with the visitor's page.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx` | `CobrowseViewer` component | High |
| `apps/server/src/features/signaling/socket-handlers.ts` | Cobrowse relay handlers | High |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### CobrowseViewer.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Iframe Rendering** | 1. Creates sandboxed iframe with allow-same-origin, 2. Writes DOM HTML to iframe document, 3. Sets base tag for relative URLs, 4. Disables pointer-events on iframe |
| **Viewport Scaling** | 5. Calculates scale factor from container/viewport ratio, 6. Applies transform scale to iframe |
| **Scroll Sync** | 7. Applies CSS transform translate for scroll position, 8. Updates on cobrowse:scroll events |
| **Mouse Cursor** | 9. Shows red cursor dot at mouse position, 10. Positions cursor relative to scaled viewport, 11. Applies -4px offset to center cursor |
| **Selection Highlight** | 12. Shows blue rectangle at selection bounds, 13. Displays selected text in footer |
| **Device Info** | 14. Shows viewport dimensions in header, 15. Shows device type (Mobile/Desktop) |
| **States** | 16. Shows placeholder when no snapshot received, 17. Updates iframe on new snapshot |

### socket-handlers.ts (Cobrowse Relay)

| Handler | Behaviors to Test |
|---------|-------------------|
| `COBROWSE_SNAPSHOT` | 1. Verifies visitor is in active call, 2. Finds agent for the call, 3. Forwards snapshot to agent socket |
| `COBROWSE_MOUSE` | 4. Forwards mouse coordinates to agent |
| `COBROWSE_SCROLL` | 5. Forwards scroll position to agent |
| `COBROWSE_SELECTION` | 6. Forwards selection data to agent |
| Validation | 7. Ignores events if visitor not in call, 8. Ignores events if no agent found |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/agent/cobrowse-viewer.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/A5-[TIMESTAMP].md`

---

## Mocking Notes

- Mock iframe `contentDocument` and `write()` method
- Mock Socket.io for cobrowse event handlers
- Mock `getBoundingClientRect` for container sizing
- Use React Testing Library for component tests

---

## Output

- `apps/dashboard/src/features/cobrowse/CobrowseViewer.test.tsx`
- `apps/server/src/features/signaling/socket-handlers.test.ts` (cobrowse relay tests)
- Completion report: `docs/agent-output/test-lock/A5-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (snapshot, mouse, scroll, selection)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")



