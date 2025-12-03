# Dev Agent: FIX-007 v2

You are a Dev Agent. Your job is to implement fix **FIX-007: Add Analytics Event for Video Load Failures**.

## ⚠️ IMPORTANT: Branch Exists But Is Empty

A previous agent created the branch but never implemented the fix. Check out existing branch.

## Your Assignment

**Ticket:** FIX-007
**Priority:** P2 (Medium)
**Source:** Observability finding - No visibility into video failures

**Problem:**
When videos fail to load in the widget, we have no analytics tracking. We can't know how often this happens or debug patterns.

**Review Agent Found - Current State:**
The `handleVideoError` function in `VideoSequencer.tsx` exists but sends NO analytics:
- Logs to console
- Retries up to 2 times
- Sets error state and calls `onError` callback
- **Missing:** No socket event emission for analytics tracking

**Solution:**
Emit analytics event when video fails to load.

**Files to Modify:**
- `apps/widget/src/components/VideoSequencer.tsx` - Add analytics emit
- `packages/domain/src/constants.ts` - Add WIDGET_VIDEO_ERROR event constant
- `apps/server/src/features/signaling/socket-handlers.ts` - Handle the event (optional, for logging)

**Acceptance Criteria:**
- [ ] Event fires when video fails to load
- [ ] Uses existing socket/analytics pattern in widget
- [ ] Event includes: videoType, errorMessage, retryCount, visitorId, orgId
- [ ] Analytics call doesn't break error recovery flow
- [ ] Retry button still works
- [ ] All verification checks pass

## Expected Implementation

**1. Add constant** (`packages/domain/src/constants.ts`):
```typescript
// In SOCKET_EVENTS object:
WIDGET_VIDEO_ERROR: 'widget:video:error',
```

**2. Emit from widget** (`VideoSequencer.tsx` in `handleVideoError`):
```typescript
// After existing error handling logic:
socket?.emit(SOCKET_EVENTS.WIDGET_VIDEO_ERROR, {
  videoType: currentVideo, // "wave" | "intro" | "loop"
  errorMessage: error.message || 'Unknown error',
  retryCount: retryCount,
  visitorId: visitorId,
  orgId: orgId,
});
```

**3. Optionally handle on server** (for logging):
```typescript
socket.on(SOCKET_EVENTS.WIDGET_VIDEO_ERROR, (data) => {
  console.log('[Analytics] Video error:', data);
  // Could also save to DB like recordPageview()
});
```

## Your SOP

### Phase 0: Git Setup

```bash
git fetch origin
git checkout fix/FIX-007-video-load-analytics
git merge main
```

### Phase 0.5: Signal Start (REQUIRED!)

**Immediately after git setup, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-007-v2
- **Ticket:** FIX-007
- **Status:** STARTED
- **Branch:** fix/FIX-007-video-load-analytics
- **Files Locking:** `apps/widget/src/components/VideoSequencer.tsx`, `packages/domain/src/constants.ts`
- **Notes:** Beginning video analytics implementation
```

**This signals to PM that you're live and which files to lock.**

### Phase 1: Understand (5 min)

1. **Read** `apps/widget/src/components/VideoSequencer.tsx`
2. **Find** `handleVideoError` function
3. **Check** how other analytics events are emitted
4. **Look at** `packages/domain/src/constants.ts` for event naming patterns

### Phase 2: Implement

1. Add `WIDGET_VIDEO_ERROR` to constants
2. In `handleVideoError`, emit the event with relevant data
3. Make sure emit doesn't throw and break error recovery
4. Optionally add server handler for logging

### Phase 3: Self-Verification

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit & Push

```bash
git add .
git commit -m "fix(FIX-007): add analytics event for video load failures

- Added WIDGET_VIDEO_ERROR event constant
- VideoSequencer now emits analytics on video error
- Includes videoType, error message, retry count

Closes FIX-007"

git push origin fix/FIX-007-video-load-analytics
```

### Phase 5: Notify PM

Append to `docs/agent-inbox/completions.md`:

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent FIX-007-v2
- **Ticket:** FIX-007
- **Status:** COMPLETE
- **Branch:** fix/FIX-007-video-load-analytics
- **Output:** Branch pushed
- **Notes:** Video error analytics implemented. No UI changes.
```

## Human Review Required

- [ ] None - backend/analytics only, no UI

## If You Have Questions

Add to findings file and notify via completions.md with status BLOCKED.

