# Ticket Backlog

> **Purpose:** Prioritized list of work items from review findings.
> **Owner:** Human reviews & prioritizes before dev sprint. PM maintains this file.
> **Generated:** 2025-12-03 from `docs/data/tickets.json`

---

## Quick Stats

| Priority | Count | In Progress | Done |
|----------|-------|-------------|------|
| 🔴 Critical | 7 | 0 | 0 |
| 🟠 High | 12 | 0 | 0 |
| 🟡 Medium | 2 | 0 | 0 |
| 🟢 Low | 2 | 0 | 0 |
| **Total** | **23** | **0** | **0** |

---

## 🔴 Critical Priority

> Issues that block functionality, pose security risks, or cause data loss.


### TKT-001: Co-Browse Sensitive Data Sanitization

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Co-Browse (Viewer + Sender) |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🔴 High |
| **Source** | Findings A-cobrowse-viewer #1, #2; V-cobrowse-sender #1 |

**Issue:**
Password fields, credit card numbers, and other sensitive data are captured in DOM snapshots and transmitted to agents during co-browse sessions. This exposes plaintext passwords, violates PCI compliance, and creates privacy risks.

**Fix Required:**
- Mask password fields with ••••••••
- Mask credit card inputs (input[autocomplete='cc-number'], input[type='tel'])
- Mask elements with data-sensitive='true' attribute

**Files to Edit:**
- `apps/widget/src/features/cobrowse/domSerializer.ts`
- `apps/widget/src/features/cobrowse/cobrowseSender.ts`
- `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx`

**Risk Notes:**
- If sanitization regex is too aggressive, may mask non-sensitive content
- If sanitization is bypassed, sensitive data leaks to agents
- Must test with various form structures (React forms, vanilla HTML, etc.)

**Acceptance Criteria:**
- [ ] Password input values show as •••••••• in agent viewer
- [ ] Credit card fields show as masked
- [ ] Elements with data-sensitive attribute are masked
- [ ] Regular form fields still work correctly
- [ ] Unit tests cover sanitization logic



---

### TKT-002: Complete Stripe Subscription Cancellation

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Organization Settings, Cancel Subscription |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🔴 High |
| **Source** | Findings D-organization-settings #1, #2; B-cancel-subscription #1 |

**Issue:**
When users cancel their subscription: 1) Code only sets plan='free' in Supabase, 2) Does NOT call Stripe API to cancel, 3) UI says 'access until end of billing period' but access is removed immediately. Customers may continue being charged by Stripe.

**Fix Required:**
- Call stripe.subscriptions.update({ cancel_at_period_end: true }) when user cancels
- Keep access active until current_period_end from Stripe
- Add webhook handler for customer.subscription.deleted to finalize downgrade

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts`
- `apps/dashboard/src/lib/stripe.ts`
- `apps/server/src/features/webhooks/stripe.ts`
- `packages/domain/src/database.types.ts`

**Risk Notes:**
- If Stripe call fails but DB updates, subscription cancelled locally but still billed
- Need idempotency - user might click cancel multiple times
- Webhook must be verified to prevent spoofing
- Test with Stripe test mode before production

**Acceptance Criteria:**
- [ ] Clicking 'Cancel' calls Stripe API with cancel_at_period_end: true
- [ ] User retains access until their paid period ends
- [ ] After period ends, plan automatically becomes 'free'
- [ ] Stripe dashboard shows subscription as 'canceling'
- [ ] Webhook properly handles the final cancellation event



---

### TKT-003: Update Cancellation Data Deletion Copy

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Cancel Subscription |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟡 Medium |
| **Source** | Finding B-cancel-subscription #2 |

**Issue:**
Cancel modal warns that data will be 'permanently deleted' but actual behavior just downgrades to free - no data is deleted. This is misleading.

**Fix Required:**
- Update copy to: 'Your data will be retained for 30 days after cancellation, then may be permanently deleted.'

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx`

**Risk Notes:**
- Copy change only - low risk
- Should match any terms of service language
- Consider adding actual 30-day cleanup job later (separate ticket)

