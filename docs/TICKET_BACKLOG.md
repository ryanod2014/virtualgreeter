# Ticket Backlog

> **Purpose:** Prioritized list of work items from review findings.
> **Owner:** Human reviews & prioritizes before dev sprint. PM maintains this file.
> **Status:** Creating tickets from Critical findings review

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

---

### TKT-001: Co-Browse Sensitive Data Sanitization

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Co-Browse (Viewer + Sender) |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🔴 High - Security/Privacy breach if not done correctly |
| **Source** | Findings A-cobrowse-viewer #1, #2; V-cobrowse-sender #1 |

**Issue:**
Password fields, credit card numbers, and other sensitive data are captured in DOM snapshots and transmitted to agents during co-browse sessions. This exposes plaintext passwords, violates PCI compliance, and creates privacy risks.

**Fix Required:**
Sanitize sensitive inputs before DOM serialization:
- Mask password fields with `••••••••`
- Mask credit card inputs (`input[autocomplete="cc-number"]`, `input[type="tel"]`)
- Mask elements with `data-sensitive="true"` attribute

**Files to Edit:**
- `apps/widget/src/features/cobrowse/domSerializer.ts` - Add sanitization before snapshot
- `apps/widget/src/features/cobrowse/cobrowseSender.ts` - Ensure sanitization is called
- `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx` - Verify no re-serialization happens

**Risk Notes:**
- If sanitization regex is too aggressive, may mask non-sensitive content
- If sanitization is bypassed, sensitive data leaks to agents
- Must test with various form structures (React forms, vanilla HTML, etc.)

**Acceptance Criteria:**
- [ ] Password input values show as `••••••••` in agent viewer
- [ ] Credit card fields show as masked
- [ ] Elements with `data-sensitive` attribute are masked
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
| **Complexity** | Medium (3-4 files) |
| **Risk** | 🔴 High - Customers charged after "cancelling" = financial harm + trust loss |
| **Source** | Findings D-organization-settings #1, #2; B-cancel-subscription #1 |

**Issue:**
When users cancel their subscription:
1. Code only sets `plan = "free"` in Supabase
2. Does NOT call Stripe API to cancel
3. UI says "access until end of billing period" but access is removed immediately

Customers may continue being charged by Stripe after they think they cancelled.

**Fix Required:**
1. Call `stripe.subscriptions.update({ cancel_at_period_end: true })` when user cancels
2. Keep access active until `current_period_end` from Stripe
3. Add webhook handler for `customer.subscription.deleted` to finalize downgrade

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts` - Add Stripe cancellation call in `submitCancellationFeedback`
- `apps/dashboard/src/lib/stripe.ts` - Add `cancelSubscription()` helper function
- `apps/server/src/features/webhooks/stripe.ts` - Handle `customer.subscription.deleted` event
- `packages/domain/src/database.types.ts` - May need `cancelling` status

**Risk Notes:**
- If Stripe call fails but DB updates, subscription cancelled locally but still billed
- Need idempotency - user might click cancel multiple times
- Webhook must be verified to prevent spoofing
- Test with Stripe test mode before production

**Acceptance Criteria:**
- [ ] Clicking "Cancel" calls Stripe API with `cancel_at_period_end: true`
- [ ] User retains access until their paid period ends
- [ ] After period ends, plan automatically becomes "free"
- [ ] Stripe dashboard shows subscription as "canceling"
- [ ] Webhook properly handles the final cancellation event

---

### TKT-003: Update Cancellation Data Deletion Copy

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Cancel Subscription |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low (1 file) |
| **Risk** | 🟡 Medium - Misleading copy could be compliance/legal issue |
| **Source** | Finding B-cancel-subscription #2 |

**Issue:**
Cancel modal warns that data (recordings, logs, analytics, etc.) will be "permanently deleted" but actual behavior just downgrades to free - no data is deleted. This is misleading.

**Fix Required:**
Update copy to: "Your data will be retained for 30 days after cancellation, then may be permanently deleted."

This is accurate (gives flexibility for manual cleanup) and sets clear expectations.

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx` - Update warning text

