# UI Ticket QA Workflow - FOOLPROOF GUIDE

> **Purpose:** QA agents testing UI tickets must follow this EXACT workflow to ensure magic links work correctly.
>
> **Key Insight:** The QA agent is doing the work of a HUMAN QA team. You must:
> 1. **Actually test the feature yourself** (not just inspect code)
> 2. **See what the PM will see** (log in, trigger the feature)
> 3. **Prove it works** with screenshots
> 4. **Hand off that exact environment** to the PM via magic link

---

## ⚠️ THE PROBLEM THIS SOLVES

**Why magic links fail:**
```
Agent creates user → Tries to set org status → FAILS (no org exists yet!)
→ Agent generates magic link anyway
→ PM clicks link, doesn't see the feature
→ Everyone is confused
```

**The fix:** Agent must LOG IN as the user FIRST, which creates their org.

---

## 🔄 THE FOOLPROOF WORKFLOW

### Phase 1: Create Test User

```bash
# Step 1.1: Create the user
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-[TICKET-ID]@greetnow.test",
    "password": "QATest-[TICKET-ID]!",
    "full_name": "QA Test User [TICKET-ID]"
  }'

# Expected response:
# {"success": true, "user_id": "...", "message": "User created"}
# OR
# {"success": true, "message": "User already exists"}
```

---

### Phase 2: LOG IN AS THE USER (CRITICAL!)

**You MUST log in via Playwright to trigger org creation.**

```bash
# Step 2.1: Navigate to login page
mcp__playwright__browser_navigate(url="http://localhost:3000/login")

# Step 2.2: Fill login form
mcp__playwright__browser_type(
  element="Email input",
  ref="input[name='email']", 
  text="qa-[TICKET-ID]@greetnow.test"
)
mcp__playwright__browser_type(
  element="Password input",
  ref="input[name='password']",
  text="QATest-[TICKET-ID]!"
)

# Step 2.3: Submit
mcp__playwright__browser_click(
  element="Sign in button",
  ref="button[type='submit']"
)

# Step 2.4: WAIT for dashboard to load (this triggers org creation!)
mcp__playwright__browser_wait_for(text="Dashboard")

# Step 2.5: Take a screenshot proving you're logged in
mcp__playwright__browser_take_screenshot(
  filename="qa-[TICKET-ID]-01-logged-in.png"
)
```

**Why this is critical:** Supabase creates the user in `auth.users`, but the app creates the organization record in `organizations` table when the user FIRST accesses the dashboard. Without this step, `set-org-status` has no org to update!

---

### Phase 3: VERIFY Org Was Created

```bash
# Step 3.1: Check that the org exists now
curl -s "http://localhost:3456/api/v2/qa/org-by-email/qa-[TICKET-ID]@greetnow.test"

# Expected response (VERIFY THIS BEFORE PROCEEDING):
# {
#   "user_id": "...",
#   "email": "qa-[TICKET-ID]@greetnow.test",
#   "organization": {
#     "id": "...",
#     "name": "...",
#     "subscription_status": "active"  <-- This should exist!
#   }
# }

# ❌ If you get {"error": "User not found..."} → Go back to Phase 2!
```

---

### Phase 4: Set Up Required Database State

```bash
# Step 4.1: Set org status (now it will work!)
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "qa-[TICKET-ID]@greetnow.test",
    "subscription_status": "past_due"
  }'

# Expected response:
# {
#   "success": true,
#   "organization_id": "...",
#   "subscription_status": "past_due"
# }

# ❌ If error → Go back to Phase 2 and Phase 3!
```

---

### Phase 5: TEST THE FEATURE (You Do The QA!)

**This is the most important step. YOU are the QA team.**

```bash
# Step 5.1: Refresh the page or navigate to where the feature should appear
mcp__playwright__browser_navigate(url="http://localhost:3000/dashboard")

# Step 5.2: WAIT for the feature to appear
# For PaymentBlocker example:
mcp__playwright__browser_wait_for(text="Update Payment Method")

# Step 5.3: Take screenshot PROVING the feature works
mcp__playwright__browser_take_screenshot(
  filename="qa-[TICKET-ID]-02-feature-visible.png",
  fullPage=true
)

# Step 5.4: Test all acceptance criteria
# - Does modal appear? ✓
# - Is it full-screen? ✓
# - Can it be dismissed? (click outside, try to navigate) ✓
# - Admin view correct? ✓
# - Agent view correct? (create agent user if needed) ✓
```

**You MUST see the feature working with your own eyes (via Playwright).**

---

### Phase 6: Generate Magic Link

```bash
# Step 6.1: Generate magic link for the SAME user you tested with
MAGIC_RESPONSE=$(curl -s -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "[TICKET-ID]",
    "user_email": "qa-[TICKET-ID]@greetnow.test",
    "user_password": "QATest-[TICKET-ID]!",
    "redirect_path": "/dashboard"
  }')

MAGIC_URL=$(echo $MAGIC_RESPONSE | jq -r '.magic_url')
echo "Magic URL: $MAGIC_URL"

# Step 6.2: VERIFY the magic link works (optional but recommended)
# Open the magic link in a new browser window and confirm feature appears
```

