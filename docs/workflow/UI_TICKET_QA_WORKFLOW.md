# UI Ticket QA Workflow - COMPREHENSIVE TESTING GUIDE

> **Purpose:** QA agents testing UI tickets MUST follow this workflow exactly. No shortcuts.
>
> **You are replacing a HUMAN QA TEAM.** A human would:
> 1. **PLAN** what to test before testing
> 2. **TEST** every scenario themselves in the browser
> 3. **DOCUMENT** evidence for each test
> 4. **VERIFY** their own work before submitting

---

## ⛔ UNACCEPTABLE SHORTCUTS (READ THIS FIRST)

These phrases in your report = **AUTOMATIC REJECTION**:

| ❌ If You Write This... | ❌ Why It's Wrong |
|------------------------|-------------------|
| "Verified via code inspection" | Code inspection is DEV's job. QA tests in browser. |
| "Code correctly implements..." | You're describing code, not testing behavior. |
| "The test user is an admin, but agent logic is correct" | You didn't test agent. Create an agent user. |
| "Verified via code" for any UI element | You must SEE it, not read about it. |
| "N/A - only one role needed" without justification | You decided, not the AC. Check the AC. |

**If you catch yourself writing any of these → STOP → Go back and actually test it.**

---

## 📋 PHASE 1: MANDATORY PLANNING (Do This FIRST)

**You MUST create a test plan BEFORE executing any tests.**

### Step 1.1: Analyze the Acceptance Criteria

Read the ticket's acceptance criteria and answer:

```markdown
## My Test Plan for [TICKET-ID]

### 1. ROLES TO TEST
Scan the AC for these keywords: "admin", "agent", "user", "role", "permission", "different"

| Role Mentioned in AC | Needs Separate User? | Needs Separate Magic Link? |
|---------------------|---------------------|---------------------------|
| Admin               | ☐ Yes / ☐ No        | ☐ Yes / ☐ No              |
| Agent               | ☐ Yes / ☐ No        | ☐ Yes / ☐ No              |
| [Other role]        | ☐ Yes / ☐ No        | ☐ Yes / ☐ No              |

**Decision:** I need to create ___ separate users and ___ magic links.

### 2. STATES TO TEST
Scan the AC for these keywords: "when", "if", "status", "state", "condition"

| State/Condition in AC | How to Set Up | How to Verify |
|----------------------|---------------|---------------|
| past_due             | set-org-status API | Modal appears |
| active               | set-org-status API | Modal disappears |
| [Other state]        | [method]       | [verification] |

### 3. EDGE CASES TO TEST
List at least 5 edge cases for this specific feature:

1. [Edge case] → Expected: [behavior]
2. [Edge case] → Expected: [behavior]
3. [Edge case] → Expected: [behavior]
4. [Edge case] → Expected: [behavior]
5. [Edge case] → Expected: [behavior]

### 4. ARTIFACTS I WILL PRODUCE
For each role/state combination:

| Role | State | Screenshot Path | Magic Link | 
|------|-------|-----------------|------------|
| Admin | past_due | screenshots/admin-past-due.png | [will generate] |
| Agent | past_due | screenshots/agent-past-due.png | [will generate] |

```

### Step 1.2: Verify Your Plan Covers All AC

For EACH acceptance criterion, you must have:
- A specific test method
- Expected evidence (screenshot/response)
- A fallback if primary method fails

**DO NOT proceed to Phase 2 until your plan is complete.**

---

## 🔄 PHASE 2: EXECUTE TESTS (One at a Time)

Execute your test plan **systematically, one test at a time**.

### The Testing Loop (Repeat for EACH Role/State)

```
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH role in my test plan:                              │
│                                                              │
│    1. CREATE user for this role                              │
│    2. LOG IN as this user (creates org)                      │
│    3. VERIFY org exists                                       │
│    4. SET required state                                      │
│    5. TEST the feature in browser                             │
│    6. TAKE screenshot proving it works                        │
│    7. GENERATE magic link for this user                       │
│    8. RECORD in my artifact table                             │
│                                                              │
│  DO NOT proceed to next role until current role is complete  │
└─────────────────────────────────────────────────────────────┘
```

### Step 2.1: Create User (for current role)

```bash
# For ADMIN user:
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-admin-[TICKET-ID]@greetnow.test",
    "password": "QATest-[TICKET-ID]!",
    "full_name": "QA Admin [TICKET-ID]"
  }'

# For AGENT user (create in SAME org as admin):
# First, get the org_id from the admin user, then invite agent
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-agent-[TICKET-ID]@greetnow.test",
    "password": "QATest-[TICKET-ID]!",
    "full_name": "QA Agent [TICKET-ID]",
    "role": "agent",
    "org_id": "[ORG_ID from admin]"
  }'
```

### Step 2.2: Log In via Playwright (CRITICAL!)

**This step creates the organization. DO NOT SKIP.**

```
Use Playwright MCP to:
1. Navigate to http://localhost:3000/login
2. Fill email field with user's email
3. Fill password field with user's password
4. Click sign in button
5. WAIT for dashboard to load (this creates the org!)
6. Take screenshot: "qa-[role]-[TICKET-ID]-01-logged-in.png"
```

