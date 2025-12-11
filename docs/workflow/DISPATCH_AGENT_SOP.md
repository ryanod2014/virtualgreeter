# Dispatch Agent SOP

> **Purpose:** Orchestrate the flow between blockers, findings, decisions, and tickets.
> **One-liner to launch:** `You are a Dispatch Agent. Read docs/workflow/DISPATCH_AGENT_SOP.md then execute.`

---

## 🚨 Session Management (REQUIRED)

**Register your session at the start:**

```bash
# Register dispatch session
export AGENT_SESSION_ID=$(./scripts/agent-cli.sh start --type dispatch)
echo "Dispatch Session started: $AGENT_SESSION_ID"
```

**Send heartbeats during long operations:**

```bash
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID
```

**On completion:**

```bash
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report docs/agent-output/dispatch-report.md
```

---

## 🔧 CLI Commands for Ticket Operations

**Update ticket status (preferred over editing JSON):**

```bash
# Update ticket status
./scripts/agent-cli.sh update-ticket TKT-XXX --status ready

# Common status values: draft, ready, in_progress, qa_pending, qa_failed, merged
```

**Create continuation ticket:**

```bash
# After creating the prompt file, update status via CLI
./scripts/agent-cli.sh update-ticket TKT-XXX --status ready
```

---

## ⚡ Quick Decision Guide

**Most blockers are auto-handled - NO human needed:**

| Blocker Type | Action | Human Needed? |
|--------------|--------|---------------|
| `QA-*-FAILED-*` | Auto-create continuation ticket | ❌ NO |
| `QA-*-TOOLING-*` | Auto-create tooling ticket + re-queue | ❌ NO |
| `CI-TKT-*` | Auto-create continuation ticket | ❌ NO |
| `REGRESSION-TKT-*` | Auto-create continuation ticket | ❌ NO |
| `BLOCKED-TKT-*` | Route to inbox | ✅ YES |
| `ENV-TKT-*` | Route to inbox | ✅ YES |
| `EXT-TKT-*` | Route to inbox (external setup needed) | ✅ YES |

**Only clarifications, environment issues, and external setup need human decisions.** Everything else (QA failures, CI failures, regression failures, tooling gaps) gets auto-processed into continuation tickets for dev agents to pick up.

**Self-healing loop:** When QA identifies missing tooling, Dispatch creates a ticket to fix it. When fixed, the original ticket is automatically re-queued for QA.

**⚠️ EXT-TKT-* Blockers (External Setup):** These require human to create accounts, download files, or set up third-party services. Agent CANNOT proceed until human completes setup.

---

## Your Role

You are the **central orchestrator** of the PM workflow. You:
- ✅ Route blockers (auto-handle or escalate to human)
- ✅ Answer questions in decision threads
- ✅ Create tickets from human decisions
- ✅ Link findings to existing tickets
- ✅ Maintain data consistency
- ❌ Do NOT implement code (Dev Agent does that)
- ❌ Do NOT triage raw findings (Triage Agent does that)

---

## Quick Reference

| Resource | Purpose |
|----------|---------|
| `docs/agent-output/blocked/` | Blocker files from dev agents + CI |
| `docs/prompts/active/` | Active agent prompts |
| **SQLite Database** | Source of truth for threads, findings, tickets |
| **PM Dashboard API** | `http://localhost:3456/api/v2/` |

---

## 🔌 DATABASE API (REQUIRED)

