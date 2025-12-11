# Test Plan for TKT-005b - Payment Failure Blocking Modal
## TICKET TYPE: ui

**Created:** 2025-12-09T12:00:00Z
**QA Agent:** qa-review-TKT-005b
**Session ID:** dd033ded-b919-48e3-9d00-3b9e193e302b
**Branch:** agent/tkt-005b
**Test Port:** 3105
**Tunnel URL:**

---

## ACCEPTANCE CRITERIA ANALYSIS

From ticket `TKT-005b`:

1. **AC1:** Full-screen modal appears when org status is 'past_due'
2. **AC2:** Admins see 'Update Payment Method' button
3. **AC3:** Agents see read-only message directing them to contact admin
4. **AC4:** Modal cannot be dismissed without resolving payment

---

## 1. ROLES TO TEST

**Analysis:** AC2 mentions "Admins" and AC3 mentions "Agents" - TWO distinct roles required.

| Role | Needs Separate User? | Needs Separate Magic Link? | Test Scenarios |
|------|---------------------|---------------------------|----------------|
| Admin | ✅ Yes | ✅ Yes | Modal with "Update Payment Method" button |
| Agent | ✅ Yes | ✅ Yes | Modal with "Contact your admin" message |

**Decision:** I need to create **2 users** in the **SAME organization** and generate **2 magic links**.

---

## 2. STATES TO TEST

| State | How to Set Up | Expected UI | How to Verify |
|-------|---------------|-------------|---------------|
| `past_due` | `set-org-status` API | Modal appears, blocks dashboard | Screenshot shows full-screen modal |
| `active` | `set-org-status` API | No modal, normal dashboard | Screenshot shows dashboard without modal |

---

## 3. UI TESTS - SCENARIOS

| # | Scenario | User Action | Expected Result | Evidence Type |
|---|----------|-------------|-----------------|---------------|
| 1 | Admin login with past_due | Navigate to dashboard | Full-screen modal appears with "Update Payment Method" button | Screenshot |
| 2 | Agent login with past_due | Navigate to dashboard | Full-screen modal appears with "Contact your admin" message | Screenshot |
| 3 | Modal dismissal attempt - ESC | Press ESC key | Modal remains visible (cannot dismiss) | Browser test |
| 4 | Modal dismissal attempt - backdrop | Click outside modal | Modal remains visible (cannot dismiss) | Browser test |
| 5 | Active status - Admin | Set org to active, refresh | No modal visible, dashboard accessible | Screenshot |
| 6 | Active status - Agent | Set org to active, refresh | No modal visible, dashboard accessible | Screenshot |
| 7 | Mobile viewport - Admin | Resize to 375px width | Modal displays correctly on mobile | Screenshot |
| 8 | Mobile viewport - Agent | Resize to 375px width | Modal displays correctly on mobile | Screenshot |

---

## 4. EDGE CASES TO TEST

1. **Rapid navigation** → Navigate to different routes while modal is shown → Modal should persist across route changes
2. **Page refresh** → Refresh page while modal is shown → Modal should reappear after refresh
3. **Direct URL access** → Try to access specific route (e.g., /dashboard/settings) → Modal should still block access
4. **Role-specific button visibility** → Verify admin button is NOT shown to agents
5. **Long text handling** → Check if message text wraps properly on small screens

---

## 5. ARTIFACT TRACKING

| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| Build verification | Build | ☐ | Build output | Pending |
| Admin past_due view | UI | ☐ | Screenshot | Pending |
| Agent past_due view | UI | ☐ | Screenshot | Pending |
| Modal cannot dismiss (ESC) | UI | ☐ | Test result | Pending |
| Modal cannot dismiss (backdrop) | UI | ☐ | Test result | Pending |
| Active status (no modal) | UI | ☐ | Screenshot | Pending |
| Mobile viewport | UI | ☐ | Screenshot | Pending |
| Admin magic link | Integration | ☐ | Magic URL | Pending |
| Agent magic link | Integration | ☐ | Magic URL | Pending |

---

## 6. FILES UNDER TEST

Based on ticket spec:

- `apps/dashboard/src/components/PaymentBlocker.tsx` (new component)
- `apps/dashboard/src/app/(dashboard)/layout.tsx` (integration point)

**Verification needed:**
1. PaymentBlocker component exists
2. Layout imports and uses PaymentBlocker
3. Layout checks org `subscription_status`
4. Component renders different UI for admin vs agent roles

---

## 7. TEST EXECUTION PLAN

### Step 1: Build Verification
```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

### Step 2: Start Dashboard on Port 3105
```bash
cd apps/dashboard
PORT=3105 pnpm dev &
sleep 10
curl -s http://localhost:3105 | head -1
```

### Step 3: Create Test Users (Atomic Setup)
```bash
curl -X POST http://localhost:3456/api/v2/qa/setup-multi-role-test \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-005b",
    "roles": ["admin", "agent"],
    "org_status": "past_due",
    "tunnel_url": ""
  }'