**Acceptance Criteria:**
- [ ] Cancel modal shows updated retention language
- [ ] No mention of 'immediate' deletion
- [ ] Copy reviewed by stakeholder



---

### TKT-004: Complete Pause Subscription with Stripe Integration

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Pause Subscription |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High |
| **Risk** | 🔴 High |
| **Source** | Findings B-pause-subscription #1, #2 |

**Issue:**
1) pauseAccount() updates DB but does NOT pause billing in Stripe - customers still charged. 2) No auto-resume when pause_ends_at is reached - subscriptions stay paused forever.

**Fix Required:**
- Implement Stripe subscription.pause_collection when pausing
- Implement scheduled job to auto-resume when pause period ends
- Add webhook handler for pause/resume events

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts`
- `apps/dashboard/src/lib/stripe.ts`
- `apps/server/src/features/webhooks/stripe.ts`
- `apps/server/src/features/scheduler/`
- `supabase/migrations/`

**Risk Notes:**
- Stripe pause behavior varies by plan type - test thoroughly
- Auto-resume job must be reliable - missed resume = extended pause
- Race condition possible if user manually resumes while job runs
- Need to handle case where payment fails on resume

**Acceptance Criteria:**
- [ ] Pausing account stops Stripe billing
- [ ] Resuming account restarts Stripe billing
- [ ] Auto-resume triggers at pause_ends_at timestamp
- [ ] User receives notification before auto-resume
- [ ] Failed payment on resume is handled gracefully
- [ ] Widget disabled for paused orgs - visitors see 'temporarily unavailable'
- [ ] All agents forced to 'offline' status when org pauses



---

### TKT-005: Payment Failure Blocking + Retry UI

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Payment Failure |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High |
| **Risk** | 🔴 High |
| **Source** | Finding B-payment-failure #2 |

**Issue:**
When payment fails, users get ZERO feedback: No dashboard notification, No email, No popup, Account continues working as if nothing happened.

**Fix Required:**
- Add past_due status to TypeScript types
- Create full-screen payment retry modal that blocks app usage
- Add Stripe webhook handler for invoice.payment_failed
- Email notification on payment failure
- Block all dashboard access for admin + agents until resolved
- Force all agents to 'offline' status

**Files to Edit:**
- `packages/domain/src/database.types.ts`
- `apps/dashboard/src/components/PaymentBlocker.tsx`
- `apps/dashboard/src/app/(dashboard)/layout.tsx`
- `apps/server/src/features/webhooks/stripe.ts`
- `apps/server/src/lib/email.ts`
- `apps/dashboard/src/lib/stripe.ts`
- `apps/server/src/features/agents/agentStatus.ts`

**Risk Notes:**
- Blocking too aggressively could frustrate users with temporary card issues
- Need grace period logic (e.g., 3 days before full block)
- Retry flow must handle all Stripe error types
- Must unblock immediately once payment succeeds
- In-progress calls should complete, but no new calls allowed

**Acceptance Criteria:**
- [ ] Payment failure triggers past_due status in database
- [ ] Full-screen modal appears blocking dashboard access
- [ ] Modal includes 'Update Payment Method' button (admin only)
- [ ] Agents see read-only modal explaining billing issue - directs them to contact admin
- [ ] Email sent to admin on payment failure
- [ ] Successful payment immediately unblocks account
- [ ] All agents forced to 'offline' status - widget won't show them as available
- [ ] Visitors see no available agents (widget shows 'no agents available' or hides)



---

### TKT-006: Fix Middleware Redirect for Unauthenticated Users

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Login Flow / Authentication |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟡 Medium |
| **Source** | Finding AUTH-login-flow #1 |

**Issue:**
Middleware code for protected routes has 'if (isProtectedPath && !user) { return }' but no redirect to login page. Unauthenticated users get blank/error page.

**Fix Required:**
- Complete the redirect logic: if (isProtectedPath && !user) { return NextResponse.redirect(new URL('/login', request.url)) }

**Files to Edit:**
- `apps/dashboard/middleware.ts`

**Risk Notes:**
- Must preserve any existing redirect logic (e.g., callback URLs)
- Test that authenticated users are NOT affected
- Ensure redirect doesn't create infinite loop if /login is misconfigured

**Acceptance Criteria:**
- [ ] Visiting /dashboard while logged out redirects to /login
- [ ] Visiting any protected path while logged out redirects to /login
- [ ] Logged-in users can access protected paths normally
- [ ] No redirect loops



---

### TKT-017: Enforce Pool Routing on Visitor Reassignment

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Visitor Reassignment |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🔴 High |
| **Source** | Finding P-visitor-reassignment #1 |

**Issue:**
When a visitor is reassigned, findBestAgent() is called WITHOUT the pool ID. A visitor from 'Sales Pool' could be reassigned to 'Support Pool' agent. This defeats pool-based routing.

**Fix Required:**
- Pass pool ID to findBestAgent() during reassignment
- Visitor should only be reassigned to agents in the same pool

**Files to Edit:**
- `apps/server/src/features/reassignment/reassignVisitors.ts`
- `apps/server/src/lib/agentSelection.ts`
- `apps/server/src/features/calls/callRequest.ts`

**Risk Notes:**
- If pool has no available agents, need fallback behavior (queue? error? any-pool?)
- Must test with multi-pool organizations
- Race condition possible if agent goes unavailable mid-reassignment

**Acceptance Criteria:**
- [ ] Reassigned visitor stays in original pool
- [ ] If no agents in pool, appropriate fallback behavior
- [ ] Pool routing rules are logged for debugging
- [ ] Unit tests cover pool-aware reassignment



---

## 🟠 High Priority

> Major UX issues, significant logic flaws, important security fixes.


### TKT-009: Org-Level Co-Browse Disable Setting

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Co-Browse, Organization Settings |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟢 Low |
| **Source** | Finding A-cobrowse-viewer #3 |

**Issue:**
Visitors have no control over screen sharing during calls. Co-browse is automatic with no opt-out. May violate privacy expectations or GDPR.

**Fix Required:**
- Add organization-level setting to enable/disable co-browse feature entirely

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx`
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts`
- `supabase/migrations/`
- `apps/widget/src/features/cobrowse/cobrowseSender.ts`
- `apps/server/src/lib/organization.ts`

**Risk Notes:**
- Default should be true (enabled) to maintain current behavior
- Need to handle mid-call disable gracefully

**Acceptance Criteria:**
- [ ] Org settings shows 'Enable Co-Browse' toggle
- [ ] When disabled, co-browse does not initialize for visitors
- [ ] Existing orgs default to enabled
- [ ] Setting change takes effect on next call (not mid-call)

**Feature Inventory:**
- [ ] Update `docs/FEATURE_INVENTORY.md` with new feature


---

### TKT-011: Email Invite Retry Mechanism

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Agent Management (Invites) |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟡 Medium |
| **Source** | Finding D4-agent-management #3 |

**Issue:**
If Resend API fails to send invite email, invite is still created in DB. Admin has no visibility. Invitee waits for email that never arrives.

**Fix Required:**
- Implement retry mechanism with admin notification on failure

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/agents/actions.ts`
- `apps/dashboard/src/lib/email.ts`
- `apps/dashboard/src/app/(dashboard)/agents/page.tsx`

