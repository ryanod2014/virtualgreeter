# Feature Documentation Master Doc

This document contains:
1. **The list of all features** that need documenting
2. **The template** for how to document each one
3. **Instructions** for the engineer

---

# PART 1: HOW TO DOCUMENT A FEATURE

## Your Mission

Create a deeply detailed document that covers EVERY possible scenario, edge case, and logic path for your assigned feature. The goal is to enable a reviewer to:
1. Understand exactly how this feature works
2. Identify any logic that doesn't make sense from first principles
3. Find edge cases where users might have a bad experience
4. alert critical logic issues.

## Time Investment

Spend **30-60 minutes** going DEEP on your assigned feature. Don't guess - trace the actual code paths.

---

## How to Research

1. **Start with types** - Read `packages/domain/src/types.ts` and `packages/domain/src/database.types.ts`
2. **Find the UI** - Locate the React/Preact component
3. **Trace the events** - Follow socket events from client → server → client
4. **Check the database** - What tables are involved?
5. **Test mentally** - Walk through as a user, asking "what if?" at each step

## Key Files to Reference

### Types & Constants (START HERE)
- `packages/domain/src/types.ts` - All shared TypeScript types
- `packages/domain/src/constants.ts` - Socket events, timing, config
- `packages/domain/src/database.types.ts` - Database schema

### Widget (Visitor Experience)
- `apps/widget/src/Widget.tsx` - Main widget component
- `apps/widget/src/features/simulation/VideoSequencer.tsx` - Video playback
- `apps/widget/src/features/signaling/useSignaling.ts` - Socket connection
- `apps/widget/src/features/webrtc/useWebRTC.tsx` - WebRTC calls

### Dashboard (Agent/Admin Experience)
- `apps/dashboard/src/features/workbench/` - Agent bullpen
- `apps/dashboard/src/app/(app)/admin/` - Admin pages
- `apps/dashboard/src/features/signaling/` - Dashboard socket

### Server (Backend Logic)
- `apps/server/src/features/signaling/socket-handlers.ts` - All socket handlers
- `apps/server/src/features/routing/pool-manager.ts` - Routing algorithm
- `apps/server/src/lib/` - Utility services

---

## Document Template

Create your doc at: `docs/features/[category]/[feature-name].md`

Use this structure:

```markdown
# Feature: [Name]

## Quick Summary
2-3 sentences explaining what this feature does.

## Affected Users
- [ ] Website Visitor
- [ ] Agent
- [ ] Admin
- [ ] Platform Admin

---

## 1. WHAT IT DOES

### Purpose
Why does this feature exist? What problem does it solve?

### User Goals
| User Type | What They Want | How This Feature Helps |
|-----------|---------------|----------------------|
| ... | ... | ... |

---

## 2. HOW IT WORKS

### High-Level Flow
Describe the happy path in numbered steps.

### State Machine
` ` `mermaid
stateDiagram-v2
    [*] --> InitialState
    InitialState --> NextState: trigger
    ...
