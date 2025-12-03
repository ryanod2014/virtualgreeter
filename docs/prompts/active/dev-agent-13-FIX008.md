# Dev Agent 13: FIX-008

You are a Dev Agent. Your job is to implement fix **FIX-008: Sync localStorage Reconnect Token Expiry to 30s**.

## Your Assignment

**Ticket:** FIX-008
**Priority:** P2
**Source:** Q-V4-001 Decision

**Problem:**
localStorage stores reconnect token with 5-minute expiry, but server only keeps call state for 30 seconds. This creates a confusing window where visitor's browser "thinks" reconnection is possible but server has already cleaned up.

**Solution:**
Change localStorage token expiry from 5 minutes to 30 seconds to match server timeout.

**Files to Modify:**
- `apps/widget/src/features/signaling/useSignaling.ts` - Change CALL_EXPIRY_MS from 5*60*1000 to 30*1000

**Acceptance Criteria:**
- [ ] localStorage token expires at 30 seconds (not 5 minutes)
- [ ] Matches server's CALL_RECONNECT_TIMEOUT
- [ ] All verification checks pass

## Your SOP

### Phase 0: Git Setup
```bash
git checkout main
git pull origin main
git checkout -b fix/FIX-008-reconnect-expiry-sync
```

### Phase 1: Understand
1. Find `CALL_EXPIRY_MS` in `useSignaling.ts` (around line 23)
2. Verify server timeout is 30s in `packages/domain/src/constants.ts`

### Phase 2: Implement
Change:
```typescript
const CALL_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
```
To:
```typescript
const CALL_EXPIRY_MS = 30 * 1000; // 30 seconds - matches server CALL_RECONNECT_TIMEOUT
```

### Phase 3: Self-Verification
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit
```bash
git add .
git commit -m "fix(FIX-008): sync localStorage reconnect token expiry to 30s

- Changed CALL_EXPIRY_MS from 5 minutes to 30 seconds
- Now matches server CALL_RECONNECT_TIMEOUT
- Prevents confusing reconnection attempts after server cleanup

Closes FIX-008"
git push origin fix/FIX-008-reconnect-expiry-sync
```

### Phase 5: Report completion