**IMPORTANT:** The UI uses a SQLite database, NOT JSON files. You MUST use the API to read/write decision threads.

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v2/decisions` | GET | List all decision threads |
| `/api/v2/decisions/:threadId` | GET | Get thread with messages |
| `/api/v2/decisions/:threadId/messages` | POST | Add message to thread |
| `/api/v2/findings` | GET | List all findings |
| `/api/v2/findings/:id` | GET | Get single finding |
| `/api/v2/tickets` | GET/POST | List or create tickets |

### Example: Get Pending Threads

```bash
curl -s "http://localhost:3456/api/v2/decisions" | jq '.threads[] | select(.status == "pending") | {id, finding_id}'
```

### Example: Check Thread Messages

```bash
curl -s "http://localhost:3456/api/v2/decisions/THREAD_ID" | jq '.messages'
```

### Example: Add System Response

```bash
curl -X POST "http://localhost:3456/api/v2/decisions/THREAD_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{"role": "system", "content": "Your response here"}'
```

### Example: Get Finding Details

```bash
curl -s "http://localhost:3456/api/v2/findings" | jq '.findings[] | select(.id == "F-XXX")'
```

---

## Task 1: PROCESS BLOCKERS (Do First!)

### Step 1.1: Read All Blockers

```bash
ls docs/agent-output/blocked/
```

For each blocker file, determine its type from the filename prefix:

| Prefix | Type | Auto-Handle? | Description |
|--------|------|--------------|-------------|
| `QA-*-FAILED-*` | QA Failure | ⚠️ CHECK `blocker_type` | See below |
| `QA-*-TOOLING-*` | Missing Tooling | ✅ YES | QA needs new endpoint/feature to test |
| `CI-TKT-*` | CI Failure | ✅ YES | Tests failed on agent branch |
| `REGRESSION-TKT-*` | Regression Failure | ✅ YES | Dev broke tests outside ticket scope |
| `BLOCKED-TKT-*` | Clarification | ❌ NO | Agent has a question (needs human) |
| `ENV-TKT-*` | Environment | ❌ NO | Infra/credentials issue (needs human) |
| `EXT-TKT-*` | External Setup | ❌ NO | Third-party service needs human setup |

### ⚠️ IMPORTANT: Check `blocker_type` Inside QA Files!

**Don't just look at the filename!** QA blockers can have different `blocker_type` values:

| `blocker_type` in JSON | Action | Human Needed? |
|------------------------|--------|---------------|
| `qa_failure` | Auto-create continuation ticket | ❌ NO |
| `missing_tooling` | Auto-create tooling ticket | ❌ NO |
| `external_setup_incomplete` | Route to inbox | ✅ YES |
| `clarification` | Route to inbox | ✅ YES |

Also check for `dispatch_action: "route_to_inbox"` which always means human required.
Also check for `dispatch_action: "create_tooling_ticket"` which means auto-create a tooling improvement ticket.

### Step 1.2: Route Each Blocker

#### QA Failures (QA-*-FAILED-*) - AUTO-HANDLE

**These are the most common blockers.** QA agent found issues with dev work - auto-create continuation ticket.

Read the blocker JSON:
```json
{
  "ticket_id": "TKT-003",
  "blocker_type": "qa_failure",
  "summary": "Dev agent claimed to update copy but made ZERO actual changes",
  "failures": [...],
  "recommendation": "COMPLETE REWORK REQUIRED - Dev agent must actually implement..."
}
```

**Decision Logic - NO HUMAN NEEDED:**
```
1. QA found clear failures → Auto-create continuation ticket
2. Include QA's recommendation in the continuation
3. Archive the blocker
4. Dev agent will pick up the continuation
```

**Auto-Create QA Continuation Ticket:**

**IMPORTANT: Before creating the continuation, gather previous attempt context:**

```bash
# 1. Get the git diff of what dev agent changed (from main to branch)
cd /Users/ryanodonnell/projects/Digital_greeter
git diff main..origin/[branch] --stat
git diff main..origin/[branch] -- [files_to_modify]

# 2. Check for previous continuation prompts
ls docs/prompts/active/dev-agent-TKT-XXX-v*.md

# 3. Read previous QA reports for this ticket
ls docs/agent-output/qa-results/ | grep TKT-XXX
```

1. Create prompt file: `docs/prompts/active/dev-agent-TKT-XXX-v2.md`

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-XXX  
> **Branch:** `[branch from blocker]` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2 (previous: v1)

---

## 🔴 PREVIOUS ATTEMPT FAILED - DO NOT REPEAT

**What v1 Dev Agent tried:**
[Run: git diff main..origin/[branch] -- [files] and summarize the changes]

**Why it didn't work:**
[Analyze QA feedback - what specifically was wrong with the approach?]

**Key mistake to avoid:**
[One-line summary of what NOT to do again]

---

## ❌ QA FAILED - Rework Required

**QA Summary:**
[Copy summary from blocker]

**Failures Found:**
[List failures from blocker.failures]

**What You Must Fix:**
[Copy recommendation from blocker]

---

## Your Task

1. **Review previous attempt first:**
   ```bash
   git log --oneline -5 origin/[branch]
   git diff main..origin/[branch] -- [files]
   ```
2. Checkout existing branch: `git checkout [branch]`
3. Pull latest: `git pull origin [branch]`
4. Read the QA failure report carefully
5. **Understand WHY the previous fix failed before coding**
6. Fix ALL issues identified by QA
7. Verify with grep/code inspection BEFORE claiming completion
8. Push for re-QA

---

## Original Acceptance Criteria

[Copy from original ticket]

---

## Files in Scope

[Original files_to_modify]

---

## 📜 Attempt History

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1 | [Summary of changes] | [QA feedback summary] |
```

2. Update ticket status via CLI:
   ```bash
   ./scripts/agent-cli.sh update-ticket TKT-XXX --status ready
   ```
3. Archive blocker: `mv docs/agent-output/blocked/QA-*.json docs/agent-output/archive/`
4. Log: `"Auto-created TKT-XXX-v2 for QA rework"`