` ` `

### State Definitions
| State | Description | How to Enter | How to Exit |
|-------|-------------|--------------|-------------|
| ... | ... | ... | ... |

---

## 3. DETAILED LOGIC

### Triggers & Events
| Event Name | Where It Fires | What It Does | Side Effects |
|------------|---------------|--------------|--------------|
| ... | ... | ... | ... |

### Key Functions/Components
| Function/Component | File | Purpose |
|-------------------|------|---------|
| ... | `path/to/file.ts` | ... |

### Data Flow
What data moves where? Include:
- API calls
- Socket events
- Database operations
- State changes

---

## 4. EDGE CASES

### Complete Scenario Matrix

For each scenario, document:
- What triggers it
- Current behavior
- Is this the RIGHT behavior?

| # | Scenario | Trigger | Current Behavior | Correct? | Notes |
|---|----------|---------|------------------|----------|-------|
| 1 | Happy path | ... | ... | ✅ | ... |
| 2 | Network drops during... | ... | ... | ⚠️ | ... |
| 3 | User does X then Y quickly | ... | ... | ❓ | ... |
| ... | ... | ... | ... | ... | ... |

### Error States
| Error | When It Happens | What User Sees | Recovery Path |
|-------|-----------------|----------------|---------------|
| ... | ... | ... | ... |

---

## 5. UI/UX REVIEW

### User Experience Audit
For each step in the flow, ask:
1. Is the feedback immediate?
2. Is it clear what's happening?
3. Is it clear what to do next?
4. What if they want to go back/cancel?
5. What if they wait too long?

| Step | User Action | System Response | Clear? | Issues |
|------|------------|-----------------|--------|--------|
| ... | ... | ... | ✅/⚠️/❌ | ... |

### Accessibility
- Keyboard navigation?
- Screen reader support?
- Color contrast?
- Loading states?

---

## 6. TECHNICAL CONCERNS

### Performance
- Any expensive operations?
- Any memory leaks possible?
- Any race conditions?

### Security
- Any exposed data?
- Any authorization gaps?
- Any injection points?

### Reliability
- What if server restarts?
- What if database is slow?
- What if third-party API fails?

---

## 7. FIRST PRINCIPLES REVIEW

### Does This Make Sense?
Answer these questions honestly:

1. **Is the mental model clear?** Does the user understand what's happening?
2. **Is the control intuitive?** Would a first-time user figure this out?
3. **Is feedback immediate?** Does the system respond within 100ms?
4. **Is the flow reversible?** Can users undo or go back?
5. **Are errors recoverable?** Can users fix problems themselves?
6. **Is the complexity justified?** Is there a simpler way?

### Identified Issues
| Issue | Impact | Severity | Suggested Fix |
|-------|--------|----------|--------------|
| ... | ... | 🔴/🟡/🟢 | ... |

---

## 8. CODE REFERENCES

List all relevant files with line numbers:

| Purpose | File | Lines | Notes |
|---------|------|-------|-------|
| Main component | `apps/.../file.tsx` | 50-150 | ... |
| Server handler | `apps/server/.../file.ts` | 200-300 | ... |
| Types | `packages/domain/types.ts` | 10-50 | ... |

---

## 9. RELATED FEATURES
List features this interacts with:
- [Feature A](./feature-a.md)
- [Feature B](./feature-b.md)

---

## 10. OPEN QUESTIONS
Things you couldn't determine from the code:
1. ...
2. ...
```

---

## Quality Checklist

Before marking complete, verify:
- [ ] Every state is documented
- [ ] Every transition is documented  
- [ ] Every error case is documented
- [ ] Every user type's perspective is covered
- [ ] Code references are accurate with line numbers
- [ ] Mermaid diagrams render correctly
- [ ] All "what if?" scenarios are answered
- [ ] First principles review is honest and critical

---

# PART 2: FEATURE LIST

## Progress Summary
- **Total Features:** 55
- **Documented:** 1
- **Reviewed:** 0
- **Issues Found:** 1 (fixed: pending calls lost on server restart)

---

## VISITOR FEATURES (`docs/features/visitor/`)

Features experienced by website visitors (widget users)

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| V1 | Widget Lifecycle (hidden → minimized → open → fullscreen states, drag/drop, auto-hide) | `widget-lifecycle.md` | | ⬜ Not Started |
| V2 | Video Sequencer (wave → intro → loop, buffering, transitions, error recovery) | `video-sequencer.md` | | ⬜ Not Started |
| V3 | Call Initiation & Active Call (request, WebRTC connection, controls, self-view) | `visitor-call.md` | | ⬜ Not Started |
| V4 | Call Reconnection (page navigation during call, token persistence) | `call-reconnection.md` | | ⬜ Not Started |
| V5 | Co-Browse Sender (DOM snapshot, mouse, scroll, selection, mutation tracking) | `cobrowse-sender.md` | | ⬜ Not Started |
| V6 | Widget Theming (dark/light/auto/liquid-glass, CSS variables, Shadow DOM) | `widget-theming.md` | | ⬜ Not Started |
| V7 | Device Detection & Mobile Behavior | `device-detection.md` | | ⬜ Not Started |
| V8 | Agent Unavailable / Visitor Reassignment | `agent-unavailable.md` | | ⬜ Not Started |

