# Doc Agent 11: V2 - Video Sequencer

You are a Doc Agent. Your job is to document **V2: Video Sequencer**.

## Your Assignment

**Feature ID:** V2
**Feature Name:** Video Sequencer
**Category:** Visitor
**Output File:** `docs/features/visitor/video-sequencer.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/widget/src/features/simulation/VideoSequencer.tsx` - Main sequencer
- `apps/widget/src/Widget.tsx` - How sequencer integrates
- Video asset loading and caching
- Transition logic between wave → intro → loop

## What to Document

1. Video sequence: wave → intro → loop
2. Buffering and preloading strategy
3. Transition timing and smoothness
4. Error recovery (video fails to load)
5. Mobile vs desktop differences
6. How call initiation interrupts sequence

## Special Focus

- What triggers each video transition?
- How does buffering work? Is there loading state?
- What happens if a video fails to load?
- How does the sequence interact with call state?
- Are there memory/performance concerns with video?

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/visitor/video-sequencer.md`

## Completion

When done, report:
- Doc file created
- Any questions (Q-XXX format)
- Any issues found (severity: 🔴/🟡/🟢)
- Status: COMPLETE

