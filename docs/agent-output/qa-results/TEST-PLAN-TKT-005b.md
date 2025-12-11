# Test Plan for TKT-005b - Payment Failure Blocking Modal
## TICKET TYPE: ui

**Created:** 2025-12-09T00:00:00Z
**QA Agent:** qa-TKT-005b
**Session ID:** 45fd01d1-c0f9-4826-b395-ef9caedac972
**Dashboard Port:** 3105
**Tunnel URL:** (will be available during testing)

---

## 1. ROLES TO TEST

Analyzing acceptance criteria:
- AC2: "Admins see 'Update Payment Method' button"
- AC3: "Agents see read-only message directing them to contact admin"

**Decision:** TWO roles required - Admin AND Agent

| Role Mentioned in AC | Needs Separate User? | Needs Separate Magic Link? | Unique Email Required? |
|---------------------|---------------------|---------------------------|----------------------|
| Admin               | ✅ Yes               | ✅ Yes                     | ✅ Yes (with timestamp) |
| Agent               | ✅ Yes               | ✅ Yes                     | ✅ Yes (with timestamp) |

**Total users to create:** 2
**Total magic links to generate:** 2
**Total browser test sessions:** 2

---

## 2. STATES TO TEST

Analyzing acceptance criteria:
- AC1: "Full-screen modal appears when org status is 'past_due'"
- AC4: "Modal cannot be dismissed without resolving payment"

| State/Condition in AC | How to Set Up | How to Verify |
|----------------------|---------------|---------------|
| past_due             | POST to /api/v2/qa/set-org-status | Modal appears in browser, full-screen with backdrop |
| active (control)     | POST to /api/v2/qa/set-org-status | Modal does NOT appear, normal dashboard visible |

---

## 3. SCENARIOS TO TEST

### Happy Path Scenarios
| # | Scenario | User Action | Expected Result | Evidence Type |
|---|----------|-------------|-----------------|---------------|
| 1 | Admin logs in with past_due org | Login → Navigate to /admin | Full-screen modal blocks dashboard, shows "Update Payment Method" button | Screenshot |
| 2 | Agent logs in with past_due org | Login → Navigate to /dashboard | Full-screen modal blocks dashboard, shows "Contact your admin" message | Screenshot |
| 3 | Admin clicks Update Payment button | Click "Update Payment Method" | Navigates to /admin/settings/billing | Browser navigation check |
| 4 | Org status changes to active | Set org to active, refresh page | Modal disappears, normal dashboard access | Screenshot |

### Edge Case Scenarios
| # | Scenario | User Action | Expected Result | Evidence Type |
|---|----------|-------------|-----------------|---------------|
| 5 | ESC key pressed on modal | Press ESC key while modal is visible | Modal remains visible (non-dismissible) | Browser test |
| 6 | Click backdrop | Click outside modal on dark backdrop | Modal remains visible (non-dismissible) | Browser test |
| 7 | Navigate to different route | Try to navigate to /admin/settings while modal is shown | Modal persists across routes | Browser test |
| 8 | Page refresh | Refresh browser with modal visible | Modal reappears on page load | Browser test |
| 9 | Mobile viewport | Resize to 375px width | Modal is fully visible and usable | Screenshot |

---

## 4. ARTIFACTS I WILL PRODUCE

### For ADMIN Role
| Artifact Type | Path/URL | Status |
|--------------|----------|--------|
| Test user email | qa-admin-TKT-005b-{TIMESTAMP}@greetnow.test | ☐ Pending |
| Org verification | GET /api/v2/qa/org-by-email/{email} | ☐ Pending |
| Set to past_due | POST /api/v2/qa/set-org-status | ☐ Pending |
| Browser login screenshot | screenshots/TKT-005b/admin-01-logged-in.png | ☐ Pending |
| Modal visible screenshot | screenshots/TKT-005b/admin-02-modal-past-due.png | ☐ Pending |
| Button detail screenshot | screenshots/TKT-005b/admin-03-update-payment-button.png | ☐ Pending |
| Mobile viewport screenshot | screenshots/TKT-005b/admin-04-mobile.png | ☐ Pending |
| Magic link | Generated via /api/v2/review-tokens | ☐ Pending |