---

## AGENT FEATURES (`docs/features/agent/`)

Features used by sales/support agents in the dashboard

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| A1 | Bullpen & Agent States (away/idle/in_call/offline, status dropdown, idle timeout) | `bullpen-states.md` | | ⬜ Not Started |
| A2 | Incoming Call (modal, ringtone, browser notification, tab flash, accept/reject) | `incoming-call.md` | | ⬜ Not Started |
| A3 | RNA (Ring-No-Answer) Timeout & Auto-Reassignment | `rna-timeout.md` | | ⬜ Not Started |
| A4 | Active Call (WebRTC, controls, mute/video toggle, screen share, duration timer) | `agent-active-call.md` | | ⬜ Not Started |
| A5 | Co-Browse Viewer (DOM display, mouse cursor, scroll sync, viewport scaling) | `cobrowse-viewer.md` | | ⬜ Not Started |
| A6 | Call Recording (capture, indicator, playback) | `call-recording.md` | | ⬜ Not Started |
| A7 | Post-Call Disposition (modal, FB CAPI event firing) | `post-call-disposition.md` | | ⬜ Not Started |
| A8 | Video Recording Wizard (wave/intro/loop, countdown, re-record, upload) | `video-recording.md` | | ⬜ Not Started |
| A9 | Agent Stats & Call History | `agent-stats.md` | | ⬜ Not Started |
| A10 | Background Heartbeat & Tab Visibility (Chrome freeze prevention, reconnect) | `heartbeat-visibility.md` | | ⬜ Not Started |

---

## ADMIN FEATURES (`docs/features/admin/`)

Features used by organization admins to configure the system

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| D1 | Pool Management (create/edit/delete pools, catch-all pool) | `pool-management.md` | | ⬜ Not Started |
| D2 | Routing Rules (URL path matching, domain/path/query conditions) | `routing-rules.md` | | ⬜ Not Started |
| D3 | Tiered Agent Assignment (priority ranks within pools) | `tiered-routing.md` | | ⬜ Not Started |
| D4 | Agent Management (invite, remove, revoke, add self, video preview) | `agent-management.md` | | ⬜ Not Started |
| D5 | Widget Settings (size, position, theme, trigger delay, appearance) | `widget-settings.md` | | ⬜ Not Started |
| D6 | Country Blocklist/Allowlist (mode toggle, search, region bulk select) | `country-blocking.md` | | ⬜ Not Started |
| D7 | Dispositions (create, reorder, FB event mapping, values) | `dispositions.md` | | ⬜ Not Started |
| D8 | Recording & Transcription Settings (retention, AI summary customization) | `recording-settings.md` | | ⬜ Not Started |
| D9 | Call Logs (view, filter, search, CSV export, playback, transcription viewer) | `call-logs.md` | | ⬜ Not Started |
| D10 | Billing & Subscription (seats, pause, cancel, payment methods) | `billing.md` | | ⬜ Not Started |
| D11 | Organization Settings (logo, name, email change) | `org-settings.md` | | ⬜ Not Started |
| D12 | Site Management (create sites, embed code generation, verification) | `site-management.md` | | ⬜ Not Started |
| D13 | Coverage Heatmap & Staffing Gap Analysis | `coverage-heatmap.md` | | ⬜ Not Started |
| D14 | Facebook Pixel Settings (organization conversion tracking) | `facebook-settings.md` | | ⬜ Not Started |

---

## PLATFORM FEATURES (`docs/features/platform/`)

