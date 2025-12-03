# Feature Inventory

> **Purpose:** Complete list of all features that need scenario-based documentation.
> **PM:** Use this to generate doc-agent prompts for parallel execution.
> **Format:** Uses your existing comprehensive documentation format (10 sections per doc)

---

## Quick Stats

| Category | Features | Documented | Remaining |
|----------|----------|------------|-----------|
| Visitor | 5 | ✅ 5 | 0 |
| Agent | 5 | ✅ 5 | 0 |
| Platform | 5 | ✅ 5 | 0 |
| Admin | 2 | ✅ 2 | ~6 more |
| Billing | 6 | 0 | 6 |
| Auth | 4 | 0 | 4 |
| API | 3 | 0 | 3 |
| Stats | 3 | 0 | 3 |
| Monitoring | 1 | ✅ 1 | 1 |
| **TOTAL** | **~40** | **18** | **~22** |

---

## ✅ COMPLETED DOCUMENTATION (17 features)

### Visitor Features (V1-V5) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| V1 | Widget Lifecycle | `visitor/widget-lifecycle.md` | ✅ |
| V2 | Video Sequencer | `visitor/video-sequencer.md` | ✅ |
| V3 | Visitor Call | `visitor/visitor-call.md` | ✅ |
| V4 | Call Reconnection | `visitor/call-reconnection.md` | ✅ |
| V5 | Co-Browse Sender | `visitor/cobrowse-sender.md` | ✅ |

### Agent Features (A1-A5) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| A1 | Bullpen States | `agent/bullpen-states.md` | ✅ |
| A2 | Incoming Call | `agent/incoming-call.md` | ✅ |
| A3 | RNA Timeout | `agent/rna-timeout.md` | ✅ |
| A4 | Agent Active Call | `agent/agent-active-call.md` | ✅ |
| A5 | Co-Browse Viewer | `agent/cobrowse-viewer.md` | ✅ |

### Platform Features (P2-P6) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| P2 | Agent Assignment | `platform/agent-assignment.md` | ✅ |
| P3 | Call Lifecycle | `platform/call-lifecycle.md` | ✅ |
| P4 | Visitor Reassignment | `platform/visitor-reassignment.md` | ✅ |
| P5 | WebRTC Signaling | `platform/webrtc-signaling.md` | ✅ |
| P6 | Heartbeat & Staleness | `platform/heartbeat-staleness.md` | ✅ |

### Admin Features (D2-D3) - PARTIAL ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| D2 | Routing Rules | `admin/routing-rules.md` | ✅ |
| D3 | Tiered Routing | `admin/tiered-routing.md` | ✅ |

### Monitoring - PARTIAL ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| M1 | Uptime Monitoring | `monitoring/UPTIME_MONITORING.md` | ✅ |

---

## ⏳ NEEDS DOCUMENTATION (~22 features)

### Admin Features (Remaining)

| ID | Feature | Description | Key Files | Status |
|----|---------|-------------|-----------|--------|
| D1 | Pool Management | Create/edit/delete pools | `admin/pools/pools-client.tsx` | ⏳ |
| D4 | Agent Management | Invite/remove agents, seat allocation | `admin/agents/agents-client.tsx` | ⏳ |
| D5 | Widget Settings | Per-pool widget configuration | `admin/pools/` (widget settings section) | ⏳ |
| D6 | Embed Code | Widget installation instructions | `admin/installation/` | ⏳ |
| D7 | Call Logs | Historical call records and analytics | `admin/calls/` | ⏳ |
| D8 | Organization Settings | Company settings, branding | `admin/settings/` | ⏳ |

### Billing Features (B1-B6)

| ID | Feature | Description | Key Files | Status |
|----|---------|-------------|-----------|--------|
| B1 | Subscription Creation | Trial → payment → active subscription | `api/billing/create-subscription/`, `paywall/` | ⏳ |
| B2 | Seat Management | Add/remove seats, proration | `api/billing/seats/` | ⏳ |
| B3 | Billing Frequency | Monthly/annual/6-month switching | `api/billing/update-settings/` | ⏳ |
| B4 | Pause Subscription | Temporary pause and auto-resume | `api/billing/` pause routes | ⏳ |
| B5 | Cancel Subscription | Cancellation flow with feedback | `api/billing/` cancel routes | ⏳ |
| B6 | Payment Failure | Past due handling, Stripe webhooks | `stripe-webhook-handler.ts` | ⏳ |