### Step 2.3: Verify Org Exists

```bash
curl -s "http://localhost:3456/api/v2/qa/org-by-email/qa-[role]-[TICKET-ID]@greetnow.test"

# MUST see: {"organization": {"id": "...", ...}}
# If you see "error" → Go back to Step 2.2!
```

### Step 2.4: Set Database State

```bash
curl -X POST http://localhost:3456/api/v2/qa/set-org-status \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "qa-[role]-[TICKET-ID]@greetnow.test",
    "subscription_status": "past_due"
  }'

# Verify response shows "success": true
```

### Step 2.5: Test the Feature (SEE IT YOURSELF)

```
Via Playwright MCP:
1. Refresh the page or navigate to the affected route
2. WAIT for the feature to appear
3. Verify each acceptance criterion FOR THIS ROLE
4. Take screenshot PROVING the feature works as expected for this role
```

### Step 2.6: Take Screenshot Evidence

```bash
# Save to organized location
mkdir -p docs/agent-output/qa-results/screenshots/[TICKET-ID]

# Screenshot naming convention:
# [role]-[state]-[description].png
# Example: admin-past-due-modal-visible.png
# Example: agent-past-due-contact-message.png
```

### Step 2.7: Generate Magic Link (for THIS role)

```bash
MAGIC_RESPONSE=$(curl -s -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_id": "[TICKET-ID]",
    "user_email": "qa-[role]-[TICKET-ID]@greetnow.test",
    "user_password": "QATest-[TICKET-ID]!",
    "redirect_path": "/dashboard"
  }')

echo "Magic URL for [ROLE]: $(echo $MAGIC_RESPONSE | jq -r '.magic_url')"

# SAVE THIS! You need it for the inbox item.
```

### Step 2.8: Update Your Artifact Table

After each role is complete, update your tracking:

```markdown
| Role | User Email | Org Status | Screenshot | Magic Link | ✓ |
|------|-----------|------------|------------|------------|---|
| Admin | qa-admin-TKT-005b@greetnow.test | past_due | admin-modal.png | http://...token=abc | ✓ |
| Agent | qa-agent-TKT-005b@greetnow.test | past_due | agent-modal.png | http://...token=xyz | ✓ |
```

---

## 📝 PHASE 3: CREATE DELIVERABLES

### Step 3.1: Write QA Report

```markdown
# QA Report: [TICKET-ID] - PASSED ✅

## Test Plan Summary
- Roles tested: Admin, Agent
- States tested: past_due, active
- Edge cases tested: 5

## Acceptance Criteria Verification

| AC | Description | Admin Result | Agent Result | Evidence |
|----|-------------|--------------|--------------|----------|
| AC1 | Modal appears when past_due | ✅ PASS | ✅ PASS | admin-modal.png, agent-modal.png |
| AC2 | Admin sees Update Payment button | ✅ PASS | N/A | admin-modal.png |
| AC3 | Agent sees contact admin message | N/A | ✅ PASS | agent-modal.png |
| AC4 | Modal cannot be dismissed | ✅ PASS | ✅ PASS | Tested ESC, backdrop click |

## Magic Links for PM Review

| Role | Magic Link | What PM Will See |
|------|-----------|------------------|
| Admin | http://localhost:3000/api/review-login?token=abc... | Modal with "Update Payment Method" button |
| Agent | http://localhost:3000/api/review-login?token=xyz... | Modal with "Contact your admin" message |

## Screenshots
[List all screenshots with descriptions]
```

### Step 3.2: Create Inbox Item (WITH ALL MAGIC LINKS)

```json
{
  "ticket_id": "[TICKET-ID]",
  "title": "[Ticket Title]",
  "type": "ui_review",
  "status": "pending",
  "created_at": "[ISO timestamp]",
  "message": "QA verified all roles. PM please confirm UI for each role.",
  "branch": "[branch]",
  "qa_report": "docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED-[timestamp].md",
  "screenshots": [
    {"name": "Admin View", "path": "docs/agent-output/qa-results/screenshots/[TICKET-ID]/admin-modal.png"},
    {"name": "Agent View", "path": "docs/agent-output/qa-results/screenshots/[TICKET-ID]/agent-modal.png"}
  ],
  "magic_links": [
    {
      "role": "admin",
      "url": "http://localhost:3000/api/review-login?token=abc...",
      "what_pm_sees": "Modal with Update Payment Method button"
    },
    {
      "role": "agent",
      "url": "http://localhost:3000/api/review-login?token=xyz...",
      "what_pm_sees": "Modal with Contact Admin message"
    }
  ],
  "test_setup": "Both users' orgs set to past_due.",
  "acceptance_criteria": ["AC1", "AC2", "AC3", "AC4"]
}
```

---

## ✅ PHASE 4: MANDATORY SELF-AUDIT

**Before marking the ticket as passed, complete this checklist HONESTLY.**

### Artifact Verification

Count your artifacts and compare to requirements:

