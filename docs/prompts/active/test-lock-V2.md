# TEST LOCK Agent: V2

> **Feature:** Video Sequencer
> **Priority:** High
> **Doc:** `docs/features/visitor/video-sequencer.md`

---

## Your Task

Lock in current behavior for all code in the Video Sequencer feature by writing behavior-level tests.

**Remember:** You are capturing CURRENT behavior, not fixing or improving anything.

---

## Feature Overview

The Video Sequencer manages the 3-part "ghost greeter" video experience for visitors: a muted looping wave video, followed by an audio-enabled intro video, then an infinite loop video. It creates the illusion of a live agent greeting the visitor by seamlessly transitioning between pre-recorded video segments.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/widget/src/features/simulation/VideoSequencer.tsx` | `VideoSequencer` component, video state machine | High |
| `apps/widget/src/constants.ts` | `VIDEO_TIMING` constants | Low |

---

## Behaviors to Capture

Based on feature documentation, ensure these are tested:

### VideoSequencer.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **State Machine** | 1. Initial state is "loading", 2. Transitions to "wave" when canplay fires, 3. Transitions to "intro" when audioUnlocked + waveCompletedOnce, 4. Transitions to "loop" when intro ends, 5. Transitions to "connecting" when isConnecting=true, 6. Transitions to "live" when isLive=true, 7. Transitions to "error" on video load failure |
| **Wave Video** | 8. Plays muted on loop, 9. Sets waveCompletedOnce when video reaches end (within 0.3s tolerance), 10. Triggers deferred loading of intro/loop after wave starts |
| **Intro Video** | 11. switchToIntro pauses wave and plays intro with audio, 12. Validates ended event with introStartedAt + min duration check, 13. Retries intro play on failure |
| **Loop Video** | 14. switchToLoop pauses other videos and plays loop with audio, 15. Loops indefinitely |
| **Error Handling** | 16. Retries up to 2 times on load error, 17. Shows error state with retry button after max retries, 18. handleRetry resets state and reloads videos |
| **Visibility** | 19. Only one video visible at a time (others use gg-video-hidden class) |

### VIDEO_TIMING Constants

| Constant | Behavior to Test |
|----------|-------------------|
| `INTRO_MIN_PLAY_DURATION` | Used to validate intro ended event (500ms default) |
| `END_DETECTION_TOLERANCE` | Used to detect wave completion (0.5s) |

---

## Process

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
2. Read the feature doc: `docs/features/visitor/video-sequencer.md`
3. Read each source file listed above
4. Read existing test patterns in the codebase
5. Write tests for each behavior
6. Run `pnpm test` — all must pass
7. Write completion report to `docs/agent-output/test-lock/V2-[TIMESTAMP].md`

---

## Mocking Notes

- Mock HTMLVideoElement (play, pause, currentTime, duration, etc.)
- Mock video events (canplay, canplaythrough, ended, error, timeupdate)
- Mock AudioContext for audio unlock detection
- Use `vi.useFakeTimers()` for timing-related tests

---

## Output

- `apps/widget/src/features/simulation/VideoSequencer.test.tsx`
- Completion report: `docs/agent-output/test-lock/V2-[TIMESTAMP].md`

---

## Quality Reminders

- [ ] One behavior per `it()` block
- [ ] All code paths covered (loading, wave, intro, loop, error)
- [ ] Tests PASS (they test current behavior)
- [ ] Followed existing mock patterns
- [ ] Specific test names (not "works correctly")



