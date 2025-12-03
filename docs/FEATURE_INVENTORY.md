# Feature Inventory

> **Purpose:** Complete list of all features with scenario-based documentation.
> **Status:** ✅ ALL DOCUMENTATION COMPLETE (Sprint finished Dec 3, 2025)

---

## Quick Stats

| Category | Features | Documented | Remaining |
|----------|----------|------------|-----------|
| Visitor | 5 | ✅ 5 | 0 |
| Agent | 5 | ✅ 5 | 0 |
| Platform | 5 | ✅ 5 | 0 |
| Admin | 8 | ✅ 8 | 0 |
| Billing | 6 | ✅ 6 | 0 |
| Auth | 4 | ✅ 4 | 0 |
| API | 3 | ✅ 3 | 0 |
| Stats | 3 | ✅ 3 | 0 |
| Monitoring | 2 | ✅ 2 | 0 |
| **TOTAL** | **41** | **✅ 41** | **0** |

---

## ✅ COMPLETED DOCUMENTATION (41 features)

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

### Admin Features (D1-D8) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| D1 | Pool Management | `admin/pool-management.md` | ✅ |
| D2 | Routing Rules | `admin/routing-rules.md` | ✅ |
| D3 | Tiered Routing | `admin/tiered-routing.md` | ✅ |
| D4 | Agent Management | `admin/agent-management.md` | ✅ |
| D5 | Widget Settings | `admin/widget-settings.md` | ✅ |
| D6 | Embed Code | `admin/embed-code.md` | ✅ |
| D7 | Call Logs | `admin/call-logs.md` | ✅ |
| D8 | Organization Settings | `admin/organization-settings.md` | ✅ |

### Billing Features (B1-B6) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| B1 | Subscription Creation | `billing/subscription-creation.md` | ✅ |
| B2 | Seat Management | `billing/seat-management.md` | ✅ |
| B3 | Billing Frequency | `billing/billing-frequency.md` | ✅ |
| B4 | Pause Subscription | `billing/pause-subscription.md` | ✅ |
| B5 | Cancel Subscription | `billing/cancel-subscription.md` | ✅ |
| B6 | Payment Failure | `billing/payment-failure.md` | ✅ |

### Auth Features (AUTH1-AUTH4) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| AUTH1 | Signup Flow | `auth/signup-flow.md` | ✅ |
| AUTH2 | Login Flow | `auth/login-flow.md` | ✅ |
| AUTH3 | Invite Accept | `auth/invite-accept.md` | ✅ |
| AUTH4 | Password Reset | `auth/password-reset.md` | ✅ |

### API Features (API1-API3) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| API1 | Agent API | `api/agent-api.md` | ✅ |
| API2 | Billing API | `api/billing-api.md` | ✅ |
| API3 | Invites API | `api/invites-api.md` | ✅ |

### Stats Features (STATS1-STATS3) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| STATS1 | Agent Stats | `stats/agent-stats.md` | ✅ |
| STATS2 | Coverage Stats | `stats/coverage-stats.md` | ✅ |
| STATS3 | Call Analytics | `stats/call-analytics.md` | ✅ |

### Monitoring Features (M1-M2) - ALL COMPLETE ✅

| ID | Feature | Doc File | Status |
|----|---------|----------|--------|
| M1 | Uptime Monitoring | `monitoring/UPTIME_MONITORING.md` | ✅ |
| M2 | Error Tracking | `monitoring/error-tracking.md` | ✅ |

---

## Documentation Format (Standard)

Each doc follows the 10-section format:

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

## File Structure

```
docs/features/
├── admin/
│   ├── agent-management.md    ✅
│   ├── call-logs.md           ✅
│   ├── embed-code.md          ✅
│   ├── organization-settings.md ✅
│   ├── pool-management.md     ✅
│   ├── routing-rules.md       ✅
│   ├── tiered-routing.md      ✅
│   └── widget-settings.md     ✅
├── agent/
│   ├── agent-active-call.md   ✅
│   ├── bullpen-states.md      ✅
│   ├── cobrowse-viewer.md     ✅
│   ├── incoming-call.md       ✅
│   └── rna-timeout.md         ✅
├── api/
│   ├── agent-api.md           ✅
│   ├── billing-api.md         ✅
│   └── invites-api.md         ✅
├── auth/
│   ├── invite-accept.md       ✅
│   ├── login-flow.md          ✅
│   ├── password-reset.md      ✅
│   └── signup-flow.md         ✅
├── billing/
│   ├── billing-frequency.md   ✅
│   ├── cancel-subscription.md ✅
│   ├── pause-subscription.md  ✅
│   ├── payment-failure.md     ✅
│   ├── seat-management.md     ✅
│   └── subscription-creation.md ✅
├── monitoring/
│   ├── error-tracking.md      ✅
│   └── UPTIME_MONITORING.md   ✅
├── platform/
│   ├── agent-assignment.md    ✅
│   ├── call-lifecycle.md      ✅
│   ├── heartbeat-staleness.md ✅
│   ├── visitor-reassignment.md ✅
│   └── webrtc-signaling.md    ✅
├── stats/
│   ├── agent-stats.md         ✅
│   ├── call-analytics.md      ✅
│   └── coverage-stats.md      ✅
└── visitor/
    ├── call-reconnection.md   ✅
    ├── cobrowse-sender.md     ✅
    ├── video-sequencer.md     ✅
    ├── visitor-call.md        ✅
    └── widget-lifecycle.md    ✅
```