**Risk Notes:**
- Don't retry infinitely - cap at 3 attempts
- If all retries fail, show clear error to admin
- Consider adding 'Resend Invite' button for failed invites

**Acceptance Criteria:**
- [ ] Failed email triggers automatic retry (up to 3 attempts)
- [ ] Admin sees status of invite (sent/pending/failed)
- [ ] After all retries fail, admin gets clear notification
- [ ] 'Resend Invite' button available for failed invites



---

### TKT-012: Migrate Geolocation to MaxMind

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Blocklist Settings, Geolocation |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟡 Medium |
| **Source** | Finding D-blocklist-settings #1 |

**Issue:**
Geolocation uses ip-api.com free tier (45 req/min limit). At scale, geolocation fails and ALL visitors allowed through, bypassing blocklist.

**Fix Required:**
- Migrate to MaxMind GeoIP service for higher rate limits and reliability

**Files to Edit:**
- `apps/server/src/lib/geolocation.ts`
- `apps/server/env.example`
- `apps/server/src/features/blocklist/checkVisitor.ts`

**Risk Notes:**
- COST CONSIDERATION: MaxMind pricing needs review before starting
- Need to understand pricing tiers and expected usage
- Consider caching IP lookups to reduce API calls
- Keep ip-api as fallback during migration?

