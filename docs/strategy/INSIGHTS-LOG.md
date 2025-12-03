# Strategy Insights Log

> **Purpose:** Capture ALL findings from Strategy Agents. PM triages what reaches human.
> **Rule:** Everything gets logged here. Only 🔴 URGENT items get escalated to human.

---

## Triage Categories

| Category | What It Means | Who Handles | Example |
|----------|---------------|-------------|---------|
| 🔴 **URGENT** | Human MUST decide. Blocking, risky, or architectural. | → Human immediately | "No Redis = calls will drop at scale" |
| 🟡 **IMPORTANT** | Should be fixed, but PM can queue it | → PM adds to backlog | "Missing retry logic on payments" |
| 🟢 **ROUTINE** | Good catch, PM handles without asking | → PM assigns to dev | "Naming convention inconsistent" |
| 📝 **NOTED** | Interesting observation, no action needed | → Just logged | "Bundle size is 2.1MB, acceptable" |

---

## 🔴 URGENT - Needs Human Decision

*These require YOUR input. PM will alert you.*

| Date | Finding | Why Urgent | Status |
|------|---------|------------|--------|
| 2024-12-03 | Server API endpoints have NO auth | Anyone can modify org configs | ⏳ Awaiting decision |
| 2024-12-03 | No Stripe webhook handler | Subscriptions won't sync, revenue at risk | ⏳ Awaiting decision |
| 2024-12-03 | Cancellation doesn't cancel in Stripe | Users who cancel keep being charged! | ⏳ Awaiting decision |
| 2024-12-03 | Pause/Resume don't update Stripe | Paused users keep being charged | ⏳ Awaiting decision |

---

## 🟡 IMPORTANT - PM Will Queue

*Good findings. PM adds to task board. You'll see in normal workflow.*

| Date | Finding | Added to Backlog? | Ticket |
|------|---------|-------------------|--------|
| 2024-12-03 | Metrics endpoint auth bypass via x-internal-request header | Yes | Queued |
| 2024-12-03 | Invites table overly permissive SELECT policy | Yes | Queued |
| 2024-12-03 | Dev mode skips auth when Supabase not configured | Yes | Queued |
| 2024-12-03 | No trial end handling via webhooks | Yes | Queued |
| 2024-12-03 | No payment failure handling | Yes | Queued |
| 2024-12-03 | reconnect_token column lacks index | Yes | Queued |
| 2024-12-03 | invites.expires_at lacks index | Yes | Queued |
| 2024-12-03 | Widget has no Sentry error reporting | Yes | Queued |
| 2024-12-03 | Missing error boundaries on dashboard pages | Yes | Queued |
| 2024-12-03 | Silent fire-and-forget operations (15+ locations) | Yes | Queued |

---

## 🟢 ROUTINE - PM Handles

*Small stuff PM just assigns to dev agents. No human decision needed.*

| Date | Finding | Assigned? | Status |
|------|---------|-----------|--------|
| | | | |

---

## 📝 NOTED - For Reference

*Observations that don't need action but are worth knowing.*

| Date | Finding | Source Report |
|------|---------|---------------|
| 2024-12-03 | All 30+ tables have RLS enabled ✓ | Security Audit |
| 2024-12-03 | Org-level isolation uses proper SECURITY DEFINER functions ✓ | Security Audit |
| 2024-12-03 | Socket.io agent auth verifies JWT + profile ownership ✓ | Security Audit |
| 2024-12-03 | Widget receives only non-sensitive display data ✓ | Security Audit |
| 2024-12-03 | Good architecture with getPriceIdForFrequency() helper | Stripe Audit |
| 2024-12-03 | Subscription metadata includes org_id for webhook correlation | Stripe Audit |

---

## Triage Decision Guide (For PM)

**Escalate to Human (🔴 URGENT) when:**
- Missing critical infrastructure (Redis, CDN, monitoring)
- Security vulnerability that could expose data
- Architectural decision that affects scalability
- Third-party service not configured (and it's blocking)
- Cost implications over $X/month
- Legal/compliance issue
- Breaking change that affects users

**Queue as Important (🟡) when:**
- Technical debt that should be fixed
- Missing error handling
- Performance optimization needed
- Code quality issues
- Missing tests for critical paths

**Handle as Routine (🟢) when:**
- Naming conventions
- Documentation updates
- Minor refactoring
- Code style issues
- Deprecated package updates
- Cleanup tasks

**Just Note (📝) when:**
- "This is fine as-is"
- Interesting patterns observed
- Future considerations
- Things working well

