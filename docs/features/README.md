# Feature Documentation

> **Purpose:** Comprehensive scenario-based documentation for every feature.
> **Format:** 10-section docs covering user goals, state machines, edge cases, and code references.

---

## Documentation Progress

| Category | Complete | Remaining |
|----------|----------|-----------|
| Visitor | ✅ 5/5 | 0 |
| Agent | ✅ 5/5 | 0 |
| Platform | ✅ 5/5 | 0 |
| Admin | 2/8 | 6 |
| Billing | 0/6 | 6 |
| Auth | 0/4 | 4 |
| API | 0/3 | 3 |
| Stats | 0/3 | 3 |
| Monitoring | 1/2 | 1 |
| **Total** | **18/~41** | **~23** |

---

## Feature Index

### ✅ Visitor Features (Complete)
| ID | Feature | Doc |
|----|---------|-----|
| V1 | Widget Lifecycle | `visitor/widget-lifecycle.md` |
| V2 | Video Sequencer | `visitor/video-sequencer.md` |
| V3 | Visitor Call | `visitor/visitor-call.md` |
| V4 | Call Reconnection | `visitor/call-reconnection.md` |
| V5 | Co-Browse Sender | `visitor/cobrowse-sender.md` |

### ✅ Agent Features (Complete)
| ID | Feature | Doc |
|----|---------|-----|
| A1 | Bullpen States | `agent/bullpen-states.md` |
| A2 | Incoming Call | `agent/incoming-call.md` |
| A3 | RNA Timeout | `agent/rna-timeout.md` |
| A4 | Agent Active Call | `agent/agent-active-call.md` |
| A5 | Co-Browse Viewer | `agent/cobrowse-viewer.md` |

### ✅ Platform Features (Complete)
| ID | Feature | Doc |
|----|---------|-----|
| P2 | Agent Assignment | `platform/agent-assignment.md` |
| P3 | Call Lifecycle | `platform/call-lifecycle.md` |
| P4 | Visitor Reassignment | `platform/visitor-reassignment.md` |
| P5 | WebRTC Signaling | `platform/webrtc-signaling.md` |
| P6 | Heartbeat & Staleness | `platform/heartbeat-staleness.md` |

### Admin Features (Partial)
| ID | Feature | Doc | Status |
|----|---------|-----|--------|
| D1 | Pool Management | `admin/pool-management.md` | ⏳ |
| D2 | Routing Rules | `admin/routing-rules.md` | ✅ |
| D3 | Tiered Routing | `admin/tiered-routing.md` | ✅ |
| D4 | Agent Management | `admin/agent-management.md` | ⏳ |
| D5 | Widget Settings | `admin/widget-settings.md` | ⏳ |
| D6 | Embed Code | `admin/embed-code.md` | ⏳ |
| D7 | Call Logs | `admin/call-logs.md` | ⏳ |
| D8 | Organization Settings | `admin/org-settings.md` | ⏳ |

### Billing Features (Not Started)
| ID | Feature | Doc | Status |
|----|---------|-----|--------|
| B1 | Subscription Creation | `billing/subscription-creation.md` | ⏳ |
| B2 | Seat Management | `billing/seat-management.md` | ⏳ |
| B3 | Billing Frequency | `billing/billing-frequency.md` | ⏳ |
| B4 | Pause Subscription | `billing/pause-subscription.md` | ⏳ |
| B5 | Cancel Subscription | `billing/cancel-subscription.md` | ⏳ |
| B6 | Payment Failure | `billing/payment-failure.md` | ⏳ |

### Auth Features (Not Started)
| ID | Feature | Doc | Status |
|----|---------|-----|--------|
| AUTH1 | Signup Flow | `auth/signup-flow.md` | ⏳ |
| AUTH2 | Login Flow | `auth/login-flow.md` | ⏳ |
| AUTH3 | Invite Accept | `auth/invite-accept.md` | ⏳ |
| AUTH4 | Password Reset | `auth/password-reset.md` | ⏳ |

### API Features (Not Started)
| ID | Feature | Doc | Status |
|----|---------|-----|--------|
| API1 | Agent API | `api/agent-api.md` | ⏳ |
| API2 | Billing API | `api/billing-api.md` | ⏳ |
| API3 | Invites API | `api/invites-api.md` | ⏳ |

### Stats Features (Not Started)
| ID | Feature | Doc | Status |
|----|---------|-----|--------|
| STATS1 | Agent Stats | `stats/agent-stats.md` | ⏳ |
| STATS2 | Coverage Stats | `stats/coverage-stats.md` | ⏳ |
| STATS3 | Call Analytics | `stats/call-analytics.md` | ⏳ |

### Monitoring (Partial)
| ID | Feature | Doc | Status |
|----|---------|-----|--------|
| M1 | Uptime Monitoring | `monitoring/UPTIME_MONITORING.md` | ✅ |
| M2 | Error Tracking | `monitoring/error-tracking.md` | ⏳ |

---

## Documentation Standard

Each feature doc follows a **10-section format**:

1. **Quick Summary** - What the feature does
2. **Affected Users** - Who uses it
3. **WHAT IT DOES** - Purpose + User Goals
4. **HOW IT WORKS** - High-Level Flow, State Machine, State Definitions
5. **DETAILED LOGIC** - Triggers, Events, Key Functions, Data Flow
6. **EDGE CASES** - Complete Scenario Matrix + Error States
7. **UI/UX REVIEW** - User Experience Audit + Accessibility
8. **TECHNICAL CONCERNS** - Performance, Security, Reliability
9. **FIRST PRINCIPLES REVIEW** - Mental model check, Identified Issues
10. **CODE REFERENCES** - File/line references

Plus: **RELATED FEATURES** and **OPEN QUESTIONS**

---

## Usage

These docs are the source of truth for how each feature works. Use them for:
- Onboarding new team members
- Writing test cases
- Answering support questions
- Planning feature changes
- Debugging issues