### For AGENT Role
| Artifact Type | Path/URL | Status |
|--------------|----------|--------|
| Test user email | qa-agent-TKT-005b-{TIMESTAMP}@greetnow.test | ☐ Pending |
| Org verification | GET /api/v2/qa/org-by-email/{email} | ☐ Pending |
| Set to past_due | POST /api/v2/qa/set-org-status | ☐ Pending |
| Browser login screenshot | screenshots/TKT-005b/agent-01-logged-in.png | ☐ Pending |
| Modal visible screenshot | screenshots/TKT-005b/agent-02-modal-past-due.png | ☐ Pending |
| Message detail screenshot | screenshots/TKT-005b/agent-03-contact-admin-message.png | ☐ Pending |
| Mobile viewport screenshot | screenshots/TKT-005b/agent-04-mobile.png | ☐ Pending |
| Magic link | Generated via /api/v2/review-tokens | ☐ Pending |

---

## 5. ACCEPTANCE CRITERIA MAPPING

| AC | Description | Test Method | Evidence Required | Roles to Test |
|----|-------------|-------------|-------------------|---------------|
| AC1 | Full-screen modal appears when org status is 'past_due' | Browser test - Set org to past_due, verify modal renders | Screenshots of modal for both admin and agent | Admin, Agent |
| AC2 | Admins see 'Update Payment Method' button | Browser test - Verify button exists in modal for admin user | Screenshot showing button, test button navigation | Admin only |
| AC3 | Agents see read-only message directing them to contact admin | Browser test - Verify message text for agent user | Screenshot showing contact admin message | Agent only |
| AC4 | Modal cannot be dismissed without resolving payment | Browser test - Try ESC key, backdrop click, navigation | Browser console logs, attempt interactions | Admin, Agent |

---

## 6. PASS/FAIL CRITERIA

### PASS Conditions
- ✅ All 4 acceptance criteria verified via browser testing
- ✅ Two separate users created (admin and agent) with unique emails
- ✅ Modal appears correctly for both roles when org is past_due
- ✅ Admin sees "Update Payment Method" button
- ✅ Agent sees "Contact your admin" message
- ✅ Modal cannot be dismissed (ESC, backdrop click tested)
- ✅ Build verification passes (or pre-existing errors documented)
- ✅ Screenshots captured for all role/state combinations
- ✅ Two magic links generated (one per role)

### FAIL Conditions
- ❌ Modal doesn't appear when org is past_due
- ❌ Admin doesn't see Update Payment button
- ❌ Agent doesn't see contact admin message
- ❌ Modal can be dismissed (ESC or backdrop closes it)
- ❌ New build errors introduced by this ticket
- ❌ Cannot create separate admin/agent users for testing
- ❌ Modal breaks on mobile viewport
- ❌ TypeScript/build errors in PaymentBlocker component

---

## 7. TESTING SEQUENCE

1. **Build Verification** → Document any pre-existing errors
2. **Start Dashboard** → On port 3105 (assigned to this QA session)
3. **Create Admin User** → With timestamp in email
4. **Login as Admin** → Via Playwright MCP at localhost:3105
5. **Verify Org Created** → Via API
6. **Set Org to past_due** → Via API
7. **Test Admin View** → Screenshots + edge cases
8. **Generate Admin Magic Link** → Via API with tunnel URL
9. **Create Agent User** → With timestamp in email, in SAME org as admin
10. **Login as Agent** → Via Playwright MCP at localhost:3105
11. **Verify Agent Org** → Via API
12. **Set Org to past_due** → Via API (if different org)
13. **Test Agent View** → Screenshots + edge cases
14. **Generate Agent Magic Link** → Via API with tunnel URL
15. **Self-Audit** → Count artifacts vs requirements
16. **Create Deliverables** → QA report + inbox JSON

---

## 8. BLOCKED PATH CONTINGENCY

If Playwright MCP is not available:
- ✅ Try starting browsers with npx playwright install chromium
- ✅ Document infrastructure issue
- ✅ Create blocker file with `blocker_type: "infrastructure"`
- ✅ Still generate magic links for PM to test manually

If cannot create agent-role users:
- ❌ DO NOT mark as passed with "code verified"
- ✅ Create blocker file with `blocker_type: "missing_tooling"`
- ✅ Document what was testable (admin view only)
- ✅ Request tooling enhancement ticket

---

## NOTES

- **CRITICAL:** Never reuse existing test users - always create fresh users with timestamps
- **CRITICAL:** Test BOTH roles separately in browser - no inferring from code inspection
- **CRITICAL:** All magic links must use tunnel URL for remote PM access
- **Port:** This QA session uses port 3105 - do NOT use 3000 (may conflict with other agents)