### Auth Features (AUTH1-AUTH4)

| ID | Feature | Description | Key Files | Status |
|----|---------|-------------|-----------|--------|
| AUTH1 | Signup Flow | Email signup, org creation | `(auth)/signup/` | ⏳ |
| AUTH2 | Login Flow | Email/password login | `(auth)/login/` | ⏳ |
| AUTH3 | Invite Accept | Agent joins via invite link | `accept-invite/` | ⏳ |
| AUTH4 | Password Reset | Forgot password flow | `(auth)/forgot-password/`, `reset-password/` | ⏳ |

### API Features (API1-API3)

| ID | Feature | Description | Key Files | Status |
|----|---------|-------------|-----------|--------|
| API1 | Agent API | Agent CRUD operations | `api/agents/` | ⏳ |
| API2 | Billing API | All billing endpoints | `api/billing/` | ⏳ |
| API3 | Invites API | Invite send/revoke | `api/invites/` | ⏳ |

### Stats Features (STATS1-STATS3)

| ID | Feature | Description | Key Files | Status |
|----|---------|-------------|-----------|--------|
| STATS1 | Agent Stats | Per-agent performance metrics | `lib/stats/agent-stats.ts` | ⏳ |
| STATS2 | Coverage Stats | Pool coverage analytics | `lib/stats/coverage-stats.ts` | ⏳ |
| STATS3 | Call Analytics | Call volume, duration, outcomes | `admin/dashboard/` | ⏳ |

### Monitoring (Remaining)

| ID | Feature | Description | Key Files | Status |
|----|---------|-------------|-----------|--------|
| M2 | Error Tracking | Sentry integration | `sentry.*.config.ts` | ⏳ |

---

## Documentation Format (Your Existing Standard)

Each doc follows your 10-section format:

1. **Quick Summary** - 1-2 sentence overview
2. **Affected Users** - Checkboxes for Visitor/Agent/Admin/Platform Admin
3. **WHAT IT DOES** - Purpose + User Goals table
4. **HOW IT WORKS** - High-Level Flow, State Machine, State Definitions
5. **DETAILED LOGIC** - Triggers & Events, Key Functions, Data Flow
6. **EDGE CASES** - Complete Scenario Matrix, Error States
7. **UI/UX REVIEW** - User Experience Audit, Accessibility
8. **TECHNICAL CONCERNS** - Performance, Security, Reliability
9. **FIRST PRINCIPLES REVIEW** - Does This Make Sense?, Identified Issues
10. **CODE REFERENCES** - File/Line references table

Plus: **RELATED FEATURES** and **OPEN QUESTIONS**

---

## Generating Doc Agent Prompts

PM: For each undocumented feature, create a prompt file:

```
docs/prompts/active/doc-agent-[ID].md
```

Use template: `docs/workflow/templates/doc-agent.md`

Reference existing completed docs for format examples:
- `docs/features/visitor/widget-lifecycle.md` - Comprehensive example
- `docs/features/platform/call-lifecycle.md` - Another great reference

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ⏳ | Not started |
| 🔄 | In progress (doc agent running) |
| ✅ | Complete |

---

## File Structure

```
docs/features/
├── admin/
│   ├── routing-rules.md      ✅
│   └── tiered-routing.md     ✅
├── agent/
│   ├── agent-active-call.md  ✅
│   ├── bullpen-states.md     ✅
│   ├── cobrowse-viewer.md    ✅
│   ├── incoming-call.md      ✅
│   └── rna-timeout.md        ✅
├── api/                      ⏳ Empty
├── auth/                     ⏳ Empty
├── feedback/                 ⏳ Empty
├── marketing/                ⏳ Empty
├── monitoring/
│   └── UPTIME_MONITORING.md  ✅
├── platform/
│   ├── agent-assignment.md   ✅
│   ├── call-lifecycle.md     ✅
│   ├── heartbeat-staleness.md ✅
│   ├── visitor-reassignment.md ✅
│   └── webrtc-signaling.md   ✅
├── stats/                    ⏳ Empty
├── superadmin/               ⏳ Empty
├── utils/                    ⏳ Empty
└── visitor/
    ├── call-reconnection.md  ✅
    ├── cobrowse-sender.md    ✅
    ├── video-sequencer.md    ✅
    ├── visitor-call.md       ✅
    └── widget-lifecycle.md   ✅
```