Backend infrastructure, algorithms, and system-level features

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| P1 | Signaling Server Architecture (Socket.io, Redis pub/sub, horizontal scaling) | `signaling-server.md` | | ⬜ Not Started |
| P2 | Agent Assignment Algorithm (least-connections, tiered priority, round-robin) | `agent-assignment.md` | | ⬜ Not Started |
| P3 | Call Lifecycle (request → accept → active → end, state machine) | `call-lifecycle.md` | | ✅ Complete |
| P4 | Visitor Reassignment (agent disconnect, handoff, elastic pooling) | `visitor-reassignment.md` | | ⬜ Not Started |
| P5 | WebRTC Signaling (offer/answer/ICE, STUN/TURN configuration) | `webrtc-signaling.md` | | ⬜ Not Started |
| P6 | Heartbeat & Staleness Detection (agent sessions, cleanup, grace periods) | `heartbeat-staleness.md` | | ⬜ Not Started |
| P7 | Geolocation & IP Lookup (country detection, caching) | `geolocation.md` | | ⬜ Not Started |
| P8 | Call Logging & Analytics (pageviews, missed opportunities, metrics) | `call-logging.md` | | ⬜ Not Started |
| P9 | Transcription & AI Summarization (Deepgram, OpenAI, cost tracking) | `transcription.md` | | ⬜ Not Started |
| P10 | Facebook Conversion API (org pixel, platform retargeting, event firing) | `facebook-capi.md` | | ⬜ Not Started |
| P11 | Database Triggers & Automations (auto-create org/pool/dispositions, counters) | `database-triggers.md` | | ⬜ Not Started |
| P12 | Health Checks & Monitoring (Redis, Supabase, memory, degraded state) | `health-monitoring.md` | | ⬜ Not Started |

---

## AUTH & ONBOARDING (`docs/features/auth/`)

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| O1 | Login & Signup Flow (email/password, OAuth, validation) | `login-signup.md` | | ⬜ Not Started |
| O2 | Password Reset (forgot, reset, email confirmation) | `password-reset.md` | | ⬜ Not Started |
| O3 | Accept Invite Flow (email invite → account creation → org join) | `accept-invite.md` | | ⬜ Not Started |
| O4 | Paywall & Checkout (card entry, seat selection, Stripe integration) | `paywall-checkout.md` | | ⬜ Not Started |
| O5 | Trial Management & Expiration | `trial-management.md` | | ⬜ Not Started |
| O6 | Mobile Gate (blocking mobile dashboard access) | `mobile-gate.md` | | ⬜ Not Started |

---

## FEEDBACK & SURVEYS (`docs/features/feedback/`)

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| F1 | Bug Report System (screenshot, recording, submission, notifications) | `bug-reports.md` | | ⬜ Not Started |
| F2 | Feature Request Forum (submission, voting, comments, notifications) | `feature-requests.md` | | ⬜ Not Started |
| F3 | PMF Survey (eligibility, modal, cooldown, responses) | `pmf-survey.md` | | ⬜ Not Started |

---

## SUPERADMIN (`docs/features/superadmin/`)

Platform-level admin features (for GreetNow internal team)

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| S1 | Organizations Dashboard (health scoring, MRR, risk indicators) | `organizations-dashboard.md` | | ⬜ Not Started |
| S2 | Cancellations & Churn Tracking (reasons, competitors, would-return) | `cancellations.md` | | ⬜ Not Started |
| S3 | Platform Feedback Management (bug reports, feature requests, priorities) | `platform-feedback.md` | | ⬜ Not Started |
| S4 | Signup Funnel Analytics (step tracking, conversion rates, cohorts) | `funnel-analytics.md` | | ⬜ Not Started |

---

## MARKETING (`docs/features/marketing/`)

Public-facing pages

