# QA Review Assignment: TKT-005b

## Ticket Details

**ID:** TKT-005b
**Title:** Create Payment Failure Blocking Modal
**Branch:** agent/tkt-005b
**Priority:** Critical
**Vercel Preview:** https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app

## Your Mission

Test the Payment Failure Blocking Modal feature. This modal should:
1. Block dashboard access when org subscription_status is 'past_due'
2. Show different UI for admins vs agents
3. Be impossible to dismiss without fixing payment

## Acceptance Criteria to Verify

1. ✅ Full-screen modal appears when org status is 'past_due'
2. ✅ Admins see 'Update Payment Method' button
3. ✅ Agents see read-only message directing them to contact admin
4. ✅ Modal cannot be dismissed without resolving payment

---

## ⚠️ PREREQUISITES

Ensure the PM Dashboard is running:
```bash
# Check if running
curl -s http://localhost:3456/api/data | jq '.meta' 2>/dev/null || echo "NOT RUNNING"

# If not running, start it:
node docs/pm-dashboard-ui/server.js &
```

---

## STEP-BY-STEP: Test Setup & Magic Link Generation

### Step 1: Create Test User

```bash
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-tkt-005b@greetnow.test",
    "password": "QATest005bPass!",
    "full_name": "QA Test TKT-005b"
  }'
```

**Save the response** - you'll need the user_id.

### Step 2: Log in Once to Create Organization

**IMPORTANT:** The user must log in at least once for the organization to be auto-created.

Option A - Use Playwright MCP:
```javascript
// Navigate to preview login
browser_navigate({ url: "https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app/login" })

// Fill login form
browser_type({ element: "email input", ref: "[name=email]", text: "qa-tkt-005b@greetnow.test" })
browser_type({ element: "password input", ref: "[name=password]", text: "QATest005bPass!" })
browser_click({ element: "sign in button", ref: "button[type=submit]" })

// Wait for dashboard to load (this creates the org)
browser_wait_for({ text: "Dashboard" })
```

Option B - Try to set status (will fail if org doesn't exist, then login manually):
```bash
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "qa-tkt-005b@greetnow.test",
    "subscription_status": "past_due"
  }'
# If this returns error about no org, user needs to log in first
```

### Step 3: Set Organization to past_due

```bash
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "qa-tkt-005b@greetnow.test",
    "subscription_status": "past_due"
  }'
```

### Step 4: Browser Test the Feature

Test on the **VERCEL PREVIEW URL** (the feature branch, not localhost):

```
1. Navigate to: https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app/login
2. Login with: qa-tkt-005b@greetnow.test / QATest005bPass!
3. Verify PaymentBlocker modal appears immediately
4. Test these cases:
   - Press ESC → Modal should NOT dismiss
   - Click backdrop → Modal should NOT dismiss
   - Press back button → Modal should still be there
5. Take screenshots:
   - docs/agent-output/qa-screenshots/TKT-005B-modal-admin.png
   - docs/agent-output/qa-screenshots/TKT-005B-modal-mobile.png
```

### Step 5: Generate Magic Link

```bash
MAGIC_RESPONSE=$(curl -s -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-005B",
    "user_email": "qa-tkt-005b@greetnow.test",
    "user_password": "QATest005bPass!",
    "redirect_path": "/dashboard",
    "preview_base_url": "https://virtualgreeter-git-agent-tkt-005b-ryanod2014.vercel.app"
  }')

echo "Magic URL: $(echo $MAGIC_RESPONSE | jq -r '.magic_url')"
```

### Step 6: Submit to PM Inbox

```bash
curl -X POST http://localhost:3456/api/v2/inbox \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "TKT-005B",
    "type": "ui_review",
    "message": "PaymentBlocker Modal - Ready for PM review. Click magic link to see modal blocking dashboard access.",
    "branch": "agent/tkt-005b",
    "files": ["apps/dashboard/src/components/PaymentBlocker.tsx"],
    "magic_url": "'$(echo $MAGIC_RESPONSE | jq -r '.magic_url')'",
    "redirect_path": "/dashboard",
    "state_setup": "Organization subscription_status set to past_due"
  }'
```

### Step 7: Update Ticket Status

```bash
./scripts/agent-cli.sh update-ticket TKT-005b --status needs_pm_review
```

---

## Files to Check

- `apps/dashboard/src/components/PaymentBlocker.tsx` - The modal component
- `apps/dashboard/src/app/(app)/dashboard/dashboard-layout-client.tsx` - Checks org status

## Edge Cases to Test

| Test Case | Expected Result |
|-----------|-----------------|
| Org with no subscription data | Should NOT show blocker |
| Org with status 'active' | Should NOT show blocker |
| Org with status 'past_due' | MUST show blocker |
| Press ESC key | Modal should NOT dismiss |
| Click backdrop | Modal should NOT dismiss |
| Browser back button | Modal should still be there |
| Admin user | Shows "Update Payment Method" button |
| Non-admin user | Shows "Contact your admin" message |

---

## Troubleshooting

**"User has no organization" error:**
- User must log in at least once to trigger org auto-creation
- Use Playwright MCP to log in, or visit login page manually

**"Supabase not configured" error:**
- PM Dashboard needs Supabase credentials
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in environment
- Or create `apps/server/.env` with these values

**Modal not appearing:**
- Check org subscription_status is actually 'past_due'
- Check browser console for errors
- Verify you're on the correct Vercel preview (branch URL, not main)

---

## Read the SOP First!

```bash
cat docs/workflow/QA_REVIEW_AGENT_SOP.md
```

Good luck! 🚀