**Risk Notes:**
- Copy change only - low risk
- Should match any terms of service language
- Consider adding actual 30-day cleanup job later (separate ticket)

**Acceptance Criteria:**
- [ ] Cancel modal shows updated retention language
- [ ] No mention of "immediate" deletion
- [ ] Copy reviewed by stakeholder

---

### TKT-004: Complete Pause Subscription with Stripe Integration

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Pause Subscription |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High (5+ files) |
| **Risk** | 🔴 High - Customers billed during "pause" = financial harm |
| **Source** | Findings B-pause-subscription #1, #2 |

**Issue:**
1. `pauseAccount()` updates DB but does NOT pause billing in Stripe - customers still charged
2. No auto-resume when `pause_ends_at` is reached - subscriptions stay paused forever

**Fix Required:**
1. Implement Stripe `subscription.pause_collection` when pausing
2. Implement scheduled job to auto-resume when pause period ends
3. Add webhook handler for pause/resume events

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts` - Add Stripe pause call in `pauseAccount()`
- `apps/dashboard/src/lib/stripe.ts` - Add `pauseSubscription()` and `resumeSubscription()` helpers
- `apps/server/src/features/webhooks/stripe.ts` - Handle pause-related events
- `apps/server/src/features/scheduler/` - New: Create auto-resume cron job
- `supabase/migrations/` - May need migration for pause tracking

**Risk Notes:**
- Stripe pause behavior varies by plan type - test thoroughly
- Auto-resume job must be reliable - missed resume = extended pause
- Race condition possible if user manually resumes while job runs
- Need to handle case where payment fails on resume

**Acceptance Criteria:**
- [ ] Pausing account stops Stripe billing
- [ ] Resuming account restarts Stripe billing
- [ ] Auto-resume triggers at `pause_ends_at` timestamp
- [ ] User receives notification before auto-resume
- [ ] Failed payment on resume is handled gracefully
- [ ] **Widget disabled for paused orgs** - visitors see "temporarily unavailable"
- [ ] All agents forced to "offline" status when org pauses

---

### TKT-005: Payment Failure Blocking + Retry UI

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Payment Failure |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High (6+ files) |
| **Risk** | 🔴 High - Broken payments = revenue loss; blocking too aggressive = user churn |
| **Source** | Finding B-payment-failure #2 |

**Issue:**
When payment fails, users get ZERO feedback:
- No dashboard notification
- No email
- No popup
- Account continues working as if nothing happened

Users should be blocked from using the account until payment is resolved.

**Fix Required:**
1. Add `past_due` status to TypeScript types
2. Create full-screen payment retry modal that blocks app usage
3. Add Stripe webhook handler for `invoice.payment_failed`
4. Email notification on payment failure
5. Block all dashboard access for admin + agents until resolved
6. Force all agents to "offline" status (prevents widget from showing them as available)

**Files to Edit:**
- `packages/domain/src/database.types.ts` - Add `past_due` to SubscriptionStatus
- `apps/dashboard/src/components/PaymentBlocker.tsx` - New: Full-screen payment retry modal
- `apps/dashboard/src/app/(dashboard)/layout.tsx` - Add PaymentBlocker wrapper
- `apps/server/src/features/webhooks/stripe.ts` - Handle `invoice.payment_failed`
- `apps/server/src/lib/email.ts` - Add payment failure email template
- `apps/dashboard/src/lib/stripe.ts` - Add retry payment method
- `apps/server/src/features/agents/agentStatus.ts` - Force offline on payment failure

**Risk Notes:**
- Blocking too aggressively could frustrate users with temporary card issues
- Need grace period logic (e.g., 3 days before full block)
- Retry flow must handle all Stripe error types
- Must unblock immediately once payment succeeds
- In-progress calls should complete, but no new calls allowed

**Acceptance Criteria:**
- [ ] Payment failure triggers `past_due` status in database
- [ ] Full-screen modal appears blocking dashboard access
- [ ] Modal includes "Update Payment Method" button (admin only)
- [ ] Agents see read-only modal explaining billing issue - directs them to contact admin
- [ ] Email sent to admin on payment failure
- [ ] Successful payment immediately unblocks account
- [ ] **All agents forced to "offline" status** - widget won't show them as available
- [ ] Visitors see no available agents (widget shows "no agents available" or hides)

---

### TKT-006: Fix Middleware Redirect for Unauthenticated Users

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical |
| **Feature** | Login Flow / Authentication |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low (1 file) |
| **Risk** | 🟡 Medium - Could accidentally block authenticated users if done wrong |
| **Source** | Finding AUTH-login-flow #1 |

**Issue:**
Middleware code for protected routes has:
```typescript
if (isProtectedPath && !user) { return }
```
But no redirect to login page. Unauthenticated users on protected routes get a blank/error page instead of being redirected to login.

**Fix Required:**
Complete the redirect logic:
```typescript
if (isProtectedPath && !user) { 
  return NextResponse.redirect(new URL('/login', request.url)) 
}
```

**Files to Edit:**
- `apps/dashboard/middleware.ts` - Add redirect in the `if (!user)` block (around lines 56-57)

**Risk Notes:**
- Must preserve any existing redirect logic (e.g., callback URLs)
- Test that authenticated users are NOT affected
- Ensure redirect doesn't create infinite loop if `/login` is misconfigured

**Acceptance Criteria:**
- [ ] Visiting `/dashboard` while logged out redirects to `/login`
- [ ] Visiting any protected path while logged out redirects to `/login`
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
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🔴 High - Wrong agent assignment = bad customer experience |
| **Source** | Finding P-visitor-reassignment #1 |

**Issue:**
When a visitor is reassigned (original agent becomes unavailable), `findBestAgent()` is called WITHOUT the pool ID. A visitor originally matched to "Sales Pool" via URL routing could be reassigned to an agent in "Support Pool". This defeats the purpose of pool-based routing entirely.

**Fix Required:**
Pass pool ID to `findBestAgent()` during reassignment to maintain routing rules. Visitor should only be reassigned to agents in the same pool.

**Files to Edit:**
- `apps/server/src/features/reassignment/reassignVisitors.ts` - Pass pool_id to findBestAgent
- `apps/server/src/lib/agentSelection.ts` - Ensure findBestAgent respects pool_id parameter
- `apps/server/src/features/calls/callRequest.ts` - Verify pool_id is stored on call record for later use

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

---

### TKT-009: Org-Level Co-Browse Disable Setting

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Co-Browse, Organization Settings |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium (4-5 files) |
| **Risk** | 🟢 Low - New feature, doesn't break existing behavior |
| **Source** | Finding A-cobrowse-viewer #3 |

**Issue:**
Visitors have no control over screen sharing during calls. Co-browse is automatic with no opt-out. May violate privacy expectations or regional regulations (GDPR).

**Fix Required:**
Add organization-level setting to enable/disable co-browse feature entirely.

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx` - Add co-browse toggle to org settings
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts` - Add update action
- `supabase/migrations/` - Add `cobrowse_enabled` column to organizations
- `apps/widget/src/features/cobrowse/cobrowseSender.ts` - Check org setting before initializing
- `apps/server/src/lib/organization.ts` - Expose cobrowse_enabled setting

**Risk Notes:**
- Default should be `true` (enabled) to maintain current behavior
- Need to handle mid-call disable gracefully

**Acceptance Criteria:**
- [ ] Org settings shows "Enable Co-Browse" toggle
- [ ] When disabled, co-browse does not initialize for visitors
- [ ] Existing orgs default to enabled
- [ ] Setting change takes effect on next call (not mid-call)

**Feature Inventory:**
- [ ] Update `docs/FEATURE_INVENTORY.md` with new org setting

---

### TKT-011: Email Invite Retry Mechanism

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Agent Management (Invites) |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🟡 Medium - Email retry logic can be tricky |
| **Source** | Finding D4-agent-management #3 |

**Issue:**
If Resend API fails to send invite email, invite is still created in DB. Admin has no visibility that email failed. Invitee waits for email that never arrives.

**Fix Required:**
Implement retry mechanism with admin notification on failure.

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/agents/actions.ts` - Add retry logic to invite flow
- `apps/dashboard/src/lib/email.ts` - Add retry wrapper with exponential backoff
- `apps/dashboard/src/app/(dashboard)/agents/page.tsx` - Show invite status (sent/pending/failed)

