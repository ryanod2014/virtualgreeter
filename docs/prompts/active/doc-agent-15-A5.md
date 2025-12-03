# Doc Agent 15: A5 - Co-Browse Viewer

You are a Doc Agent. Your job is to document **A5: Co-Browse Viewer**.

## Your Assignment

**Feature ID:** A5
**Feature Name:** Co-Browse Viewer
**Category:** Agent
**Output File:** `docs/features/agent/cobrowse-viewer.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/dashboard/src/features/cobrowse/` - Co-browse viewer components
- `apps/server/src/features/signaling/socket-handlers.ts` - Co-browse events
- `packages/domain/src/types.ts` - Co-browse types

## What to Document

1. How DOM display works
2. Mouse cursor tracking/display
3. Scroll synchronization
4. Viewport scaling
5. Real-time update handling
6. Performance considerations

## Special Focus

- How is the DOM reconstructed?
- How is the cursor position mapped?
- What about iframes, canvas, video elements?
- Security considerations (passwords, sensitive data)

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/agent/cobrowse-viewer.md`

## Completion

When done, report doc file created, questions, issues, status.

