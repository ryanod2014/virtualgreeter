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
| "User already exists" (and continuing with that user) | NEVER reuse existing users. Create NEW ones with timestamps. |
| "QA tooling cannot create agent users" | YES IT CAN. Use `role: "agent"` and `org_id` with NEW unique emails. |

**If you catch yourself writing any of these → STOP → Go back and actually test it.**

### ⚠️ CRITICAL: Always Create FRESH Test Users

**NEVER reuse existing test users.** Always generate unique emails with timestamps:

```bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
EMAIL="qa-admin-[TICKET-ID]-$TIMESTAMP@greetnow.test"
```

**Why?**
- Existing users keep their old role/org - `role` and `org_id` params are IGNORED for existing users
- Previous QA runs may have left users in incorrect states
- Clean slate = reliable tests

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

### Step 2.0: Start the Dev Server (IMPORTANT!)

**CRITICAL RULES:**
1. **DO NOT use `pnpm dev` from the repo root** - Turbo concurrent startup often fails silently
2. **DO NOT use sudo for anything** - All commands should work without elevated privileges
3. **DO NOT use `lsof` with sudo** - Use `lsof -ti :$PORT` (no sudo needed)
4. **USE YOUR ASSIGNED PORT** - Check $AGENT_PORT environment variable (or the port shown in your session info)

**Why unique ports?** Multiple QA agents may run in parallel. Each gets its own port to avoid conflicts.

Instead, start the dashboard directly on YOUR assigned port:

```bash
# Your port is in the AGENT_PORT environment variable
# If not set, it was shown in your session info (e.g., "YOUR DASHBOARD PORT: 3105")
echo "My port: $AGENT_PORT"

# Kill any existing processes on YOUR port
lsof -ti :$AGENT_PORT | xargs kill -9 2>/dev/null || true

# Start dashboard on YOUR port (NOT from repo root)
cd apps/dashboard
PORT=$AGENT_PORT pnpm dev &
sleep 10

# Verify it's running on YOUR port
curl -s http://localhost:$AGENT_PORT | head -1
# Should return HTML, not an error
```

**If the dashboard doesn't start:**
1. Check for port conflicts: `lsof -i :$AGENT_PORT`
2. Verify `.env.local` exists and has `NEXT_PUBLIC_SUPABASE_URL`
3. Try: `cd apps/dashboard && pnpm install && PORT=$AGENT_PORT pnpm dev`

**⚠️ IMPORTANT:** All browser testing must use `http://localhost:$AGENT_PORT`, NOT port 3000!

### Step 2.0b: Verify Playwright MCP (CRITICAL for browser testing!)

Before attempting any browser operations, verify Playwright MCP is working:

```bash
# Check MCP status
claude mcp list | grep playwright
# Should show: playwright: ... - ✓ Connected
```

**If Playwright returns "Not connected" errors:**

1. **Wait and retry** - MCP may take a few seconds to connect:
   ```bash
   sleep 5
   # Then retry your browser command
   ```

2. **Check browsers are installed:**
   ```bash
   ls ~/.cache/ms-playwright/
   # Should show chromium-XXXX directories
   
   # If empty, install browsers:
   npx playwright install chromium
   ```

3. **Restart MCP:**
   ```bash
   # List current MCPs
   claude mcp list
   
   # If playwright shows disconnected, the agent should retry
   # The MCP will auto-reconnect on next browser command
   ```

4. **Last resort - skip browser testing:**
   - Document that Playwright MCP is not working
   - Create blocker file with `blocker_type: "infrastructure"`
   - Include magic links so PM can test manually

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

**⚠️ ALWAYS use UNIQUE emails with timestamps!** Never reuse existing test users.

```bash
# Generate unique timestamp for this QA run
TIMESTAMP=$(date +%Y%m%d%H%M%S)

# For ADMIN user:
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-admin-[TICKET-ID]-'$TIMESTAMP'@greetnow.test",
    "password": "QATest-[TICKET-ID]!",
    "full_name": "QA Admin [TICKET-ID]"
  }'

# For AGENT user (create in SAME org as admin):
# First, get the org_id from the admin user, then create agent WITH role and org_id
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-agent-[TICKET-ID]-'$TIMESTAMP'@greetnow.test",
    "password": "QATest-[TICKET-ID]!",
    "full_name": "QA Agent [TICKET-ID]",
    "role": "agent",
    "org_id": "[ORG_ID from admin]"
  }'
```