**Risk Notes:**
- Don't retry infinitely - cap at 3 attempts
- If all retries fail, show clear error to admin
- Consider adding "Resend Invite" button for failed invites

**Acceptance Criteria:**
- [ ] Failed email triggers automatic retry (up to 3 attempts)
- [ ] Admin sees status of invite (sent/pending/failed)
- [ ] After all retries fail, admin gets clear notification
- [ ] "Resend Invite" button available for failed invites

---

### TKT-012: Migrate Geolocation to MaxMind

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Blocklist Settings, Geolocation |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🟡 Medium - External service migration |
| **Source** | Finding D-blocklist-settings #1 |

**Issue:**
Geolocation uses ip-api.com free tier (45 req/min limit). At scale, geolocation fails and ALL visitors allowed through, bypassing blocklist entirely.

**Fix Required:**
Migrate to MaxMind GeoIP service for higher rate limits and reliability.

**Files to Edit:**
- `apps/server/src/lib/geolocation.ts` - Replace ip-api with MaxMind API
- `apps/server/env.example` - Add MaxMind API key config
- `apps/server/src/features/blocklist/checkVisitor.ts` - Update error handling

**Risk Notes:**
- ⚠️ **COST CONSIDERATION:** MaxMind pricing needs review before starting
- Need to understand pricing tiers and expected usage
- Consider caching IP lookups to reduce API calls
- Keep ip-api as fallback during migration?

