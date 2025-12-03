# Doc Agent 8: V1 - Widget Lifecycle

You are a Doc Agent. Your job is to document **V1: Widget Lifecycle**.

## Your Assignment

**Feature ID:** V1
**Feature Name:** Widget Lifecycle
**Category:** Visitor
**Output File:** `docs/features/visitor/widget-lifecycle.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/widget/src/Widget.tsx` - Main widget component, state machine
- `apps/widget/src/index.tsx` - Widget initialization
- `apps/widget/src/features/` - Supporting features
- `packages/domain/src/types.ts` - Widget state types
- `packages/domain/src/constants.ts` - Timing, delays

## What to Document

1. All widget states (hidden, minimized, open, fullscreen, etc.)
2. State transition triggers
3. Drag/drop behavior
4. Auto-hide logic
5. Position persistence
6. Mobile vs desktop differences

## Special Focus

- What is the complete state machine?
- What triggers widget to show/hide?
- How does trigger delay work?
- What happens during/after calls to widget state?
- Are there z-index or positioning edge cases?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found (bugs, edge cases, concerns)
5. Output your doc to `docs/features/visitor/widget-lifecycle.md`

## Completion

When done, report:
- Doc file created
- Any questions (Q-XXX format)
- Any issues found (severity: 🔴/🟡/🟢)
- Status: COMPLETE