| # | Feature | File Name | Assigned To | Status |
|---|---------|-----------|-------------|--------|
| M1 | Landing Page (hero, features, testimonials, animations) | `landing-page.md` | | ⬜ Not Started |
| M2 | Widget Demo (interactive preview, animation sequence) | `widget-demo.md` | | ⬜ Not Started |
| M3 | ROI / Cost Calculator (interactive funnel, metrics) | `cost-calculator.md` | | ⬜ Not Started |
| M4 | Socratic Questions (yes/no questionnaire flow) | `socratic-questions.md` | | ⬜ Not Started |

---

# PART 3: PRIORITY & TRACKING

## Priority Tiers (By Criticality)

Priority is based on:
1. **Revenue/Conversion Impact** - Features directly affecting whether calls happen
2. **System Stability** - Foundational logic other features depend on
3. **Failure Severity** - What breaks if this goes wrong
4. **Debug Difficulty** - Complex logic that's hard to trace without docs

---

### 🔴 TIER 1: MISSION-CRITICAL (Document First)
*Bugs here = direct revenue loss or broken product*

| Priority | ID | Feature | Why Critical |
|----------|-----|---------|--------------|
| **1** | **P3** | Call Lifecycle | THE state machine. Everything else depends on this. If wrong, entire product breaks. |
| **2** | **P2** | Agent Assignment Algorithm | Wrong routing = visitors get wrong agents or no agents. Core product logic. |
| **3** | **V3** | Visitor Call | THE conversion moment. If visitors can't request calls, product is useless. |
| **4** | **A2** | Incoming Call | If agents can't answer, every call is missed. Direct revenue impact. |
| **5** | **A3** | RNA Timeout | What happens when agents don't answer. Prevents visitors from getting stuck. |
| **6** | **P4** | Visitor Reassignment | Recovery when agent fails mid-call or before answer. Critical fallback logic. |

---

### 🟠 TIER 2: HIGH PRIORITY (Document Next)
*Core experience that must work reliably*

| Priority | ID | Feature | Why High Priority |
|----------|-----|---------|-------------------|
| **7** | **P6** | Heartbeat & Staleness Detection | Determines who's "actually" online. Bad staleness = routing to dead agents. |
| **8** | **A1** | Bullpen & Agent States | Foundation of agent availability. States must be accurate for routing. |
| **9** | **P5** | WebRTC Signaling | The actual connection. If offer/answer/ICE fails, no call happens. |
| **10** | **V4** | Call Reconnection | Recovering dropped calls. Critical for not losing visitors on page nav. |
| **11** | **V1** | Widget Lifecycle | Foundation of visitor experience. State bugs create confusion. |
| **12** | **V2** | Video Sequencer | Core "ghost greeter" illusion. Differentiator must work smoothly. |

---

### 🟡 TIER 3: MEDIUM PRIORITY
*Important features with moderate complexity*

| Priority | ID | Feature | Notes |
|----------|-----|---------|-------|
| **13** | **D2** | Routing Rules | How visitors match to pools. Misconfiguration = wrong routing. |
| **14** | **D3** | Tiered Agent Assignment | Priority within pools. Less complex but impacts call distribution. |
| **15** | **A4** | Agent Active Call | In-call controls. Issues here = bad call experience but call still happens. |
| **16** | **V8** | Agent Unavailable / Reassignment | Edge case handling for visitor side. |
| **17** | **A5** | Co-Browse Viewer | Premium feature but secondary to core call. |
| **18** | **V5** | Co-Browse Sender | Must pair with A5, complex DOM tracking. |
| **19** | **A10** | Background Heartbeat & Tab Visibility | Chrome freeze prevention. Subtle but causes "ghost agents." |

---

### 🟢 TIER 4: STANDARD PRIORITY
*Admin config & supporting features*