**Pre-Work Required:**
- [ ] Research MaxMind pricing tiers
- [ ] Estimate monthly API calls based on traffic
- [ ] Get budget approval if needed

**Acceptance Criteria:**
- [ ] Geolocation uses MaxMind API
- [ ] Rate limit is sufficient for expected traffic
- [ ] Fallback behavior documented if MaxMind fails
- [ ] Costs are within budget

---

### TKT-013: Retention Policy Retroactive Deletion Warning

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Organization Settings, Recording Retention |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium (3-4 files) |
| **Risk** | 🔴 High - Data deletion is irreversible |
| **Source** | Finding D-organization-settings #3 |

**Issue:**
When admin reduces retention from 90→30 days, behavior is unclear. Should be retroactive (delete old recordings) with clear warning.

**Fix Required:**
1. Implement retroactive deletion when retention is reduced
2. Show popup warning with count of recordings that will be deleted
3. Require confirmation before applying

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts` - Add deletion logic on retention change
- `apps/dashboard/src/app/(dashboard)/settings/RetentionWarningModal.tsx` - New: confirmation modal
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx` - Integrate warning modal
- `apps/server/src/features/recordings/deleteOldRecordings.ts` - Deletion query

**Risk Notes:**
- Deletion is IRREVERSIBLE - must have clear confirmation
- Count affected recordings before showing warning
- Log all deletions for audit trail
- Consider adding "scheduled deletion" with grace period

**Acceptance Criteria:**
- [ ] Reducing retention triggers confirmation modal
- [ ] Modal shows exact count of recordings to be deleted
- [ ] User must type "DELETE" or similar to confirm
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
| **Complexity** | Medium (3-4 files) |
| **Risk** | 🟢 Low - Adding UI element, not changing logic |
| **Source** | Finding D-recording-settings #1 |

**Issue:**
Visitors are recorded with NO indication. No "This call may be recorded" message. Compliance risk for GDPR, CCPA, two-party consent states.

