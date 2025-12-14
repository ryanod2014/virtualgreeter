# TEST LOCK Agent: UI9

> **Feature:** Lib Components - Marketing & Visual
> **Priority:** Low
> **Category:** Dashboard UI (Marketing/Landing Pages)

---

## Your Task

Lock in current UI behavior for marketing and visual components by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

These components are used on marketing/landing pages: cost calculators, feature carousels, animated lists, scroll animations, and interactive question flows.

---

## Source Files to Test

| File | Key Behaviors | Priority |
|------|---------------|----------|
| `apps/dashboard/src/lib/components/CostCalculator.tsx` | Pricing calculation, input handling | Medium |
| `apps/dashboard/src/lib/components/FeatureCarousel.tsx` | Slide navigation, auto-play | Low |
| `apps/dashboard/src/lib/components/FoldingRipList.tsx` | Animated list reveal | Low |
| `apps/dashboard/src/lib/components/AnimateOnScroll.tsx` | Scroll-triggered animations | Low |
| `apps/dashboard/src/lib/components/SocraticQuestions.tsx` | Question flow, progressive reveal | Medium |
| `apps/dashboard/src/lib/components/FunnelTracker.tsx` | Analytics tracking, event firing | Medium |

---

## Behaviors to Capture

### CostCalculator.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows input fields (seats, calls, etc.), 2. Shows calculated cost, 3. Shows comparison to alternatives |
| **Calculation** | 4. Updates total on input change, 5. Applies correct pricing tiers, 6. Shows savings calculation |
| **Edge Cases** | 7. Handles zero values, 8. Handles very large numbers, 9. Validates min/max inputs |

### FeatureCarousel.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows current slide, 2. Shows navigation dots, 3. Shows prev/next buttons |
| **Navigation** | 4. Goes to next slide on click, 5. Goes to prev slide on click, 6. Jumps to slide on dot click |
| **Auto-play** | 7. Auto-advances after interval, 8. Pauses on hover, 9. Resumes on mouse leave |

### FoldingRipList.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows list items, 2. Items have staggered animation delay |
| **Animation** | 3. Items animate in sequence, 4. Respects animation duration prop |

### AnimateOnScroll.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Children hidden initially (if animate-in), 2. Children visible after scroll trigger |
| **Scroll** | 3. Triggers animation when element enters viewport, 4. Respects threshold prop |
| **Edge Cases** | 5. Handles already-in-viewport on load, 6. Cleans up observer on unmount |

### SocraticQuestions.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows first question, 2. Shows answer options, 3. Shows progress indicator |
| **Flow** | 4. Advances to next question on answer, 5. Shows final result/recommendation, 6. Allows going back |
| **Edge Cases** | 7. Handles single question, 8. Handles branching logic |

### FunnelTracker.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Tracking** | 1. Fires event on mount, 2. Fires event on specific interactions, 3. Includes correct event data |
| **Edge Cases** | 4. Doesn't fire duplicate events, 5. Handles missing analytics |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md` (especially **UI Component Testing Patterns** section)
2. Read reference UI tests:
   - `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx`
3. Read each source file listed above
4. Write tests for each behavior
5. Run `pnpm test` — all must pass
6. Write completion report to `docs/agent-output/test-lock/UI9-[TIMESTAMP].md`

---

## Mocking Notes

- Mock `IntersectionObserver` for scroll-based components
- Use `vi.useFakeTimers()` for auto-play and animation timing
- Mock analytics libraries (if used)

---

## Output

- `apps/dashboard/src/lib/components/CostCalculator.test.tsx`
- `apps/dashboard/src/lib/components/FeatureCarousel.test.tsx`
- `apps/dashboard/src/lib/components/FoldingRipList.test.tsx`
- `apps/dashboard/src/lib/components/AnimateOnScroll.test.tsx`
- `apps/dashboard/src/lib/components/SocraticQuestions.test.tsx`
- `apps/dashboard/src/lib/components/FunnelTracker.test.tsx`
- Completion report: `docs/agent-output/test-lock/UI9-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] `/** @vitest-environment jsdom */` at top of each file
- [ ] Mock `lucide-react` icons
- [ ] Mock IntersectionObserver for scroll components
- [ ] Use fake timers for animation/auto-play tests
- [ ] One behavior per `it()` block
- [ ] All tests PASS (they test current behavior)