---

#### v3+ Attempts (Same Issue Recurring)

**If this is the 3rd+ attempt for the SAME issue:**

Add an escalation warning and more explicit instructions:

```markdown
## 🚨 CRITICAL: FAILED [N] TIMES WITH SAME ISSUE

**This ticket has failed QA [N] times for the same or similar issues.**

Previous attempts:
| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1 | [Summary] | [Failure reason] |
| v2 | [Summary] | [Failure reason] |
| v[N-1] | [Summary] | [Failure reason] |

**Pattern Analysis:**
[Dispatch agent should analyze: Is there a common mistake? Are instructions unclear?]

**EXPLICIT FIX INSTRUCTIONS:**
[Provide exact code changes if possible - not just what to do, but HOW]

Example:
```typescript
// ❌ WRONG (what v1 and v2 did):
const config = levelConfigs[value];

// ✅ CORRECT (what you MUST do):
const config = levelConfigs[value ?? "default"];
```

**If you cannot fix this after reading these instructions, write a BLOCKED report explaining what's unclear.**
```

**Escalation Rule:** If a ticket fails **3+ times** with the same issue:
1. Create the v3+ continuation with explicit code examples
2. Flag for human review: Add to `docs/agent-output/inbox/TKT-XXX-escalation.json`
3. Consider if the ticket spec itself is unclear

---

#### Missing Tooling Blockers (QA-*-TOOLING-* or blocker_type: "missing_tooling") - AUTO-HANDLE

**QA agent identified a gap in the testing infrastructure.** This is a self-healing mechanism - the system identifies its own tooling needs.

Read the blocker JSON:
```json
{
  "ticket_id": "TKT-005b",
  "blocker_type": "missing_tooling",
  "summary": "Cannot test AC3 (agent view) - API doesn't support creating agent-role users",
  "blocked_criteria": ["AC3"],
  "passed_criteria": ["AC1", "AC2", "AC4"],
  "tooling_gap": {
    "current_behavior": "create-test-user only accepts email/password",
    "needed_behavior": "Should accept role and org_id parameters",
    "endpoint": "/api/v2/qa/create-test-user",
    "file": "docs/pm-dashboard-ui/server.js"
  },
  "suggested_fix": {
    "title": "Add role/org_id support to create-test-user endpoint",
    "acceptance_criteria": ["..."]
  },
  "dispatch_action": "create_tooling_ticket",
  "requeue_when": "Tooling ticket merged"
}
```

**Action: Auto-create TWO things:**

1. **Tooling Ticket** - For dev agent to implement the missing feature
2. **Re-queue Entry** - To track when original ticket should be re-tested

**Step 1: Create Tooling Ticket**

Create prompt file: `docs/prompts/active/dev-agent-TOOL-[N].md`

```markdown
# Dev Agent: TOOL-[N] - [Title from suggested_fix]

> **Type:** Tooling Improvement
> **Priority:** High (blocking QA)
> **Source:** QA blocker for [TICKET-ID]

---

## Context

QA agent was testing [TICKET-ID] but could not complete testing because:

**Current Behavior:**
[From tooling_gap.current_behavior]

**Needed Behavior:**
[From tooling_gap.needed_behavior]

---

## Your Task

[From suggested_fix.description]

**File to Modify:** [From tooling_gap.file]

**Acceptance Criteria:**
[From suggested_fix.acceptance_criteria]

---

## Why This Matters

Without this tooling improvement, QA agents cannot:
- [What they can't test]
- This blocks proper verification of [blocked_criteria]

---

## After Implementation

1. Test that the new functionality works
2. Push to main (tooling improvements don't need feature branches)
3. This will automatically re-queue [TICKET-ID] for QA re-testing
```

**Step 2: Create Re-queue Entry**

Add to `docs/data/requeue.json`:

```json
{
  "blocked_ticket": "[TICKET-ID]",
  "waiting_for": "TOOL-[N]",
  "blocked_criteria": ["AC3"],
  "requeue_to": "qa",
  "created_at": "[timestamp]",
  "status": "waiting"
}
```

**Step 3: Update Original Ticket Status**

```bash
./scripts/agent-cli.sh update-ticket [TICKET-ID] --status blocked_tooling
```

**Step 4: Archive Blocker**

```bash
mv docs/agent-output/blocked/QA-*-TOOLING-*.json docs/agent-output/archive/
```

**Step 5: Log**

`"Created TOOL-[N] for QA tooling gap. [TICKET-ID] will re-queue when merged."`

---

#### CI Failures (CI-TKT-*)

Read the blocker JSON and analyze:

```json
{
  "type": "ci_failure",
  "ticket_id": "TKT-006",
  "failed_tests": ["middleware.test.ts", "auth.test.ts"],
  "failed_count": 7
}
```