---

### Phase 7: Create Inbox Item

```bash
# Step 7.1: Save screenshots to inbox folder
mkdir -p docs/agent-output/inbox/screenshots
cp qa-[TICKET-ID]-*.png docs/agent-output/inbox/screenshots/

# Step 7.2: Write inbox JSON file
cat > docs/agent-output/inbox/[TICKET-ID].json << 'EOF'
{
  "ticket_id": "[TICKET-ID]",
  "title": "[Ticket Title]",
  "type": "ui_review",
  "status": "pending",
  "created_at": "[ISO timestamp]",
  "message": "QA verified - feature working. PM please confirm UI.",
  "branch": "agent/[ticket-id]",
  "qa_report": "docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED.md",
  "screenshots": [
    {
      "name": "Logged in as test user",
      "path": "/docs/agent-output/inbox/screenshots/qa-[TICKET-ID]-01-logged-in.png"
    },
    {
      "name": "Feature visible and working",
      "path": "/docs/agent-output/inbox/screenshots/qa-[TICKET-ID]-02-feature-visible.png"
    }
  ],
  "magic_url": "[MAGIC_URL from step 6]",
  "test_credentials": {
    "email": "qa-[TICKET-ID]@greetnow.test",
    "password": "QATest-[TICKET-ID]!"
  },
  "test_setup": "Org is set to past_due status. Feature should appear immediately.",
  "acceptance_criteria": [
    "[AC1]",
    "[AC2]",
    "[AC3]"
  ]
}
EOF
```

---

### Phase 8: Final Verification

**Before marking complete, verify:**

```bash
# Step 8.1: Verify inbox item exists and has magic_url
cat docs/agent-output/inbox/[TICKET-ID].json | jq '.magic_url'
# Should print the full magic URL

# Step 8.2: Verify screenshots exist
ls -la docs/agent-output/inbox/screenshots/qa-[TICKET-ID]-*
# Should show your screenshot files

# Step 8.3: Verify QA report exists
ls -la docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED*.md
# Should show your report

# Step 8.4: Update ticket status
curl -X PUT http://localhost:3456/api/v2/tickets/[TICKET-ID] \
  -H "Content-Type: application/json" \
  -d '{"status": "qa_approved"}'
```

---

## ✅ COMPLETION CHECKLIST

Before you end your session, verify ALL of these:

- [ ] I logged in as the test user via Playwright
- [ ] I verified the org was created (API returned organization data)
- [ ] I set the required database state (e.g., past_due)
- [ ] I SAW the feature working in the browser
- [ ] I took screenshots proving the feature works
- [ ] I generated a magic link for the SAME user I tested with
- [ ] The magic link URL is in the inbox JSON file
- [ ] The screenshots are saved in inbox/screenshots/
- [ ] I wrote a QA PASS report

**If ANY checkbox is unchecked, DO NOT mark the session complete!**

---

## 🚨 COMMON MISTAKES (DON'T DO THESE)

| Mistake | Why It Fails | Fix |
|---------|--------------|-----|
| Skip login step | No org created | Always log in via Playwright first |
| Create new user in step 6 | Different user has no org setup | Use SAME user throughout |
| Set status before login | No org to update | Login FIRST, then set status |
| Don't verify org exists | Status update silently fails | Always check org-by-email API |
| Only inspect code | Don't know if feature actually works | Must SEE it in browser |
| No screenshots | No proof of testing | Take screenshots at every step |

---

## 📋 QUICK REFERENCE

```bash
# 1. Create user
curl -X POST http://localhost:3456/api/v2/qa/create-test-user -H "Content-Type: application/json" -d '{"email":"qa-TKT-XXX@greetnow.test","password":"QATest-TKT-XXX!","full_name":"QA Test"}'

# 2. LOGIN VIA PLAYWRIGHT (triggers org creation)
# Use mcp__playwright__browser_* tools to log in!

# 3. Verify org exists
curl -s "http://localhost:3456/api/v2/qa/org-by-email/qa-TKT-XXX@greetnow.test"

# 4. Set org status
curl -X POST http://localhost:3456/api/v2/qa/set-org-status -H "Content-Type: application/json" -d '{"user_email":"qa-TKT-XXX@greetnow.test","subscription_status":"past_due"}'

# 5. TEST THE FEATURE via Playwright, take screenshots

# 6. Generate magic link
curl -s -X POST http://localhost:3456/api/v2/review-tokens -H "Content-Type: application/json" -d '{"ticket_id":"TKT-XXX","user_email":"qa-TKT-XXX@greetnow.test","user_password":"QATest-TKT-XXX!","redirect_path":"/dashboard"}'

# 7. Create inbox item with magic_url and screenshots
```

---

## Why This Workflow Matters

The QA agent is **replacing a human QA team**. A human QA tester would:

1. Create a test account
2. **Log in and use the app**
3. Set up the test scenario
4. **See the feature working**
5. Take screenshots
6. Write up findings
7. Hand off to PM with "here's how to see what I saw"

The magic link is your way of saying: **"I verified this works. Click here to see exactly what I saw."**

If you skip steps 2 and 4, you're not doing QA - you're just generating paperwork.