```markdown
## Self-Audit Checklist

### Role Coverage
1. How many distinct roles are in the AC? _____
2. How many users did I create? _____
3. How many browser sessions did I perform? _____
4. How many magic links am I providing? _____
5. How many role-specific screenshots do I have? _____

VALIDATION: #1 should equal #2, #3, #4, and #5
If any number is LESS than #1, I took a shortcut. GO BACK.

### Common Failure Check
- [ ] I did NOT say "verified via code inspection" for any UI element
- [ ] I did NOT test only one role and infer the other works
- [ ] I did NOT skip browser testing for any role
- [ ] I have a separate magic link for EACH role
- [ ] Each magic link points to a user I actually logged in as
- [ ] Each screenshot shows the actual browser, not code

### Final Verification
- [ ] Every AC has browser-tested evidence (not just code inspection)
- [ ] Every role mentioned in AC has its own user, screenshot, and magic link
- [ ] Inbox JSON contains ALL magic links (not just one)
- [ ] QA report documents what I SAW, not what I READ in code
```

---

## 🚨 SPECIAL CASES

### If AC Doesn't Mention Multiple Roles

Even if AC doesn't explicitly say "admin and agent", check if the feature BEHAVES differently for different roles:

```markdown
Questions to ask:
1. Does this feature check `isAdmin`? → Test both roles
2. Does this feature check user permissions? → Test both roles
3. Does this feature show different UI based on role? → Test both roles
4. Does this feature restrict actions by role? → Test both roles

If ANY answer is "yes" → Create users for each role and test separately
```

### If Browser Testing is Blocked

If you genuinely cannot run browser tests (e.g., build won't start at all):

1. **Verify the block is real:** Try `pnpm dev` anyway - it often works even with typecheck errors
2. **Document WHY:** "Browser testing blocked because [specific error]"
3. **Do NOT pass UI tickets without browser testing** - Mark as blocked instead
4. **Exception:** If the SAME error exists on main branch (pre-existing), proceed with caution but still attempt browser testing

### If You Need to Test Multiple States

For each state (e.g., `past_due`, `active`, `trialing`):

```
┌─────────────────────────────────────────────────────────────┐
│  FOR EACH state in my test plan:                            │
│                                                              │
│    1. Set the state via API                                  │
│    2. Refresh the browser                                    │
│    3. Verify the UI matches expected behavior                │
│    4. Take screenshot for this state                         │
│    5. (Optional) Generate magic link if PM needs to see it   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 EXAMPLE: TKT-005b PaymentBlocker (Complete Flow)

### Phase 1: My Test Plan

```markdown
## Test Plan for TKT-005b

### 1. ROLES TO TEST
AC2 mentions "Admins see..." 
AC3 mentions "Agents see..."
→ TWO roles required: Admin AND Agent

| Role | Needs Separate User? | Needs Separate Magic Link? |
|------|---------------------|---------------------------|
| Admin | ✅ Yes | ✅ Yes |
| Agent | ✅ Yes | ✅ Yes |

**Decision:** I need 2 users and 2 magic links.

### 2. STATES TO TEST
AC1 mentions "when org status is 'past_due'"
→ Need to test: past_due (modal appears), active (modal hidden)

### 3. EDGE CASES
1. ESC key → Modal should NOT close
2. Click backdrop → Modal should NOT close
3. Navigate to different route → Modal should persist
4. Refresh page → Modal should reappear
5. Status changes to active → Modal should disappear
```

### Phase 2: Execution

```bash
# ADMIN USER
curl -X POST http://localhost:3456/api/v2/qa/create-test-user -d '{"email":"qa-admin-TKT-005b@greetnow.test"...}'
# → Log in via Playwright
# → Verify org
# → Set to past_due
# → Take screenshot of admin modal
# → Generate admin magic link

# AGENT USER  
curl -X POST http://localhost:3456/api/v2/qa/create-test-user -d '{"email":"qa-agent-TKT-005b@greetnow.test"...}'
# → Log in via Playwright
# → Verify org (should be same org, or set status separately)
# → Set to past_due
# → Take screenshot of agent modal
# → Generate agent magic link
```

### Phase 3: Deliverables

Inbox JSON with BOTH magic links:
```json
{
  "magic_links": [
    {"role": "admin", "url": "http://...token=abc", "what_pm_sees": "Update Payment button"},
    {"role": "agent", "url": "http://...token=xyz", "what_pm_sees": "Contact Admin message"}
  ]
}
```

### Phase 4: Self-Audit

```
Roles in AC: 2 (admin, agent)
Users created: 2 ✓
Browser sessions: 2 ✓
Magic links: 2 ✓
Screenshots: 2 ✓

All numbers match → PASS
```

---

## Summary: The Foolproof Process

```
1. PLAN FIRST
   - Count roles in AC
   - Count states to test
   - List edge cases
   - Create artifact tracking table

2. EXECUTE SYSTEMATICALLY
   - One role at a time
   - One state at a time
   - Screenshot everything
   - Magic link for each role

3. VERIFY YOUR WORK
   - Count artifacts vs requirements
   - Check for shortcut phrases
   - Ensure all magic links are in inbox

4. ONLY THEN mark as PASSED
```

**If you skip any phase, your QA is incomplete and will be rejected.**