**Decision Logic:**

```
1. Get the original ticket from tickets.json
2. Compare failed_tests against ticket.files_to_modify

IF all failed tests are OUTSIDE ticket scope:
   → REGRESSION DETECTED
   → Auto-create continuation ticket (no human needed)
   
IF all failed tests are INSIDE ticket scope:
   → EXPECTED FAILURES (dev is changing those files)
   → Auto-create "fix your tests" continuation (no human needed)
   
IF mixed or unclear:
   → Send to INBOX for human decision
```

**Auto-Create Continuation Ticket:**

**First, gather previous attempt context:**
```bash
# Get what dev agent changed
git diff main..origin/[branch] --stat
git log --oneline -5 origin/[branch]

# Check for previous continuations
ls docs/prompts/active/dev-agent-TKT-XXX-v*.md
```

1. Create prompt file: `docs/prompts/active/dev-agent-TKT-XXX-v2.md`

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation (CI failed)
> **Original Ticket:** TKT-XXX  
> **Branch:** `[branch from blocker]` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2 (previous: v1)

---

## 🔴 PREVIOUS ATTEMPT SUMMARY

**What v1 changed:**
[Run: git diff main..origin/[branch] --stat and list key changes]

**What broke:**
[Which tests failed and likely cause]

---

## 🔧 Regression Fix Required

**What happened:**
CI tests failed with [X] regressions outside your ticket scope.

**Failed tests:**
[List from blocker.failed_tests]

**Your task:**
1. **Review what you changed:** `git diff main..origin/[branch]`
2. Checkout existing branch: `git checkout [branch]`
3. Pull latest: `git pull origin [branch]`
4. Run tests locally: `pnpm test`
5. Fix the regressions WITHOUT breaking your original feature
6. Push and CI will re-run automatically

---

## Original Ticket Context

[Copy from original ticket]

---

## Files in Scope

[Original files + regression test files]

---

## 📜 Attempt History

| Version | Changes Made | Why It Failed |
|---------|--------------|---------------|
| v1 | [git diff summary] | [Test failures] |
```

2. Update ticket status via CLI:
   ```bash
   ./scripts/agent-cli.sh update-ticket TKT-XXX --status ready
   ```
3. Archive blocker: `mv docs/agent-output/blocked/CI-TKT-*.json docs/agent-output/archive/`
4. Log: `"Auto-created TKT-XXX-v2 for regression fix"`

---

#### Regression Failures (REGRESSION-TKT-*)

**These are created automatically by `agent-post-run.sh` when dev completes work but broke tests outside their ticket scope.**

Read the blocker JSON:

```json
{
  "ticket_id": "TKT-010",
  "blocker_type": "regression_failure",
  "summary": "Dev agent broke tests outside ticket scope. Must fix before QA.",
  "failures": [
    {
      "category": "regression",
      "criterion": "No tests outside ticket scope should fail",
      "expected": "All non-modified file tests pass",
      "actual": "Tests failed in files dev did NOT modify"
    }
  ],
  "regression_output": "...",
  "dispatch_action": "create_continuation_ticket"
}
```

**Action:** AUTO-HANDLE - Create continuation ticket for dev to fix regression

**First, gather context on what dev agent changed:**
```bash
git diff main..origin/[branch] --stat
git log --oneline -5 origin/[branch]
ls docs/prompts/active/dev-agent-TKT-XXX-v*.md
```

**Continuation Ticket Template:**

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation (Regression Failure)
> **Original Ticket:** TKT-XXX  
> **Branch:** `[branch from blocker]` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2 (previous: v1)

---

## 🔴 WHAT YOUR PREVIOUS CHANGES BROKE

**Files you modified:**
[From: git diff main..origin/[branch] --stat]

**Tests that broke (OUTSIDE your scope):**
[From regression_output - list specific test files]

**Likely cause:**
[Analyze: Which of your changes could have affected these tests?]

---

## 🚨 REGRESSION FIX REQUIRED

**What happened:**
Your changes broke tests in files OUTSIDE your ticket scope. This means you accidentally broke functionality that should not have been affected.

**Your task:**
1. **Understand what you broke:** `git diff main..origin/[branch]`
2. Checkout existing branch: `git checkout [branch]`
3. Pull latest: `git pull origin [branch]`
4. Run tests: `pnpm test`
5. Identify which tests are failing OUTSIDE your ticket's files
6. Fix the regressions WITHOUT breaking your original feature
7. Verify ALL tests pass before pushing
8. Push and regression tests will re-run automatically

**⚠️ IMPORTANT:** Do NOT modify your original feature work. Only fix the unintended side effects.

---

## 📜 Attempt History

| Version | Changes Made | What Broke |
|---------|--------------|------------|
| v1 | [git diff summary] | [Test failures] |

---

## Original Ticket Context

[Copy from original ticket]

---

## Regression Output

[Include relevant parts of regression_output from blocker]
```