| Priority | ID | Feature | Notes |
|----------|-----|---------|-------|
| **20** | **D1** | Pool Management | Admin config, less complex logic. |
| **21** | **D5** | Widget Settings | Configuration, not algorithmic. |
| **22** | **D4** | Agent Management | CRUD + invites. Standard patterns. |
| **23** | **D6** | Country Blocking | Straightforward blocklist logic. |
| **24** | **D7** | Dispositions | Post-call tagging. Important for analytics. |
| **25** | **A7** | Post-Call Disposition | Includes FB CAPI firing - conversion tracking. |
| **26** | **D9** | Call Logs | View/export. Standard dashboard feature. |
| **27** | **A6** | Call Recording | Recording capture. Important but mature. |
| **28** | **V6** | Widget Theming | CSS/visual. Low logic complexity. |

---

### 🔵 TIER 5: LOWER PRIORITY
*Auth, billing, onboarding - typically stable patterns*

| Priority | ID | Feature | Notes |
|----------|-----|---------|-------|
| **29** | **D10** | Billing & Subscription | Stripe integration. Sensitive but well-tested. |
| **30** | **O1** | Login & Signup | Standard auth. Usually stable. |
| **31** | **O4** | Paywall & Checkout | Stripe checkout. Well-defined flow. |
| **32** | **O3** | Accept Invite | Invite flow. Linear process. |
| **33** | **O5** | Trial Management | Simple date logic. |
| **34** | **A8** | Video Recording Wizard | Self-contained feature. |
| **35** | **P9** | Transcription & AI | Third-party integration (Deepgram/OpenAI). |
| **36** | **P10** | Facebook CAPI | Event firing. Well-defined API. |

---

### ⚪ TIER 6: DOCUMENT LAST
*Marketing, feedback, superadmin - lower frequency, lower risk*

| IDs | Category | Notes |
|-----|----------|-------|
| M1-M4 | Marketing | Static pages, low logic. |
| F1-F3 | Feedback | Bug reports, feature requests. Standard CRUD. |
| S1-S4 | Superadmin | Internal tools, can document as needed. |
| O2, O6 | Auth edge cases | Password reset, mobile gate. |
| P1, P7, P8, P11, P12 | Platform utilities | Important but supporting. |
| V7, D8, D11-D14, A9 | Misc | Can slot in as time allows. |

---

### 💡 Key Recommendation

**Start with Tier 1 items P3, P2, and V3/A2.** These form the "call triangle":
- **P3 (Call Lifecycle)** = The state machine orchestrating everything
- **P2 (Agent Assignment)** = Who gets the call
- **V3/A2 (Call Initiation)** = Both sides of the critical handshake

Understanding these four features will give you foundational knowledge that makes documenting everything else faster and more accurate.

---

## Status Key

| Icon | Status | Description |
|------|--------|-------------|
| ⬜ | Not Started | No work begun |
| 🟡 | In Progress | Agent actively working on it |
| 📝 | Draft Complete | Doc written, needs review |
| 🔍 | Under Review | Being reviewed for accuracy |
| ✅ | Complete | Reviewed and approved |
| 🔴 | Blocked | Cannot proceed (note why) |

---

## Quick Assignment Template

Copy this when assigning a feature:

```
## Assignment: [FEATURE_ID] - [Feature Name]

**Assigned to:** @agent-name
**Due:** [date]
**Status:** 🟡 In Progress

**Task:**
Document the [Feature Name] feature using the template in Part 1 of this doc.

**Output file:** `docs/features/[category]/[filename].md`

**Key files to examine:**
- [list relevant files]

**Special focus:**
- [any specific concerns or areas to investigate]
```

---

## Review Checklist

When reviewing a completed doc:

- [ ] All states documented
- [ ] All transitions documented
- [ ] Edge cases comprehensive
- [ ] Code references accurate
- [ ] Diagrams render correctly
- [ ] First principles review is honest
- [ ] No obvious gaps
- [ ] Issues table populated

---

## Notes

- Each agent should spend **30-60 minutes** going DEEP on their assigned feature
- **Don't guess** - trace the actual code paths
- **Be critical** - we want to find issues, not just describe the code
- Mark uncertainties in "Open Questions" section
- Cross-reference related features when you see dependencies
