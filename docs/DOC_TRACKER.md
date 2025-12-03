# Documentation Tracker

> **Purpose:** Single place to track all documentation agent completions.
> **PM:** Check this file to see progress.

---

## Status Summary

| Category | Total | Complete | In Progress | Remaining |
|----------|-------|----------|-------------|-----------|
| Visitor (V-*) | 5 | ✅ 5 | 0 | 0 |
| Agent (A-*) | 5 | ✅ 5 | 0 | 0 |
| Platform (P-*) | 5 | ✅ 5 | 0 | 0 |
| Admin (D-*) | 8 | ✅ 3 | 0 | 5 |
| Billing (B-*) | 6 | 0 | 0 | 6 |
| Auth (AUTH-*) | 4 | 0 | 0 | 4 |
| API (API-*) | 3 | 0 | 0 | 3 |
| Stats (STATS-*) | 3 | 0 | 0 | 3 |
| Monitoring (M-*) | 2 | ✅ 1 | 0 | 1 |
| **TOTAL** | **~41** | **19** | **0** | **~22** |

---

## ✅ Already Completed (18 docs)

### Visitor Features ✅
- V1 - Widget Lifecycle → `visitor/widget-lifecycle.md`
- V2 - Video Sequencer → `visitor/video-sequencer.md`
- V3 - Visitor Call → `visitor/visitor-call.md`
- V4 - Call Reconnection → `visitor/call-reconnection.md`
- V5 - Co-Browse Sender → `visitor/cobrowse-sender.md`

### Agent Features ✅
- A1 - Bullpen States → `agent/bullpen-states.md`
- A2 - Incoming Call → `agent/incoming-call.md`
- A3 - RNA Timeout → `agent/rna-timeout.md`
- A4 - Agent Active Call → `agent/agent-active-call.md`
- A5 - Co-Browse Viewer → `agent/cobrowse-viewer.md`

### Platform Features ✅
- P2 - Agent Assignment → `platform/agent-assignment.md`
- P3 - Call Lifecycle → `platform/call-lifecycle.md`
- P4 - Visitor Reassignment → `platform/visitor-reassignment.md`
- P5 - WebRTC Signaling → `platform/webrtc-signaling.md`
- P6 - Heartbeat & Staleness → `platform/heartbeat-staleness.md`

### Admin Features (Partial) ✅
- D2 - Routing Rules → `admin/routing-rules.md`
- D3 - Tiered Routing → `admin/tiered-routing.md`
- D4 - Agent Management → `admin/agent-management.md`

### Monitoring (Partial) ✅
- M1 - Uptime Monitoring → `monitoring/UPTIME_MONITORING.md`

---

## Completion Log (New Docs)

*Doc agents append here when they finish. Most recent at top.*

### B1 ✅
- **Feature:** Subscription Creation
- **Status:** COMPLETE
- **Doc File:** `docs/features/billing/subscription-creation.md`
- **Scenarios Documented:** 18
- **Edge Cases Documented:** 18
- **Completed At:** 2025-12-03 12:00

---

### D6 ✅
- **Feature:** Embed Code
- **Status:** COMPLETE
- **Doc File:** `docs/features/admin/embed-code.md`
- **Scenarios Documented:** 20
- **Edge Cases Documented:** 5
- **Completed At:** 2025-12-03 12:30

---

<!-- 
TEMPLATE FOR DOC AGENTS TO COPY:

### [FEATURE-ID] ✅
- **Feature:** [Feature Name]
- **Status:** COMPLETE
- **Doc File:** `docs/features/[category]/[filename].md`
- **Scenarios Documented:** [count]
- **Edge Cases Documented:** [count]
- **Completed At:** [YYYY-MM-DD HH:MM]

---
-->

## In Progress

*Doc agents append here when they START.*

---

<!-- 
TEMPLATE FOR DOC AGENTS TO COPY WHEN STARTING:

### [FEATURE-ID] 🔄
- **Feature:** [Feature Name]
- **Status:** IN PROGRESS
- **Started At:** [YYYY-MM-DD HH:MM]

---
-->

## Features Still Needing Documentation (~23)

### Admin (5 remaining)
- [ ] D1 - Pool Management
- [x] D4 - Agent Management → `admin/agent-management.md`
- [ ] D5 - Widget Settings
- [ ] D6 - Embed Code
- [ ] D7 - Call Logs
- [ ] D8 - Organization Settings

### Billing (6)
- [ ] B1 - Subscription Creation
- [ ] B2 - Seat Management
- [ ] B3 - Billing Frequency
- [ ] B4 - Pause Subscription
- [ ] B5 - Cancel Subscription
- [ ] B6 - Payment Failure

### Auth (4)
- [ ] AUTH1 - Signup Flow
- [ ] AUTH2 - Login Flow
- [ ] AUTH3 - Invite Accept
- [ ] AUTH4 - Password Reset

### API (3)
- [ ] API1 - Agent API
- [ ] API2 - Billing API
- [ ] API3 - Invites API

### Stats (3)
- [ ] STATS1 - Agent Stats
- [ ] STATS2 - Coverage Stats
- [ ] STATS3 - Call Analytics

### Monitoring (1 remaining)
- [ ] M2 - Error Tracking (Sentry)

---

## Quick Completion Check

Run this to see what's done:
```bash
grep "✅" docs/DOC_TRACKER.md | wc -l
```

Run this to see what's in progress:
```bash
grep "🔄" docs/DOC_TRACKER.md | wc -l
```

Count actual doc files:
```bash
find docs/features -name "*.md" ! -name ".gitkeep" ! -name "README.md" | wc -l
```

---

**Legend:** ⏳ Not started | 🔄 In progress | ✅ Complete

```bash
find docs/features -name "*.md" ! -name ".gitkeep" ! -name "README.md" | wc -l
```

---

**Legend:** ⏳ Not started | 🔄 In progress | ✅ Complete