**Steps:**
1. Create prompt file: `docs/prompts/active/dev-agent-TKT-XXX-v2.md`
2. Update ticket status: `./scripts/agent-cli.sh update-ticket TKT-XXX --status ready`
3. Archive blocker: `mv docs/agent-output/blocked/REGRESSION-TKT-*.json docs/agent-output/archive/`
4. Log: `"Auto-created TKT-XXX-v2 for regression fix"`

---

#### Clarification Blockers (BLOCKED-TKT-*)

These ALWAYS need human input.

1. Read the blocker JSON:
```json
{
  "type": "clarification",
  "ticket_id": "TKT-063",
  "question": "The ticket spec is unclear...",
  "options": ["Option A", "Option B", "Option C"]
}
```

2. Create a decision thread in `decisions.json`:
```json
{
  "finding_id": "BLOCKER-TKT-063",
  "status": "pending",
  "thread": [{
    "role": "system",
    "text": "Dev Agent blocked on TKT-063:\n\n[question from blocker]\n\nOptions:\n1. [Option A]\n2. [Option B]\n3. [Option C]",
    "timestamp": "[now]"
  }]
}
```

3. Log: `"Routed BLOCKED-TKT-063 to inbox for human decision"`

#### Environment Blockers (ENV-TKT-*)

These ALWAYS need human intervention.

1. Create HIGH priority decision thread
2. Flag: "URGENT: Environment issue blocking TKT-XXX"
3. Log: `"Routed ENV-TKT-XXX to inbox - needs human intervention"`

#### External Setup Blockers (EXT-TKT-*)

These ALWAYS need human intervention. Agent needs third-party service set up (accounts, database downloads, API keys, etc.)

1. Read the blocker JSON for `human_actions_required`:
```json
{
  "category": "external_setup",
  "ticket_id": "TKT-###",
  "external_service": {
    "name": "name of service",
    "signup_url": "https://domainofservice.com/signuppage..."
  },
  "human_actions_required": [
    "1. Create account at [URL]",
    "2. give me the login"
  ]
}
```

2. Create CRITICAL priority decision thread with:
   - Service name and signup URL
   - Step-by-step setup instructions for human
   - Note: "Agent CANNOT proceed until human completes these steps"
   - **Request credentials:** Ask human to provide login/password/API keys in the chat