**Acceptance Criteria:**
- [ ] Geolocation uses MaxMind API
- [ ] Rate limit is sufficient for expected traffic
- [ ] Fallback behavior documented if MaxMind fails
- [ ] Costs are within budget


**Pre-Work Required:**
- [ ] Research MaxMind pricing tiers
- [ ] Estimate monthly API calls based on traffic
- [ ] Get budget approval if needed

---

### TKT-013: Retention Policy Retroactive Deletion Warning

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Organization Settings, Recording Retention |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🔴 High |
| **Source** | Finding D-organization-settings #3 |

**Issue:**
When admin reduces retention from 90→30 days, behavior is unclear. Should be retroactive (delete old recordings) with clear warning.

**Fix Required:**
- Implement retroactive deletion when retention is reduced
- Show popup warning with count of recordings that will be deleted
- Require confirmation before applying

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts`
- `apps/dashboard/src/app/(dashboard)/settings/RetentionWarningModal.tsx`
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx`
- `apps/server/src/features/recordings/deleteOldRecordings.ts`

**Risk Notes:**
- Deletion is IRREVERSIBLE - must have clear confirmation
- Count affected recordings before showing warning
- Log all deletions for audit trail
- Consider adding 'scheduled deletion' with grace period

**Acceptance Criteria:**
- [ ] Reducing retention triggers confirmation modal
- [ ] Modal shows exact count of recordings to be deleted
- [ ] User must type 'DELETE' or similar to confirm
- [ ] Deletions are logged for audit
- [ ] Recordings older than new retention are deleted



---

### TKT-014: Recording Consent Indicator for Visitors

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Recording Settings, Widget |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟢 Low |
| **Source** | Finding D-recording-settings #1 |

**Issue:**
Visitors are recorded with NO indication. No 'This call may be recorded' message. Compliance risk for GDPR, CCPA, two-party consent states.

**Fix Required:**
- Add visible recording indicator that appears AFTER both parties are connected
- Show in same location where 'Live' badge appeared during preview loop

**Files to Edit:**
- `apps/widget/src/features/call/CallUI.tsx`
- `apps/widget/src/features/call/RecordingBadge.tsx`
- `apps/server/src/features/calls/callStart.ts`
- `apps/widget/src/styles.css`

**Risk Notes:**
- Badge should be visible but not intrusive
- Only show when recording is actually enabled for the org

**Acceptance Criteria:**
- [ ] 'Recording' indicator appears after call connects
- [ ] Indicator is in same location as 'Live' badge was
- [ ] Only shows when org has recording enabled



---

### TKT-015: Secure Recording URLs with Signed Access

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Recordings, Storage |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High |
| **Risk** | 🔴 High |
| **Source** | Finding A-agent-active-call #1 |

**Issue:**
Recording uploads go to public Supabase bucket with predictable URL patterns. Anyone who guesses the pattern can access recordings without auth. HIPAA/GDPR compliance risk.

**Fix Required:**
- Move recordings to private bucket
- Generate signed URLs with expiration for access
- Add randomized UUIDs to paths

**Files to Edit:**
- `supabase/`
- `apps/dashboard/src/features/recordings/RecordingPlayer.tsx`
- `apps/server/src/features/recordings/uploadRecording.ts`
- `apps/server/src/features/recordings/getRecordingUrl.ts`
- `apps/dashboard/src/lib/supabase.ts`

