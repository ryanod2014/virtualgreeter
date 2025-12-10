# Test Plan for TKT-005b: Payment Failure Blocking Modal
## TICKET TYPE: ui

**Ticket ID:** TKT-005b
**Branch:** agent/tkt-005b
**QA Agent:** qa-review-TKT-005b
**Session ID:** 2006f7a5-0ad9-4c80-9d6e-4aa410e1ac29
**Created:** 2025-12-09

---

## ACCEPTANCE CRITERIA (From Ticket)

1. ✅ Full-screen modal appears when org status is 'past_due'
2. ✅ Admins see 'Update Payment Method' button
3. ✅ Agents see read-only message directing them to contact admin
4. ✅ Modal cannot be dismissed without resolving payment

---

## UI TESTS - ROLES TO TEST

| Role | User Email | Tests | Magic Link? |
|------|-----------|-------|-------------|
| Admin | qa-admin-TKT-005b@greetnow.test | Modal appearance, payment button, button link, non-dismissible | Yes |
| Agent | qa-agent-TKT-005b@greetnow.test | Modal appearance, read-only message, no payment button, non-dismissible | Yes |

---

## UI TESTS - SCENARIOS

| # | Scenario | User Action | Expected Result |
|---|----------|-------------|-----------------|
| 1 | Admin happy path | Login as admin with org in past_due | Modal appears with payment button |
| 2 | Admin payment button | Click "Update Payment Method" button | Navigates to /admin/settings/billing |
| 3 | Agent view | Login as agent with org in past_due | Modal appears with contact admin message |
| 4 | Agent no button | View modal as agent | No payment button visible, only read-only message |
| 5 | Non-dismissible | Try to click backdrop | Modal stays visible, cannot dismiss |
| 6 | Active org (no modal) | Login with org NOT in past_due | No modal appears, normal dashboard access |
| 7 | Mobile viewport | View modal on 375px width | Modal is readable and usable |

---

## ARTIFACT TRACKING

| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| Build verification | Build | ☐ | Pending | Pending |
| Admin modal appears | UI | ☐ | Screenshot pending | Pending |
| Admin payment button | UI | ☐ | Screenshot pending | Pending |
| Admin button navigates | UI | ☐ | Browser test pending | Pending |
| Agent modal appears | UI | ☐ | Screenshot pending | Pending |
| Agent no button | UI | ☐ | Screenshot pending | Pending |
| Non-dismissible | UI | ☐ | Browser test pending | Pending |
| Active org (no modal) | UI | ☐ | Screenshot pending | Pending |
| Mobile viewport | UI | ☐ | Screenshot pending | Pending |

---

## TEST SETUP REQUIREMENTS

### 1. Test Accounts Needed
- Admin user with org in past_due status
- Agent user with org in past_due status
- Admin user with org in active status (control)

### 2. Database State Configuration
```bash
# Set org to past_due for testing
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{"email": "qa-admin-TKT-005b@greetnow.test", "status": "past_due"}'

# Set org to active for control test
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{"email": "qa-admin-control@greetnow.test", "status": "active"}'
```

### 3. Browser Testing Tools
- Playwright MCP for browser automation
- Screenshots for visual evidence
- Console log checking for errors

---

## EDGE CASES TO TEST

| # | Edge Case | Test Method | Expected |
|---|-----------|-------------|----------|
| 1 | Modal z-index | Check modal appears above all content | Modal fully visible, no content bleeding through |
| 2 | Button accessibility | Tab navigation to button | Button is keyboard accessible |
| 3 | Screen reader | Check aria labels and role attributes | Proper accessibility labels |
| 4 | Backdrop click | Click outside modal | Modal stays visible (non-dismissible) |
| 5 | Escape key | Press ESC key | Modal stays visible (non-dismissible) |
| 6 | Button link | Click payment button as admin | Navigates to /admin/settings/billing |

---

## SCREENSHOT PLAN

All screenshots will be saved to: `/Users/ryanodonnell/projects/Digital_greeter/docs/agent-output/qa-screenshots/TKT-005b/`

| Filename | Description | Viewport |
|----------|-------------|----------|
| `01-admin-modal.png` | Admin view with payment button | Desktop (1920x1080) |
| `02-admin-modal-mobile.png` | Admin view on mobile | Mobile (375x812) |
| `03-agent-modal.png` | Agent view with contact admin message | Desktop (1920x1080) |
| `04-agent-modal-mobile.png` | Agent view on mobile | Mobile (375x812) |
| `05-no-modal-active-org.png` | Control: Active org, no modal | Desktop (1920x1080) |
| `06-button-hover.png` | Admin button hover state | Desktop (1920x1080) |

---

## SUCCESS CRITERIA

### PASS Conditions
- ✅ All 4 acceptance criteria verified with browser tests
- ✅ Admin and agent views tested separately
- ✅ Screenshots captured for both roles
- ✅ Modal is non-dismissible (tested)
- ✅ No console errors
- ✅ Mobile viewport tested
- ✅ Build verification passes (or pre-existing errors only)

### FAIL Conditions
- ❌ Modal doesn't appear when org is past_due
- ❌ Admin doesn't see payment button
- ❌ Agent sees payment button (should be admin only)
- ❌ Modal can be dismissed
- ❌ Console errors appear
- ❌ Mobile viewport broken
- ❌ New build errors introduced

---

## NEXT STEPS

1. Run build verification (Phase 2)
2. Start dev server
3. Create test users via PM dashboard API
4. Execute browser tests for each role
5. Capture screenshots
6. Generate magic links for PM review
7. Write final QA report and inbox item

---

## NOTES

- This is a UI ticket requiring PM approval after QA passes
- Must test EACH role separately (admin and agent)
- Must generate magic links for BOTH roles
- Cannot auto-merge - needs PM visual verification
- PaymentBlocker component is in apps/dashboard/src/components/PaymentBlocker.tsx
- Layout integration is in apps/dashboard/src/app/(app)/admin/admin-layout-client.tsx
