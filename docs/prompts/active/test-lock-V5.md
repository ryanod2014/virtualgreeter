# TEST LOCK Agent: V5

> **Feature:** Co-Browse Sender
> **Priority:** High
> **Doc:** `docs/features/visitor/cobrowse-sender.md`

---

## Your Task

Lock in current behavior for all code in the Co-Browse Sender feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Co-Browse Sender captures and streams the visitor's browsing experience (DOM snapshots, mouse position, scroll position, and text selection) to the agent during an active call, enabling real-time screen sharing without requiring explicit visitor permission or browser extensions.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/widget/src/features/cobrowse/useCobrowse.ts` | `useCobrowse` hook, `captureSnapshot`, event handlers | High |
| `apps/widget/src/constants.ts` | `COBROWSE_TIMING` constants | Low |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### useCobrowse.ts

| Area | Behaviors to Test |
|------|-------------------|
| **Activation** | 1. Hook activates when isInCall=true, 2. Hook deactivates when isInCall=false, 3. Captures initial snapshot on activation |
| **DOM Snapshot** | 4. captureSnapshot clones document, 5. Removes #ghost-greeter-widget from snapshot, 6. Removes all script tags, 7. Converts relative image URLs to absolute, 8. Converts relative stylesheet URLs to absolute, 9. Deduplication via change detection |
| **Mouse Tracking** | 10. handleMouseMove sends x, y coordinates, 11. Throttled to 50ms intervals |
| **Scroll Tracking** | 12. handleScroll sends scrollX, scrollY, 13. Throttled to 100ms intervals |
| **Selection Tracking** | 14. handleSelection sends selected text and bounding rect, 15. Fires immediately (no throttle) |
| **Input Tracking** | 16. handleInput triggers delayed snapshot (100ms debounce) |
| **Resize Tracking** | 17. handleResize triggers delayed snapshot (200ms debounce) |
| **Mutation Observer** | 18. Watches for childList and attribute changes, 19. Only triggers for "significant" changes |
| **Cleanup** | 20. cleanup removes all event listeners, 21. Clears interval, 22. Disconnects MutationObserver |
| **Periodic Snapshot** | 23. Sends snapshot every 2 seconds |

### Socket Events

| Event | Behaviors to Test |
|-------|-------------------|
| `cobrowse:snapshot` | Payload includes html, url, title, viewport, timestamp |
| `cobrowse:mouse` | Payload includes x, y coordinates |
| `cobrowse:scroll` | Payload includes scrollX, scrollY |
| `cobrowse:selection` | Payload includes text and boundingRect |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/visitor/cobrowse-sender.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/V5-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `document.cloneNode` for DOM snapshot testing
- Mock Socket.io client for event emissions
- Mock `MutationObserver`
- Use `vi.useFakeTimers()` for interval and debounce tests
- Mock `window.getSelection()` for selection tests
- Mock `window.scrollX`, `window.scrollY` for scroll tests

---

## Output

- `apps/widget/src/features/cobrowse/useCobrowse.test.ts`
- Completion report: `docs/agent-output/test-lock/V5-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (activation, events, cleanup)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")