**Risk Notes:**
- Existing recordings need migration to private bucket
- Signed URLs should expire (e.g., 1 hour)
- Must handle URL refresh for long viewing sessions
- Test download functionality still works

**Acceptance Criteria:**
- [ ] New recordings go to private bucket
- [ ] Recording URLs are signed with 1-hour expiration
- [ ] URLs contain randomized UUIDs (not predictable)
- [ ] Existing recordings migrated to private bucket
- [ ] Playback works with signed URLs



---

### TKT-016: WebRTC ICE Restart on Connection Failure

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Agent Active Call, WebRTC |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | Medium |
| **Risk** | 🟡 Medium |
| **Source** | Finding A-agent-active-call #2 |

**Issue:**
When WebRTC connection fails mid-call (network glitch, NAT timeout), agent must manually end and start new call. Customer may be lost.

**Fix Required:**
- Implement ICE restart mechanism with automatic retry before showing failure state

**Files to Edit:**
- `apps/dashboard/src/features/call/useWebRTC.ts`
- `apps/widget/src/features/call/useWebRTC.ts`
- `apps/server/src/features/signaling/handleIceRestart.ts`

**Risk Notes:**
- ICE restart has browser-specific quirks
- Set max retry attempts (3) before giving up
- Log all reconnection attempts for debugging
- May need to handle TURN server failover

**Acceptance Criteria:**
- [ ] ICE failure triggers automatic restart attempt
- [ ] Up to 3 restart attempts before showing error
- [ ] User sees 'Reconnecting...' status during attempts
- [ ] If all attempts fail, graceful error message
- [ ] Reconnection events logged for debugging



---

### TKT-018: Transcription Auto-Retry with Manual Fallback

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Transcription Service |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟢 Low |
| **Source** | Finding P-transcription-service #2 |

**Issue:**
When transcription fails (Deepgram error, timeout), there's no retry mechanism and no UI to manually retry. Failed transcriptions are stuck permanently.

**Fix Required:**
- Auto-retry failed transcriptions (3 attempts with exponential backoff)
- Add 'Retry Transcription' button for calls where all retries failed
- Log retry attempts for debugging

**Files to Edit:**
- `apps/server/src/features/transcription/processTranscription.ts`
- `apps/dashboard/src/features/call-logs/CallLogRow.tsx`
- `apps/dashboard/src/app/api/transcription/retry/route.ts`
- `apps/server/src/lib/queue.ts`

**Risk Notes:**
- Exponential backoff: 1s, 4s, 16s delays
- Max 3 attempts before marking permanently failed
- Don't retry if error is 'audio too short' or similar non-retriable errors

**Acceptance Criteria:**
- [ ] Failed transcription auto-retries up to 3 times
- [ ] Retry button appears for permanently failed transcriptions
- [ ] Retry attempts are logged with error details
- [ ] Non-retriable errors skip retry logic



---

### TKT-019: Sync Incoming Call Countdown with RNA Timeout

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Incoming Call |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟢 Low |
| **Source** | Finding A-incoming-call #1 |

**Issue:**
Incoming call modal shows hardcoded 30-second countdown, but RNA timeout fires at 15 seconds (org-configured). Agents think they have more time and get unexpectedly marked away.

**Fix Required:**
- Fetch org's actual RNA timeout value and use it for the countdown display

**Files to Edit:**
- `apps/dashboard/src/features/incoming-call/incoming-call-modal.tsx`
- `apps/server/src/features/calls/callRequest.ts`

**Risk Notes:**
- Simple fix - just syncing UI with existing server value
- Test with various org timeout settings (15s, 25s, 30s)

**Acceptance Criteria:**
- [ ] Countdown matches org's RNA timeout setting
- [ ] Countdown and RNA timeout fire at the same moment
- [ ] Works correctly for different org configurations



---

### TKT-022: Enforce Seat Limit in API

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Seat Management |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟢 Low |
| **Source** | Finding B-seat-management #1 |

**Issue:**
UI caps seats at 50, but API has no validation. Direct API calls could set arbitrarily high seat counts, causing billing issues or system strain.