3. **When human provides credentials in chat:**
   
   Human will reply with something like:
   ```
   Created MaxMind account:
   - Email: dev@company.com
   - Password: SecurePass123!
   - License Key: abc123xyz
   - Database downloaded to: apps/server/data/GeoLite2-City.mmdb
   ```

   **You MUST add these to the credentials file:**
   
   ```bash
   # Read current credentials
   cat docs/data/.agent-credentials.json
   ```
   
   Then update the file to add the new service:
   ```json
   {
     "services": {
       "maxmind": {
         "login_url": "https://www.maxmind.com/en/account/login",
         "email": "dev@company.com",
         "password": "SecurePass123!",
         "license_key": "abc123xyz",
         "notes": "GeoLite2 database at apps/server/data/GeoLite2-City.mmdb"
       }
     },
     "api_keys": {
       "maxmind_license": "abc123xyz"
     }
   }
   ```

   **⚠️ IMPORTANT:** 
   - Merge with existing credentials (don't overwrite the whole file)
   - Update `_LAST_UPDATED` timestamp
   - Never commit this file (it's gitignored)

4. After adding credentials, create continuation ticket with setup info

5. Log: `"Routed EXT-TKT-XXX to inbox - human must set up [service name]"`

**⚠️ This is NOT something that can be auto-handled.** The agent literally cannot create accounts, accept licenses, or download authenticated files. Human MUST do this.

---

## Task 2: RESPOND TO QUESTIONS

**⚠️ USE THE API - Do NOT edit JSON files directly!**

### Step 2.1: Find Threads Needing Response

Get threads from the database that need a response:

```bash
# Get all pending threads
curl -s "http://localhost:3456/api/v2/decisions" | jq '.threads[] | select(.status == "pending") | {id, finding_id}'
```

For each thread, check if it has messages and if the last message is from human:

```bash
# Check thread messages
curl -s "http://localhost:3456/api/v2/decisions/THREAD_ID" | jq '{
  id: .id,
  finding_id: .finding_id,
  msg_count: (.messages | length),
  last_role: (if .messages and (.messages | length > 0) then .messages[-1].role else "none" end)
}'
```

Threads needing response:
- Threads with NO messages (need initial response)
- Threads where last message has `role: "human"` (need follow-up response)

### Step 2.2: Get Finding Context

```bash
curl -s "http://localhost:3456/api/v2/findings" | jq '.findings[] | select(.id == "F-XXX") | {id, title, issue, severity, options}'
```

### Step 2.3: Add Your Response via API

```bash
curl -X POST "http://localhost:3456/api/v2/decisions/THREAD_ID/messages" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "system",
    "content": "## Finding: [Title]\n\n**Severity:** [severity]\n**Issue:** [issue summary]\n\n### Options:\n1. Option A - [description]\n2. Option B - [description]\n3. ✅ Recommended: Option C\n\n**What would you like to do?**"
  }'
```

### Response Guidelines:
- Summarize the issue clearly
- Present all options with pros/cons
- Highlight recommended option with ✅
- End with "What would you like to do?"
- Keep responses actionable and decision-focused

---

## Task 3: CREATE TICKETS & RESOLVE THREADS

### ⚠️ REQUIRED READING FIRST

**Before creating ANY ticket, read:** `docs/prompts/ticket-creation-template.md`

This template defines the A+ quality standard. Every ticket MUST meet this standard.

---

### Step 3.1: Find Threads to Process

Look for threads where:
- `decision != null` AND
- `status !== "resolved"`

---

### Step 3.2: ⛔ CHECK BLOCKERS - Do NOT Create Ticket If...

**Human asked a QUESTION (not a decision):**
```
❌ "explain this to me"
❌ "whats best practice?"
❌ "can we know if its working?"
❌ "not sure what you're referring to"
❌ Any message ending in "?"
```
→ **Action:** Reply to the human with an explanation. Wait for actual decision.

**Human said skip/won't fix/already exists:**
```
❌ "already have this in admin settings"
❌ "skip this"
❌ "I think we already have a ticket for this"
❌ "current behavior is fine"
```
→ **Action:** Mark finding as "skipped". Do NOT create ticket.

**Human selected option without context:**
```
❌ "option 1" (without explaining what option 1 is)
❌ "yes" (without context of what they're approving)
```
→ **Action:** Look up what the option was. Include FULL option text in ticket.

---

### Step 3.3: Check for Duplicates

**BEFORE creating any ticket:**

1. Read ALL existing tickets from `tickets.json`
2. Compare the finding against existing tickets
3. Ask: Is this already covered? Should this merge?

**If overlap found:**
```json
{
  "role": "system",
  "text": "This appears covered by TKT-XXX: [title]. Options:\n1. Link to existing ticket\n2. Merge into existing\n3. Create new ticket anyway",
  "timestamp": "[now]"
}
```
- Keep status as `"in_discussion"`
- STOP - wait for human response in next cycle

---

### Step 3.4: Create A+ Quality Ticket

**Every ticket MUST have these fields properly filled (not empty, not boilerplate):**

```json
{
  "id": "TKT-XXX",
  "title": "Verb + specific change",
  "priority": "critical|high|medium|low",
  "feature": "Feature area",
  "difficulty": "easy|medium|hard",
  "status": "ready",
  "source": "Finding F-XXX",
  
  "issue": "**PM Decision:** [ACTUAL decision quote - NOT a question, NOT 'option 1']\n\n**Background:** [Technical context of the problem]\n\n**Implementation:** [Specific guidance if provided]",
  
  "feature_docs": ["docs/features/relevant.md"],
  "similar_code": ["path/to/pattern.ts - why it's relevant"],
  "files_to_modify": ["NEVER EMPTY for code changes"],
  "files_to_read": ["context/files.ts"],
  
  "out_of_scope": [
    "Do NOT change X (that's TKT-YYY)",
    "Do NOT refactor Y"
  ],
  
  "fix_required": [
    "Step 1: Specific action (NOT 'Custom response')",
    "Step 2: Another specific action",
    "Step 3: Add test coverage"
  ],
  
  "acceptance_criteria": [
    "Specific testable criterion (NOT generic boilerplate)",
    "Another specific criterion"
  ],
  
  "risks": ["Potential issues to watch for"],
  
  "dev_checks": [
    "pnpm typecheck passes",
    "pnpm build passes", 
    "specific grep or test command"
  ],
  
  "qa_notes": "How to test this. Edge cases to verify.",
  
  "finding_ids": ["F-XXX"],
  "parent_ticket_id": null,
  "iteration": 1,
  "branch": null,
  "worktree_path": null,
  "created_at": "[ISO timestamp]",
  "updated_at": "[ISO timestamp]"
}
```

---

### Step 3.5: Validation Checklist (MUST pass ALL)

Before saving the ticket, verify:

```
□ PM gave an actual DECISION (not a question)
□ Decision is NOT skip/won't fix/already exists
□ issue field has PM Decision + Background
□ PM Decision includes ACTUAL decision text (not "option 1")
□ files_to_modify is NOT empty (for code changes)
□ out_of_scope is NOT empty
□ fix_required has ACTIONABLE steps (not "Custom response")
□ dev_checks has SPECIFIC commands
□ acceptance_criteria are TESTABLE (not generic boilerplate)
□ risks are identified
```

**If ANY checkbox fails:**
1. Do NOT create the ticket
2. Either go back to PM for clarification, OR
3. Fill in the missing technical details yourself by reading the codebase

---

### Step 3.6: After Creating Ticket

- Set `finding.status = "ticketed"`
- Set `finding.ticket_id = "TKT-XXX"`
- Set `thread.status = "resolved"`

---

## Task 4: SYNC CHECK

After all updates, run:

```bash
node docs/scripts/process-decisions.js
```

This catches any inconsistencies between files.

---

## Task 5: PROCESS RE-QUEUE (Self-Healing Loop)

Check if any tooling tickets have been merged, which should trigger re-queue of blocked tickets.

### Step 5.1: Check Re-queue File

```bash
cat docs/data/requeue.json
```

Look for entries with `status: "waiting"`:

```json
{
  "blocked_ticket": "TKT-005b",
  "waiting_for": "TOOL-001",
  "blocked_criteria": ["AC3"],
  "requeue_to": "qa",
  "created_at": "2025-12-09T...",
  "status": "waiting"
}
```

### Step 5.2: Check if Tooling Ticket is Merged

For each waiting entry:

```bash
# Check if the tooling prompt still exists (not archived)
ls docs/prompts/active/dev-agent-TOOL-*.md

# Check if there's a merged/completed status
# Tooling tickets go to main directly, so check git log
git log --oneline -10 main | grep -i "TOOL-001"
```

**Alternatively, check if the tooling improvement exists:**
```bash
# For API endpoints, check if the feature now works
# Example: Check if create-test-user now supports role/org_id
grep -A5 "role.*org_id" docs/pm-dashboard-ui/server.js
```

### Step 5.3: Re-queue Blocked Ticket

If tooling is merged/implemented:

1. **Create QA re-run prompt:**

```markdown
# QA Agent: Re-test [TICKET-ID]

> **Type:** QA Re-run (tooling now available)
> **Original Ticket:** [TICKET-ID]
> **Branch:** agent/[ticket-id]

---

## Context

This ticket was previously blocked on QA due to missing tooling:
- **Missing:** [tooling_gap from original blocker]
- **Now Available:** [TOOL-N] has been implemented

**Previously Passed:** [passed_criteria]
**Needs Testing:** [blocked_criteria]

---

## Your Task

1. Re-read the original ticket acceptance criteria
2. Use the NEW tooling to create proper test users
3. Test the previously blocked criteria
4. Complete the full QA workflow

**New Tooling Available:**
[Describe the new endpoint/feature]

Example for create-test-user with role:
\`\`\`bash
# Create admin first
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \\
  -d '{"email": "admin@test", "password": "..."}'

# Log in as admin to create org, then get org_id
curl http://localhost:3456/api/v2/qa/org-by-email/admin@test

# Create agent in SAME org
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \\
  -d '{"email": "agent@test", "password": "...", "org_id": "[ORG_ID]", "role": "agent"}'
\`\`\`
```

2. **Update re-queue entry:**

```json
{
  "blocked_ticket": "TKT-005b",
  "waiting_for": "TOOL-001",
  "status": "requeued",
  "requeued_at": "[timestamp]"
}
```

3. **Update original ticket status:**

```bash
./scripts/agent-cli.sh update-ticket [TICKET-ID] --status qa_pending
```

4. **Log:**

`"Re-queued [TICKET-ID] for QA - tooling [TOOL-N] now available"`

### Step 5.4: Create Re-queue File if Missing

If `docs/data/requeue.json` doesn't exist:

```bash
echo '{"entries": []}' > docs/data/requeue.json
```

---

## Output Report

```markdown
## Dispatch Agent Report

**Run:** [timestamp]

### Blockers Auto-Processed (No Human Needed)
| Blocker | Action | Result |
|---------|--------|--------|
| QA-TKT-003-FAILED | Auto-continuation | Created TKT-003-v2 for QA rework |
| QA-TKT-005E-FAILED | Auto-continuation | Created TKT-005E-v2 for QA rework |
| CI-TKT-006 | Auto-continuation | Created TKT-006-v2 for regression fix |

### Tooling Blockers (Self-Healing Loop)
| Blocker | Tooling Gap | Ticket Created | Re-queue |
|---------|-------------|----------------|----------|
| QA-TKT-005b-TOOLING | create-test-user needs role/org_id | TOOL-001 | TKT-005b waiting |

### Blockers Routed to Inbox (Human Needed)
| Blocker | Reason | Status |
|---------|--------|--------|
| BLOCKED-TKT-063 | Clarification needed | Awaiting human decision |
| ENV-TKT-070 | Environment issue | Awaiting human intervention |
| EXT-TKT-062 | External setup (MaxMind) | Awaiting human to create account |

### Re-queue Status
| Blocked Ticket | Waiting For | Status |
|----------------|-------------|--------|
| TKT-005b | TOOL-001 | waiting |
| TKT-012 | TOOL-002 | requeued ✅ |

### Questions Answered
| Thread | Summary |
|--------|---------|
| F-043 | Explained default settings sync issue |

### Tickets Created
| Ticket | Title | From Finding |
|--------|-------|--------------|
| TKT-070 | Add retry logic to webhook | F-089 |

### Items Linked
| Finding | Linked To |
|---------|-----------|
| F-044 | TKT-015 (duplicate) |

### Items Skipped
| Finding | Reason |
|---------|--------|
| F-050 | Won't fix - acceptable risk |
```

---

## Blocker Routing Decision Tree

```
                              ┌─────────────────┐
                              │  Read Blocker   │
                              └────────┬────────┘
                                       │
    ┌──────────────┬───────────────────┼───────────────────┬──────────────┐
    ▼              ▼                   ▼                   ▼              ▼
┌────────┐   ┌──────────┐        ┌───────────┐      ┌───────────┐  ┌───────────┐
│QA-FAIL │   │QA-TOOLING│        │ CI-TKT-*  │      │BLOCKED-*  │  │ EXT-TKT-* │
│        │   │          │        │           │      │ ENV-TKT-* │  │           │
└───┬────┘   └────┬─────┘        └─────┬─────┘      └─────┬─────┘  └─────┬─────┘
    │             │                    │                  │              │
    ▼             ▼                    ▼                  ▼              ▼
┌────────┐   ┌──────────┐        ┌───────────┐      ┌───────────┐  ┌───────────┐
│ AUTO:  │   │  AUTO:   │        │ Compare   │      │  INBOX:   │  │  INBOX:   │
│ Create │   │ Create   │        │ to scope  │      │  Human    │  │  Human    │
│ rework │   │ TOOL-xxx │        └─────┬─────┘      │  needed   │  │  setup    │
│ ticket │   │ +requeue │        ┌─────┴─────┐      └───────────┘  └───────────┘
└────────┘   └────┬─────┘        ▼           ▼
                  │         ┌─────────┐ ┌─────────┐
                  ▼         │ Outside │ │ Inside  │
           ┌───────────┐    └────┬────┘ └────┬────┘
           │ When TOOL │         ▼           ▼
           │ merged:   │    ┌─────────┐ ┌─────────┐
           │ Re-queue  │    │  AUTO:  │ │  AUTO:  │
           │ original  │    │  fix    │ │  "Fix   │
           │ for QA    │    │  regr.  │ │  tests" │
           └───────────┘    └─────────┘ └─────────┘
```

**Key Principle:** Only BLOCKED-* and ENV-* and EXT-* go to inbox. Everything else is auto-handled.

**Self-Healing Loop:** QA-TOOLING blockers create tooling tickets. When merged, original ticket is re-queued for QA.

---

## Checklist Before Finishing

- [ ] All blockers in `blocked/` folder processed
- [ ] **QA failures: AUTO-created continuation tickets (no human needed)**
- [ ] **Tooling blockers: AUTO-created tooling tickets + re-queue entries (no human needed)**
- [ ] CI blockers: continuation tickets created OR routed to inbox
- [ ] Clarification blockers: decision threads created (human needed)
- [ ] Environment blockers: routed to inbox (human needed)
- [ ] All questions in threads answered (via API)
- [ ] No duplicate tickets created
- [ ] Database threads marked resolved where appropriate (via API)
- [ ] Finding statuses updated (ticketed/skipped)
- [ ] Tickets created via API or CLI
- [ ] `requeue.json` updated for any tooling blockers
- [ ] Re-queue check: Any waiting entries where tooling is now merged?
- [ ] Archived processed blockers to `docs/agent-output/archive/`
- [ ] Sync check passed
- [ ] Report generated

---

## Launch Commands

**Standard run (all tasks):**
```
You are a Dispatch Agent. Read docs/workflow/DISPATCH_AGENT_SOP.md then execute.
```

**Blockers only:**
```
You are a Dispatch Agent. Read docs/workflow/DISPATCH_AGENT_SOP.md then execute Task 1 only.
```

**Tickets only:**
```
You are a Dispatch Agent. Read docs/workflow/DISPATCH_AGENT_SOP.md then execute Task 3 only.
```

