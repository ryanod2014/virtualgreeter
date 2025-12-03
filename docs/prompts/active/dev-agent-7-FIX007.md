# Dev Agent 7: FIX-007

You are a Dev Agent. Your job is to implement fix **FIX-007: Add Analytics Event for Video Load Failures**.

## Your Assignment

**Ticket:** FIX-007
**Priority:** P2 (Medium)
**Source:** Q9 Decision - Help detect systemic video issues

**Problem:**
When a video fails to load, the error is only logged to console. No server-side tracking occurs. Video load failures could indicate CDN issues, CORS misconfigurations, or format compatibility problems that go unnoticed.

**Solution:**
Add an analytics event when video fails to load. Track: video type (wave/intro/loop), error message, retry count.

**Files to Modify:**
- `apps/widget/src/features/simulation/VideoSequencer.tsx` - Add analytics event in error handler

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] Analytics event fires when video fails to load
- [ ] Event includes: video type, error message, retry count (if applicable)
- [ ] Uses existing analytics pattern in widget (find how other events are tracked)
- [ ] All verification checks pass

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup (REQUIRED FIRST!)

```bash
git checkout main
git pull origin main
git checkout -b fix/FIX-007-video-load-analytics
```

### Phase 1: Understand (5 min)

1. **Read** `apps/widget/src/features/simulation/VideoSequencer.tsx:166-182` - Find error handling
2. **Search** widget codebase for existing analytics patterns (look for "analytics", "track", "event")
3. **Understand** what data is available when video fails

### Phase 2: Implement

1. Find the video error handler(s) in VideoSequencer
2. Add analytics event call using existing pattern
3. Include: video type (wave/intro/loop), error message, any retry info

### Phase 3: Self-Verification (Required!)

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

### Phase 4: Git Commit

```bash
git add .
git commit -m "fix(FIX-007): add analytics event for video load failures

- Track video load errors with type, message, retry count
- Helps detect CDN/CORS/format issues early

Closes FIX-007"

git push origin fix/FIX-007-video-load-analytics
```

### Phase 5: Completion Report

```markdown
## Fix Complete: FIX-007 - Video Load Analytics

### Git
**Branch:** `fix/FIX-007-video-load-analytics`
**Commit:** [hash]
**Pushed:** ✅ Yes

### Changes Made
| File | What Changed |
|------|--------------|
| `VideoSequencer.tsx` | Added analytics event in error handler |

### Verification Results
- [ ] `pnpm typecheck`: ✅/❌
- [ ] `pnpm lint`: ✅/❌
- [ ] `pnpm test`: ✅/❌
- [ ] `pnpm build`: ✅/❌

### Human Review Required?
- [ ] None - backend analytics only

### Status: READY FOR REVIEW
```

## Rules
1. **Stay in scope** - Only modify VideoSequencer.tsx
2. **Match existing analytics patterns** - Don't invent new tracking approach
3. **All checks must pass**