**Fix Required:**
- Add server-side validation to enforce maximum seat limit in API endpoints

**Files to Edit:**
- `apps/dashboard/src/app/api/billing/seats/route.ts`
- `apps/dashboard/src/app/api/billing/update-settings/route.ts`

**Risk Notes:**
- Consider making limit configurable per plan (50 for standard, higher for enterprise)
- Return clear error message when limit exceeded

**Acceptance Criteria:**
- [ ] API rejects seat count > 50 (or plan limit)
- [ ] Clear error message returned to client
- [ ] Existing orgs over limit are grandfathered (don't break them)



---

### TKT-023: Atomic Stripe-DB Updates for Seat Changes

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Seat Management |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟡 Medium |
| **Source** | Finding B-seat-management #2 |

**Issue:**
Stripe is updated before DB for seat changes. If DB update fails after Stripe succeeds, customer is charged for seats not reflected in app. Inconsistent state.

**Fix Required:**
- Implement compensating transaction pattern
- If DB update fails, rollback Stripe change
- Add monitoring for any failures

**Files to Edit:**
- `apps/dashboard/src/app/api/billing/seats/route.ts`
- `apps/dashboard/src/lib/stripe.ts`
- `apps/server/src/lib/monitoring.ts`

**Risk Notes:**
- Rollback window is small - Stripe change is immediate
- Log all rollback attempts for audit
- Consider optimistic locking pattern

**Acceptance Criteria:**
- [ ] DB failure triggers Stripe rollback
- [ ] Rollback failures are alerted to ops team
- [ ] Successful flow unchanged
- [ ] Audit log captures all seat change attempts



---

### TKT-024: Visitor Call Reconnection Window

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Visitor Call, Call Lifecycle |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High |
| **Risk** | 🟡 Medium |
| **Source** | Finding P-visitor-reassignment #2 |

**Issue:**
If visitor disconnects mid-call (browser crash, accidental close), call ends permanently. No way to rejoin. Different from TKT-016 (WebRTC) which handles network blips.

**Fix Required:**
- Add reconnection window allowing visitor to rejoin same call within 60 seconds of disconnect

**Files to Edit:**
- `apps/server/src/features/calls/callLifecycle.ts`
- `apps/widget/src/features/call/useCallSession.ts`
- `apps/widget/src/features/call/RejoinPrompt.tsx`
- `apps/server/src/features/signaling/handleRejoin.ts`
- `apps/dashboard/src/features/call/useActiveCall.ts`

**Risk Notes:**
- Session token must be stored locally (localStorage) to survive page reload
- Agent should see 'Visitor reconnecting...' status
- After 60 seconds, call truly ends
- Consider what happens if agent ends call during reconnection window

**Acceptance Criteria:**
- [ ] Visitor who crashes browser can rejoin within 60 seconds
- [ ] Agent sees 'Visitor disconnected - waiting for reconnection' status
- [ ] After 60 seconds, call ends normally
- [ ] Rejoin continues from same call state (not new call)



---

## 🟡 Medium Priority

> Logic issues, accessibility gaps, UX improvements, documentation gaps.


### TKT-007: Fix Public Feedback Feature Documentation

| Field | Value |
|-------|-------|
| **Priority** | 🟡 Medium |
| **Feature** | Public Feedback |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟢 Low |
| **Source** | Finding V-public-feedback #1 |

**Issue:**
The 'Public Feedback' feature documentation describes it as 'Post-call feedback for visitors' but the actual feature is a UserVoice-style feature request voting system for authenticated dashboard users.

**Fix Required:**
- Rename to 'Feature Request Voting & Bug Reporting' or similar
- Update description to explain it's for authenticated dashboard users
- Clarify that 'public' means cross-organization visibility, not anonymous access

**Files to Edit:**
- `docs/features/feedback/public-feedback.md`

**Risk Notes:**
- Documentation only - no production risk
- May need to update any UI that references this feature name

**Acceptance Criteria:**
- [ ] Feature doc accurately describes the voting/feedback system
- [ ] No mention of 'visitors' or 'post-call'
- [ ] Clear that authentication is required



---

### TKT-020: Price ID Missing Should Error Not Fallback

| Field | Value |
|-------|-------|
| **Priority** | 🟡 Medium |
| **Feature** | Subscription Creation |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟢 Low |
| **Source** | Finding B-subscription-creation #2 |

**Issue:**
When annual or 6-month price IDs aren't configured in environment, system silently falls back to monthly pricing. User selects annual, gets charged monthly rates - billing dispute risk.

**Fix Required:**
- Make missing price ID a hard error that blocks subscription creation with user-visible message

**Files to Edit:**
- `apps/dashboard/src/app/(auth)/paywall/page.tsx`
- `apps/dashboard/src/lib/stripe.ts`

**Risk Notes:**
- This should never happen in production if deployment is correct
- But defensive coding prevents silent failures
- Consider startup-time validation of all required price IDs

**Acceptance Criteria:**
- [ ] Missing price ID throws visible error (not console warning)
- [ ] Billing options not shown if price ID missing
- [ ] Clear error message directs admin to fix configuration



---

## 🟢 Low Priority

> Nice-to-have, polish, minor edge cases, documentation improvements.


### TKT-010: Graceful Call End on Agent Removal

| Field | Value |
|-------|-------|
| **Priority** | 🟢 Low |
| **Feature** | Agent Management |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium |
| **Risk** | 🟡 Medium |
| **Source** | Finding D4-agent-management #1 |

**Issue:**
When admin removes an agent who's in an active call, the call continues. Creates confusing state - agent marked as 'removed' but still serving visitor.

**Fix Required:**
- Emit call:end event when removing an agent who is in in_call status
- Show graceful message to visitor

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/agents/actions.ts`
- `apps/server/src/features/agents/removeAgent.ts`
- `apps/widget/src/features/call/CallUI.tsx`

**Risk Notes:**
- Visitor should see friendly message, not abrupt disconnect
- Consider giving agent a few seconds warning before removal takes effect
- Log the forced call end for audit

**Acceptance Criteria:**
- [ ] Removing in-call agent triggers graceful call end
- [ ] Visitor sees 'Agent has ended the call' message
- [ ] Call is properly logged/ended in database
- [ ] If agent not in call, removal proceeds normally



---

### TKT-008: Fix Uptime Monitoring Doc - Use Free Tier Settings

| Field | Value |
|-------|-------|
| **Priority** | 🟢 Low |
| **Feature** | Uptime Monitoring |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low |
| **Risk** | 🟢 Low |
| **Source** | Finding M-UPTIME_MONITORING #1 |

**Issue:**
The uptime monitoring setup doc says to use Better Uptime's free tier (3-minute checks) but configures monitors with 1-minute checks (paid tier). Contradictory.

**Fix Required:**
- Update monitor configurations to use 3-minute check frequency to stay on free tier

**Files to Edit:**
- `docs/features/monitoring/UPTIME_MONITORING.md`

**Risk Notes:**
- Documentation only - no production risk
- 3-minute checks are still adequate for most uptime monitoring needs

**Acceptance Criteria:**
- [ ] All monitor configs show 3-minute check frequency
- [ ] Doc clearly states this is the free tier limit
- [ ] No contradictions between tier description and config



---

## Status Legend

| Status | Meaning |
|--------|---------|
| 📋 Ready | Awaiting dev assignment |
| 🔨 In Progress | Being worked on |
| ✅ Done | Completed |
| ❄️ On Hold | Blocked or deferred |
| ❌ Won't Fix | Rejected - not a real issue or too low value |

---

## Completed Tickets

<!-- Move completed tickets here for historical reference -->

| ID | Feature | Issue | Completed | Notes |
|----|---------|-------|-----------|-------|
| - | - | - | - | - |

---

## Rejected Tickets

<!-- Move rejected tickets here for audit trail -->

| ID | Feature | Issue | Rejected | Reason |
|----|---------|-------|----------|--------|
| - | - | - | - | - |
