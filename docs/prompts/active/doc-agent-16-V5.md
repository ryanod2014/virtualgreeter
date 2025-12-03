# Doc Agent 16: V5 - Co-Browse Sender

You are a Doc Agent. Your job is to document **V5: Co-Browse Sender**.

## Your Assignment

**Feature ID:** V5
**Feature Name:** Co-Browse Sender
**Category:** Visitor
**Output File:** `docs/features/visitor/cobrowse-sender.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/widget/src/features/cobrowse/` - Co-browse sender
- `apps/widget/src/Widget.tsx` - Integration point
- `packages/domain/src/types.ts` - Co-browse types

## What to Document

1. DOM snapshot capture
2. Mouse position tracking
3. Scroll position tracking
4. Selection tracking
5. Mutation observation (DOM changes)
6. Throttling/debouncing strategy

## Special Focus

- How often are snapshots sent?
- What elements are excluded (passwords, etc.)?
- How are mutations batched?
- Performance impact on visitor's page
- Memory management

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/visitor/cobrowse-sender.md`

## Completion

When done, report doc file created, questions, issues, status.