**Fix Required:**
Add visible recording indicator that appears AFTER both parties are connected, in the same location where the "Live" badge appeared during preview loop.

**Files to Edit:**
- `apps/widget/src/features/call/CallUI.tsx` - Add recording indicator
- `apps/widget/src/features/call/RecordingBadge.tsx` - New: recording indicator component
- `apps/server/src/features/calls/callStart.ts` - Send recording_enabled flag to widget
- `apps/widget/src/styles.css` - Styling for recording badge

**Risk Notes:**
- Badge should be visible but not intrusive
- Only show when recording is actually enabled for the org
- Consider accessibility (screen reader support)

**Acceptance Criteria:**
- [ ] "Recording" indicator appears after call connects
- [ ] Indicator is in same location as "Live" badge was
- [ ] Only shows when org has recording enabled
- [ ] Accessible to screen readers

---

### TKT-015: Secure Recording URLs with Signed Access

| Field | Value |
|-------|-------|
| **Priority** | 🟠 High |
| **Feature** | Recordings, Storage |
| **Status** | 📋 Ready |
| **Difficulty** | 🔴 Hard |
| **Complexity** | High (5+ files) |
| **Risk** | 🔴 High - Security fix, storage migration required |
| **Source** | Finding A-agent-active-call #1 |

**Issue:**
Recording uploads go to public Supabase bucket with predictable URL patterns. Anyone who guesses the pattern can access recordings without auth. HIPAA/GDPR compliance risk.

**Fix Required:**
1. Move recordings to private bucket
2. Generate signed URLs with expiration for access
3. Add randomized UUIDs to paths

**Files to Edit:**
- `supabase/` - Create private bucket, migration for existing recordings
- `apps/dashboard/src/features/recordings/RecordingPlayer.tsx` - Use signed URLs
- `apps/server/src/features/recordings/uploadRecording.ts` - Upload to private bucket with UUID paths
- `apps/server/src/features/recordings/getRecordingUrl.ts` - New: generate signed URLs
- `apps/dashboard/src/lib/supabase.ts` - Add signed URL helper

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
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🟡 Medium - WebRTC edge cases are tricky |
| **Source** | Finding A-agent-active-call #2 |

**Issue:**
When WebRTC connection fails mid-call (network glitch, NAT timeout), agent must manually end and start new call. Customer may be lost.

**Fix Required:**
Implement ICE restart mechanism with automatic retry before showing failure state.

**Files to Edit:**
- `apps/dashboard/src/features/call/useWebRTC.ts` - Add ICE restart logic
- `apps/widget/src/features/call/useWebRTC.ts` - Mirror ICE restart logic
- `apps/server/src/features/signaling/handleIceRestart.ts` - New: coordinate restart between peers

**Risk Notes:**
- ICE restart has browser-specific quirks
- Set max retry attempts (3) before giving up
- Log all reconnection attempts for debugging
- May need to handle TURN server failover

**Acceptance Criteria:**
- [ ] ICE failure triggers automatic restart attempt
- [ ] Up to 3 restart attempts before showing error
- [ ] User sees "Reconnecting..." status during attempts
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
| **Complexity** | Medium (3-4 files) |
| **Risk** | 🟢 Low - Adding retry logic, not changing core flow |
| **Source** | Finding P-transcription-service #2 |

**Issue:**
When transcription fails (Deepgram error, timeout), there's no retry mechanism and no UI to manually retry. Failed transcriptions are stuck permanently.

**Fix Required:**
1. Auto-retry failed transcriptions (3 attempts with exponential backoff)
2. Add "Retry Transcription" button for calls where all retries failed
3. Log retry attempts for debugging

**Files to Edit:**
- `apps/server/src/features/transcription/processTranscription.ts` - Add retry logic with backoff
- `apps/dashboard/src/features/call-logs/CallLogRow.tsx` - Add retry button when status=failed
- `apps/dashboard/src/app/api/transcription/retry/route.ts` - New: manual retry endpoint
- `apps/server/src/lib/queue.ts` - Consider using job queue for retries