```

This creates:
- Admin user with email: `qa-admin-tkt005b-[timestamp]@greetnow.test`
- Agent user with email: `qa-agent-tkt005b-[timestamp]@greetnow.test`
- Both in SAME organization
- Organization status set to `past_due`
- Magic links generated for both users

### Step 4: Browser Testing for EACH Role

**For Admin:**
1. Navigate to http://localhost:3105/api/review-login?token=[admin_token]
2. Wait for redirect to dashboard
3. Verify modal appears
4. Take screenshot: `admin-past-due-modal.png`
5. Verify "Update Payment Method" button exists
6. Test ESC key → modal should NOT dismiss
7. Test backdrop click → modal should NOT dismiss
8. Set org to `active`
9. Refresh page
10. Verify NO modal appears
11. Take screenshot: `admin-active-no-modal.png`

**For Agent:**
1. Navigate to http://localhost:3105/api/review-login?token=[agent_token]
2. Wait for redirect to dashboard
3. Verify modal appears
4. Take screenshot: `agent-past-due-modal.png`
5. Verify "Contact your admin" message exists
6. Verify NO "Update Payment Method" button
7. Test ESC key → modal should NOT dismiss
8. Test backdrop click → modal should NOT dismiss

**Mobile Testing:**
1. Resize browser to 375px width
2. Repeat admin test
3. Take screenshot: `admin-mobile-modal.png`
4. Repeat agent test
5. Take screenshot: `agent-mobile-modal.png`

---

## 8. SELF-AUDIT CRITERIA (Before marking complete)

### General (ALL tickets)
- Total tests executed: ___ (should be ≥8)
- Evidence pieces: ___ (screenshots + test results)
- [ ] No 'verified via code inspection' phrases
- [ ] Every test has execution evidence

### UI Testing
- Roles in AC: **2** (admin, agent)
- Users created: ___ (must be 2)
- Magic links generated: ___ (must be 2)
- Screenshots taken: ___ (minimum 6)
- Browser tests executed: ___ (minimum 4)

**All numbers must match requirements!**

### Checklist
- [ ] I created TWO separate users (admin AND agent)
- [ ] Both users are in the SAME organization
- [ ] I logged in as BOTH users separately via browser
- [ ] I have screenshots for BOTH roles
- [ ] I have magic links for BOTH roles
- [ ] I tested modal dismissal (ESC and backdrop)
- [ ] I tested both `past_due` and `active` states
- [ ] I tested mobile viewport
- [ ] I did NOT say "verified via code inspection"
- [ ] I did NOT test only one role and assume the other works

---

## 9. EXPECTED DELIVERABLES

### If PASS:

**File 1:** `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/QA-TKT-005b-PASSED-[timestamp].md`
- Include this test plan
- Include all test results with evidence
- Include screenshots table
- Include magic links for PM review

**File 2:** `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/inbox/TKT-005b.json`
```json
{
  "ticket_id": "TKT-005b",
  "title": "Create Payment Failure Blocking Modal",
  "type": "ui_review",
  "status": "pending",
  "created_at": "[ISO timestamp]",
  "message": "QA verified ALL roles. PM please confirm each.",
  "branch": "agent/tkt-005b",
  "tunnel_url": "",
  "qa_report": "docs/agent-output/qa-results/QA-TKT-005b-PASSED-[timestamp].md",
  "screenshots": [
    {"name": "Admin View (past_due)", "path": "..."},
    {"name": "Agent View (past_due)", "path": "..."},
    {"name": "Admin View (active)", "path": "..."},
    {"name": "Mobile - Admin", "path": "..."}
  ],
  "magic_links": [
    {"role": "admin", "url": "/login?token=...", "what_pm_sees": "Full-screen modal with Update Payment Method button"},
    {"role": "agent", "url": "/login?token=...", "what_pm_sees": "Full-screen modal with Contact Admin message"}
  ],
  "test_setup": "Both users in same org, org set to past_due to trigger modal",
  "acceptance_criteria": [
    "Full-screen modal appears when org status is 'past_due'",
    "Admins see 'Update Payment Method' button",
    "Agents see read-only message directing them to contact admin",
    "Modal cannot be dismissed without resolving payment"
  ]
}
```

### If FAIL:

**File 1:** `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/blocked/QA-TKT-005b-FAILED-[timestamp].json`

**File 2:** `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-results/QA-TKT-005b-FAILED-[timestamp].md`

---

## READY TO PROCEED

✅ Test plan created
✅ Roles identified (2 required)
✅ Test scenarios defined (8 minimum)
✅ Edge cases identified (5)
✅ Evidence requirements clear
✅ Self-audit criteria established

**Next:** Execute Phase 2 - Build Verification