**Why unique emails?**
- Reusing existing users inherits their old role/org - the `role` and `org_id` params are IGNORED
- Each QA run should be a clean slate
- Timestamps ensure uniqueness across multiple QA attempts

### Step 2.2: Log In via Playwright (CRITICAL!)

**This step creates the organization. DO NOT SKIP.**

**⚠️ Use YOUR assigned port ($AGENT_PORT), not 3000!**

```
Use Playwright MCP to:
1. Navigate to http://localhost:$AGENT_PORT/login  (use YOUR port!)
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

**🌐 Use TUNNEL_URL for magic links so PM can access from anywhere!**

The tunnel URL is provided in your session info (e.g., `https://random-words.trycloudflare.com`).
This allows the PM to click magic links without needing to run a local server.

```bash
# Check your tunnel URL (set by the launch script)
echo "Tunnel URL: $TUNNEL_URL"

# Generate magic link with the tunnel URL
MAGIC_RESPONSE=$(curl -s -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d "{
    \"ticket_id\": \"[TICKET-ID]\",
    \"user_email\": \"qa-[role]-[TICKET-ID]@greetnow.test\",
    \"user_password\": \"QATest-[TICKET-ID]!\",
    \"redirect_path\": \"/dashboard\",
    \"preview_base_url\": \"$TUNNEL_URL\"
  }")

echo "Magic URL for [ROLE]: $(echo $MAGIC_RESPONSE | jq -r '.magic_url')"

# The magic link will look like: https://random-words.trycloudflare.com/api/review-login?token=...
# PM can click this from ANYWHERE - no local setup needed!
```

