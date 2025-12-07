# Dev Agent Continuation: TKT-014-v2

> **Type:** Continuation (QA FAILED - CRITICAL SECURITY REGRESSION)
> **Original Ticket:** TKT-014
> **Branch:** `agent/tkt-014` ❌ DO NOT USE - has security regression
> **New Branch Required:** `agent/tkt-014-v2` (create from main)

---

## 🚨 CRITICAL SECURITY ISSUE - Cherry-Pick Required

**QA Summary:**
The recording badge implementation is EXCELLENT and production-ready. However, the branch contains a CRITICAL out-of-scope security regression: sensitive data masking was removed from the co-browse feature, exposing passwords, credit cards, SSNs, and other PII in violation of GDPR, CCPA, and PCI-DSS.

**Security Impact:**
- **Severity:** CRITICAL
- **Vulnerability:** Sensitive Data Exposure
- **Affected Feature:** Co-browse DOM snapshot transmission
- **Data Exposed:** Passwords, credit card numbers, SSNs, PII from form fields
- **Compliance Risk:** GDPR Article 32, CCPA, PCI-DSS Requirement 3

**What Happened:**
Branch `agent/tkt-014` removes `maskSensitiveFields()` from cobrowse feature, which was NOT in ticket scope. The recording badge work itself is perfect.

---

## Your Task: Cherry-Pick Only Recording Badge Changes

**DO NOT continue on agent/tkt-014 branch - it has a security regression.**

### Step 1: Create Clean Branch
```bash
git checkout main
git pull origin main
git checkout -b agent/tkt-014-v2
```

### Step 2: Cherry-Pick ONLY These Commits
From the original branch, identify and cherry-pick ONLY the recording badge commits (NOT cobrowse changes).

### Step 3: Verify These Files Are Modified
**Include (in scope):**
- packages/domain/src/types.ts
- apps/server/src/lib/call-settings.ts
- apps/server/src/features/signaling/socket-handlers.ts
- apps/server/src/features/signaling/redis-socket-handlers.ts
- apps/widget/src/features/call/RecordingBadge.tsx
- apps/widget/src/features/call/CallUI.tsx
- apps/widget/src/widget-styles.ts
- apps/widget/src/features/webrtc/LiveCallView.tsx
- apps/widget/src/Widget.tsx

**Exclude (out of scope - security issue):**
- apps/widget/src/features/cobrowse/useCobrowse.ts
- apps/widget/src/features/cobrowse/domSerializer.ts

### Step 4: Security Verification
```bash
# Verify cobrowse security is intact
grep -n "maskSensitiveFields" apps/widget/src/features/cobrowse/useCobrowse.ts

# Should show the function is still being used
```

### Step 5: Build & Browser Testing
```bash
pnpm typecheck
pnpm build
pnpm dev
```

**Browser Testing with Playwright MCP (per QA SOP):**
1. Navigate to widget demo
2. Start a call with recording enabled
3. Take screenshot showing recording badge
4. Verify badge shows "Recording" with red dot
5. Test with recording disabled org - badge should NOT show

### Step 6: Push for Re-QA
```bash
git push origin agent/tkt-014-v2
```

---

## Original Acceptance Criteria

From TKT-014: Recording Consent Indicator for Visitors

1. 'Recording' indicator appears after call connects ✅
2. Indicator is in same location as 'Live' badge was ✅
3. Only shows when org has recording enabled ✅
4. Badge is visible but not intrusive ✅

**QA Note:** The original implementation passed all 4 criteria. You just need to port it to a clean branch.

---

## Files in Scope

Recording badge files (from ticket):
- apps/widget/src/features/call/CallUI.tsx
- apps/widget/src/features/call/RecordingBadge.tsx
- apps/widget/src/styles.css

Integration files (from QA analysis):
- packages/domain/src/types.ts
- apps/server/src/lib/call-settings.ts
- apps/server/src/features/signaling/socket-handlers.ts
- apps/server/src/features/signaling/redis-socket-handlers.ts
- apps/widget/src/features/webrtc/LiveCallView.tsx
- apps/widget/src/Widget.tsx

**DO NOT modify cobrowse files - they contain a security regression.**

---

## Dev Checks

- [ ] New branch `agent/tkt-014-v2` created from main
- [ ] Recording badge files cherry-picked (NOT cobrowse files)
- [ ] `grep "maskSensitiveFields" apps/widget/src/features/cobrowse/useCobrowse.ts` shows function is still used
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Browser test: Recording badge shows during call (recording enabled)
- [ ] Browser test: Badge does NOT show (recording disabled)
- [ ] Screenshots captured for documentation
- [ ] Push to `agent/tkt-014-v2`

---

## Priority: CRITICAL

This must be fixed before merge. The recording badge feature is excellent, but the security regression blocks merge.