**Risk Notes:**
- Exponential backoff: 1s, 4s, 16s delays
- Max 3 attempts before marking permanently failed
- Don't retry if error is "audio too short" or similar non-retriable errors

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
| **Complexity** | Low (2 files) |
| **Risk** | 🟢 Low - UI timing fix |
| **Source** | Finding A-incoming-call #1 |

**Issue:**
Incoming call modal shows hardcoded 30-second countdown, but RNA timeout fires at 15 seconds (org-configured). Agents think they have more time than they do and get unexpectedly marked away.

**Fix Required:**
Fetch org's actual RNA timeout value and use it for the countdown display.

**Files to Edit:**
- `apps/dashboard/src/features/incoming-call/incoming-call-modal.tsx` - Use dynamic timeout from payload
- `apps/server/src/features/calls/callRequest.ts` - Include `rna_timeout_seconds` in call:incoming event

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
| **Complexity** | Low (2 files) |
| **Risk** | 🟢 Low - Adding validation |
| **Source** | Finding B-seat-management #1 |

**Issue:**
UI caps seats at 50, but API has no validation. Direct API calls could set arbitrarily high seat counts, causing billing issues or system strain.

**Fix Required:**
Add server-side validation to enforce maximum seat limit in API endpoints.

**Files to Edit:**
- `apps/dashboard/src/app/api/billing/seats/route.ts` - Add max seat validation
- `apps/dashboard/src/app/api/billing/update-settings/route.ts` - Add max seat validation

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
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🟡 Medium - Billing integrity |
| **Source** | Finding B-seat-management #2 |

**Issue:**
Stripe is updated before DB for seat changes. If DB update fails after Stripe succeeds, customer is charged for seats not reflected in app. Inconsistent state.

**Fix Required:**
Implement compensating transaction pattern:
1. Update Stripe
2. If DB update fails, rollback Stripe change
3. Add monitoring for any failures

**Files to Edit:**
- `apps/dashboard/src/app/api/billing/seats/route.ts` - Add rollback logic
- `apps/dashboard/src/lib/stripe.ts` - Add `revertSeatChange()` helper
- `apps/server/src/lib/monitoring.ts` - Alert on billing sync failures

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
| **Complexity** | High (5+ files) |
| **Risk** | 🟡 Medium - Session management complexity |
| **Source** | Finding P-visitor-reassignment #2 |

**Issue:**
If visitor disconnects mid-call (browser crash, accidental close), call ends permanently. No way to rejoin. Different from TKT-016 (WebRTC reconnection) which handles network blips while both parties are still connected.

**Fix Required:**
Add reconnection window allowing visitor to rejoin same call within 60 seconds of disconnect.

**Files to Edit:**
- `apps/server/src/features/calls/callLifecycle.ts` - Add "disconnected" state with timeout
- `apps/widget/src/features/call/useCallSession.ts` - Store session token for rejoin
- `apps/widget/src/features/call/RejoinPrompt.tsx` - New: "Rejoin call?" UI
- `apps/server/src/features/signaling/handleRejoin.ts` - New: rejoin logic
- `apps/dashboard/src/features/call/useActiveCall.ts` - Handle visitor rejoin event

**Risk Notes:**
- Session token must be stored locally (localStorage) to survive page reload
- Agent should see "Visitor reconnecting..." status
- After 60 seconds, call truly ends
- Consider what happens if agent ends call during reconnection window

**Acceptance Criteria:**
- [ ] Visitor who crashes browser can rejoin within 60 seconds
- [ ] Agent sees "Visitor disconnected - waiting for reconnection" status
- [ ] After 60 seconds, call ends normally
- [ ] Rejoin continues from same call state (not new call)

---

## 🟡 Medium Priority

> Logic issues, accessibility gaps, UX improvements, documentation gaps.

---

### TKT-007: Fix Public Feedback Feature Documentation