**If TUNNEL_URL is not set (fallback):**
```bash
# Use localhost with your assigned port
MAGIC_RESPONSE=$(curl -s -X POST http://localhost:3456/api/v2/review-tokens \
  -H "Content-Type: application/json" \
  -d "{
    \"ticket_id\": \"[TICKET-ID]\",
    \"user_email\": \"qa-[role]-[TICKET-ID]@greetnow.test\",
    \"user_password\": \"QATest-[TICKET-ID]!\",
    \"redirect_path\": \"/dashboard\",
    \"preview_base_url\": \"http://localhost:$AGENT_PORT\"
  }")

# Note: PM will need to start dashboard on port $AGENT_PORT to use this link
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
| Admin | $TUNNEL_URL/api/review-login?token=abc... | Modal with "Update Payment Method" button |
| Agent | $TUNNEL_URL/api/review-login?token=xyz... | Modal with "Contact your admin" message |

**🌐 Tunnel URL:** PM can click these links from anywhere - no local setup required!  
(If tunnel unavailable, links use `localhost:$AGENT_PORT` and PM needs to run dashboard on that port.)

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
      "url": "$TUNNEL_URL/api/review-login?token=abc...",
      "what_pm_sees": "Modal with Update Payment Method button"
    },
    {
      "role": "agent",
      "url": "$TUNNEL_URL/api/review-login?token=xyz...",
      "what_pm_sees": "Modal with Contact Admin message"
    }
  ],
  "tunnel_url": "$TUNNEL_URL",
  "preview_port": "$AGENT_PORT",
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

### ⛔ BLOCKED: When Tooling Prevents Testing (CRITICAL!)

**If you CANNOT create the required test scenario, you MUST mark it as BLOCKED.**

This is NOT a failure on your part - it's a tooling gap that needs to be fixed.

#### When to Mark as BLOCKED (not PASSED):

| Situation | ❌ WRONG Response | ✅ CORRECT Response |
|-----------|-------------------|---------------------|
| Can't create agent user | "PASSED (code verified)" | "BLOCKED - tooling gap" |
| Can't set required DB state | "PASSED (logic verified)" | "BLOCKED - missing API" |
| Playwright MCP not working | "PASSED (manual inspection)" | "BLOCKED - infrastructure" |
| Can't test mobile viewport | "PASSED (CSS looks correct)" | "BLOCKED - tooling gap" |

#### Step-by-Step: How to Create a Blocker

**1. Identify the gap:**
```markdown
I need to test AC3 (agent view) but:
- create-test-user API doesn't support `role` or `org_id` parameters
- Every user I create becomes an org owner (admin)
- I cannot create a true "agent" user to test the agent view
```

**2. Create blocker file:** `docs/agent-output/blocked/QA-[TICKET-ID]-TOOLING-[timestamp].json`

```json
{
  "ticket_id": "[TICKET-ID]",
  "blocker_type": "missing_tooling",
  "created_at": "[ISO timestamp]",
  "agent_type": "qa",
  "summary": "Cannot test AC3 (agent view) - API doesn't support creating agent-role users",
  "blocked_criteria": ["AC3"],
  "passed_criteria": ["AC1", "AC2", "AC4"],
  "tooling_gap": {
    "current_behavior": "create-test-user only accepts email/password/full_name - all users become org owners",
    "needed_behavior": "create-test-user should accept role and org_id to create users with specific roles in existing orgs",
    "endpoint": "/api/v2/qa/create-test-user",
    "file": "docs/pm-dashboard-ui/server.js"
  },
  "suggested_fix": {
    "title": "Add role/org_id support to create-test-user endpoint",
    "description": "Extend the QA helper endpoint to accept optional role ('owner'|'admin'|'agent') and org_id parameters. When org_id is provided, add user to existing org with specified role instead of creating new org.",
    "acceptance_criteria": [
      "create-test-user accepts optional 'role' parameter",
      "create-test-user accepts optional 'org_id' parameter", 
      "When org_id provided, user is added to existing org (not new org)",
      "When role='agent', user gets agent role and agent_profile is created"
    ]
  },
  "dispatch_action": "create_tooling_ticket",
  "partial_test_results": {
    "tested_in_browser": ["AC1", "AC2", "AC4"],
    "could_not_test": ["AC3"],
    "screenshots": ["admin-view.png"],
    "magic_links": [
      {"role": "admin", "url": "...", "note": "Admin view tested and working"}
    ]
  },
  "requeue_when": "Tooling ticket merged - then re-run QA with new endpoint"
}
```

**3. Create partial inbox item (for PM visibility):**

Even if blocked, create an inbox item showing what WAS tested:

```json
{
  "ticket_id": "[TICKET-ID]",
  "type": "ui_review",
  "status": "blocked",
  "message": "QA partially complete - blocked on AC3 (agent view) due to tooling gap",
  "blocked_criteria": ["AC3 - Cannot create agent-role user"],
  "passed_criteria": ["AC1", "AC2", "AC4"],
  "blocker_file": "docs/agent-output/blocked/QA-[TICKET-ID]-TOOLING-[timestamp].json",
  "magic_links": [
    {"role": "admin", "url": "...", "what_pm_sees": "Admin view (tested)"}
  ],
  "pm_note": "Admin functionality verified. Agent view blocked pending tooling fix. Dispatch will create continuation ticket."
}
```

**4. DO NOT:**
- ❌ Mark blocked criteria as "PASSED (code verified)"
- ❌ Claim you tested something you didn't see in browser
- ❌ Skip creating the blocker file
- ❌ Submit as fully passed when partially blocked

#### Blocker Types for QA Agents

| `blocker_type` | When to Use | Dispatch Action |
|----------------|-------------|-----------------|
| `missing_tooling` | API/endpoint doesn't exist or lacks features | Auto-create tooling ticket |
| `infrastructure` | Playwright MCP down, build won't start | Route to inbox (human) |
| `environment` | Missing env vars, DB not accessible | Route to inbox (human) |
| `clarification` | AC is ambiguous, need PM input | Route to inbox (human) |

#### What Happens After You Create a Blocker

1. **Dispatch Agent** reads `docs/agent-output/blocked/`
2. **For `missing_tooling`:** Auto-creates a ticket to fix the tooling
3. **Dev Agent** implements the tooling fix
4. **When tooling merged:** Dispatch re-queues original ticket for QA
5. **You (or another QA agent)** re-run with proper tooling

**This is the self-fixing loop. Your job is to identify gaps accurately, not work around them.**

---

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

Inbox JSON with BOTH magic links (use TUNNEL_URL for remote access):
```json
{
  "magic_links": [
    {"role": "admin", "url": "$TUNNEL_URL/api/review-login?token=abc", "what_pm_sees": "Update Payment button"},
    {"role": "agent", "url": "$TUNNEL_URL/api/review-login?token=xyz", "what_pm_sees": "Contact Admin message"}
  ],
  "tunnel_url": "$TUNNEL_URL",
  "preview_port": "$AGENT_PORT"
}
```
🌐 PM can click these links from anywhere - tunnel provides public access to your local server!

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
