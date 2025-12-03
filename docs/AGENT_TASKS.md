# 📋 Documentation Sprint Board

> **Current Focus:** Feature documentation
> **PM SOP:** `docs/workflow/PM_DOCS_SOP.md`
> **Git:** PM handles automatically (human never thinks about it)

---

## 📊 Documentation Progress

| Category | Complete | Remaining | Status |
|----------|----------|-----------|--------|
| Visitor (V1-V5) | ✅ 5 | 0 | Done |
| Agent (A1-A5) | ✅ 5 | 0 | Done |
| Platform (P2-P6) | ✅ 5 | 0 | Done |
| Admin (D1-D8) | 2 | 6 | In Progress |
| Billing (B1-B6) | 0 | 6 | Not Started |
| Auth (AUTH1-4) | 0 | 4 | Not Started |
| API (API1-3) | 0 | 3 | Not Started |
| Stats (STATS1-3) | 0 | 3 | Not Started |
| Monitoring (M1-2) | 1 | 1 | Partial |
| **TOTAL** | **18** | **~23** | **44% done** |

---

## 🚀 Ready to Launch

### Doc Agent Prompts Available

| Feature | Prompt File | Category |
|---------|-------------|----------|
| B1 - Subscription Creation | `docs/prompts/active/doc-agent-B1.md` | Billing |
| D1 - Pool Management | `docs/prompts/active/doc-agent-D1.md` | Admin |
| AUTH1 - Signup Flow | `docs/prompts/active/doc-agent-AUTH1.md` | Auth |

**Launch command:**
```
You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[ID].md
```

---

## 📝 PM Actions Needed

### Create More Doc Prompts

PM should create prompts for remaining features using:
- **Template:** `docs/workflow/templates/doc-agent.md`
- **Inventory:** `docs/FEATURE_INVENTORY.md`
- **Format reference:** Any doc in `docs/features/visitor/` or `docs/features/platform/`

### Features Still Needing Prompts

**Admin (6 remaining):**
- [ ] D4 - Agent Management
- [ ] D5 - Widget Settings
- [ ] D6 - Embed Code
- [ ] D7 - Call Logs
- [ ] D8 - Organization Settings

**Billing (5 remaining):**
- [ ] B2 - Seat Management
- [ ] B3 - Billing Frequency
- [ ] B4 - Pause Subscription
- [ ] B5 - Cancel Subscription
- [ ] B6 - Payment Failure

**Auth (3 remaining):**
- [ ] AUTH2 - Login Flow
- [ ] AUTH3 - Invite Accept
- [ ] AUTH4 - Password Reset

**API (3):**
- [ ] API1 - Agent API
- [ ] API2 - Billing API
- [ ] API3 - Invites API

**Stats (3):**
- [ ] STATS1 - Agent Stats
- [ ] STATS2 - Coverage Stats
- [ ] STATS3 - Call Analytics

**Monitoring (1):**
- [ ] M2 - Error Tracking

---

## 📂 Key Files

| File | Purpose |
|------|---------|
| `docs/FEATURE_INVENTORY.md` | Full feature list with source files |
| `docs/DOC_TRACKER.md` | Completion log (agents post here) |
| `docs/features/` | Output documentation |
| `docs/workflow/PM_DOCS_SOP.md` | PM instructions |
| `docs/workflow/DOC_AGENT_SOP.md` | Doc agent instructions |

---

## ✅ Completed Docs

All in `docs/features/`:

### Visitor
- `visitor/widget-lifecycle.md` (V1)
- `visitor/video-sequencer.md` (V2)
- `visitor/visitor-call.md` (V3)
- `visitor/call-reconnection.md` (V4)
- `visitor/cobrowse-sender.md` (V5)

### Agent
- `agent/bullpen-states.md` (A1)
- `agent/incoming-call.md` (A2)
- `agent/rna-timeout.md` (A3)
- `agent/agent-active-call.md` (A4)
- `agent/cobrowse-viewer.md` (A5)

### Platform
- `platform/agent-assignment.md` (P2)
- `platform/call-lifecycle.md` (P3)
- `platform/visitor-reassignment.md` (P4)
- `platform/webrtc-signaling.md` (P5)
- `platform/heartbeat-staleness.md` (P6)

### Admin
- `admin/routing-rules.md` (D2)
- `admin/tiered-routing.md` (D3)

### Monitoring
- `monitoring/UPTIME_MONITORING.md` (M1)

---

## 🗄️ Note: Old Workflow Archived

The previous Dev/QA/Review/Strategy workflow is archived at:
```
docs/workflow/archive/
```

This board is now **documentation-only**.