| Field | Value |
|-------|-------|
| **Priority** | 🟡 Medium |
| **Feature** | Public Feedback |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low (1-2 files) |
| **Risk** | 🟢 Low - Documentation only, no code changes |
| **Source** | Finding V-public-feedback #1 |

**Issue:**
The "Public Feedback" feature documentation describes it as "Post-call feedback for visitors" but the actual feature is a UserVoice-style feature request voting system for authenticated dashboard users (agents/admins). Website visitors never see this. The name and description are completely wrong.

**Fix Required:**
Update documentation to accurately describe the feature:
- Rename to "Feature Request Voting & Bug Reporting" or similar
- Update description to explain it's for authenticated dashboard users
- Clarify that "public" means cross-organization visibility, not anonymous access

**Files to Edit:**
- `docs/features/feedback/public-feedback.md` - Rewrite feature description
- `docs/prompts/active/review-agent-*public-feedback*.md` - Update if exists (or archive)

**Risk Notes:**
- Documentation only - no production risk
- May need to update any UI that references this feature name

**Acceptance Criteria:**
- [ ] Feature doc accurately describes the voting/feedback system
- [ ] No mention of "visitors" or "post-call"
- [ ] Clear that authentication is required

---

### TKT-020: Price ID Missing Should Error Not Fallback

| Field | Value |
|-------|-------|
| **Priority** | 🟡 Medium |
| **Feature** | Subscription Creation |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy |
| **Complexity** | Low (1-2 files) |
| **Risk** | 🟢 Low - Defensive coding improvement |
| **Source** | Finding B-subscription-creation #2 |

**Issue:**
When annual or 6-month price IDs aren't configured in environment, system silently falls back to monthly pricing with only a console warning. User selects annual, gets charged monthly rates - billing dispute risk.

**Fix Required:**
Make missing price ID a hard error that blocks subscription creation with user-visible message.

**Files to Edit:**
- `apps/dashboard/src/app/(auth)/paywall/page.tsx` - Check for price ID before showing option
- `apps/dashboard/src/lib/stripe.ts` - Throw error on missing price ID

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

---

### TKT-010: Graceful Call End on Agent Removal

| Field | Value |
|-------|-------|
| **Priority** | 🟢 Low |
| **Feature** | Agent Management |
| **Status** | 📋 Ready |
| **Difficulty** | 🟡 Medium |
| **Complexity** | Medium (2-3 files) |
| **Risk** | 🟡 Medium - Affects active calls |
| **Source** | Finding D4-agent-management #1 |

**Issue:**
When admin removes an agent who's in an active call, the call continues. Creates confusing state - agent marked as "removed" but still serving visitor.

**Fix Required:**
Emit `call:end` event when removing an agent who is in `in_call` status, with graceful message to visitor.

**Files to Edit:**
- `apps/dashboard/src/app/(dashboard)/agents/actions.ts` - Check call status before removal
- `apps/server/src/features/agents/removeAgent.ts` - Emit call:end event if in_call
- `apps/widget/src/features/call/CallUI.tsx` - Handle graceful "Agent has ended the call" message

**Risk Notes:**
- Visitor should see friendly message, not abrupt disconnect
- Consider giving agent a few seconds warning before removal takes effect
- Log the forced call end for audit

**Acceptance Criteria:**
- [ ] Removing in-call agent triggers graceful call end
- [ ] Visitor sees "Agent has ended the call" message
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
| **Complexity** | Low (1 file) |
| **Risk** | 🟢 Low - Documentation only |
| **Source** | Finding M-UPTIME_MONITORING #1 |

**Issue:**
The uptime monitoring setup doc says to use Better Uptime's free tier (which only allows 3-minute check intervals) but then configures monitors with 1-minute checks (which requires the paid $20/mo tier). This is contradictory.

**Fix Required:**
Update monitor configurations to use 3-minute check frequency to stay on free tier.

**Files to Edit:**
- `docs/features/monitoring/UPTIME_MONITORING.md` - Change "Check Frequency: 1 minute" to "Check Frequency: 3 minutes" for all monitors

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
