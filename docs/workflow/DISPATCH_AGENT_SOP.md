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
| `CI-TKT-*` | Auto-create continuation ticket | ❌ NO |
| `BLOCKED-TKT-*` | Route to inbox | ✅ YES |
| `ENV-TKT-*` | Route to inbox | ✅ YES |
| `EXT-TKT-*` | Route to inbox (external setup needed) | ✅ YES |

**Only clarifications, environment issues, and external setup need human decisions.** Everything else gets auto-processed into continuation tickets for dev agents to pick up.

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

| File | Purpose |
|------|---------|
| `docs/agent-output/blocked/` | Blocker files from dev agents + CI |
| `docs/data/tickets.json` | All tickets (source of truth) |
| `docs/data/findings.json` | Findings inbox (human reviews) |
| `docs/data/decisions.json` | Human decisions on findings |
| `docs/prompts/active/` | Active agent prompts |

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
| `CI-TKT-*` | CI Failure | ✅ YES | Tests failed on agent branch |
| `BLOCKED-TKT-*` | Clarification | ❌ NO | Agent has a question (needs human) |
| `ENV-TKT-*` | Environment | ❌ NO | Infra/credentials issue (needs human) |
| `EXT-TKT-*` | External Setup | ❌ NO | Third-party service needs human setup |

### ⚠️ IMPORTANT: Check `blocker_type` Inside QA Files!

**Don't just look at the filename!** QA blockers can have different `blocker_type` values:

| `blocker_type` in JSON | Action | Human Needed? |
|------------------------|--------|---------------|
| `qa_failure` | Auto-create continuation ticket | ❌ NO |
| `external_setup_incomplete` | Route to inbox | ✅ YES |
| `clarification` | Route to inbox | ✅ YES |

Also check for `dispatch_action: "route_to_inbox"` which always means human required.

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

1. Create prompt file: `docs/prompts/active/dev-agent-TKT-XXX-v2.md`

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-XXX  
> **Branch:** `[branch from blocker]` (ALREADY EXISTS - do NOT create new branch)

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

1. Checkout existing branch: `git checkout [branch]`
2. Pull latest: `git pull origin [branch]`
3. Read the QA failure report carefully
4. Fix ALL issues identified by QA
5. Verify with grep/code inspection BEFORE claiming completion
6. Push for re-QA

---

## Original Acceptance Criteria

[Copy from original ticket]

---

## Files in Scope

[Original files_to_modify]
```

2. Update ticket status via CLI:
   ```bash
   ./scripts/agent-cli.sh update-ticket TKT-XXX --status ready
   ```
3. Archive blocker: `mv docs/agent-output/blocked/QA-*.json docs/agent-output/archive/`
4. Log: `"Auto-created TKT-XXX-v2 for QA rework"`

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

1. Create prompt file: `docs/prompts/active/dev-agent-TKT-XXX-v2.md`

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation (CI failed)
> **Original Ticket:** TKT-XXX  
> **Branch:** `[branch from blocker]` (ALREADY EXISTS - do NOT create new branch)

---

## 🔧 Regression Fix Required

**What happened:**
CI tests failed with [X] regressions outside your ticket scope.

**Failed tests:**
[List from blocker.failed_tests]

**Your task:**
1. Checkout existing branch: `git checkout [branch]`
2. Pull latest: `git pull origin [branch]`
3. Run tests locally: `pnpm test`
4. Fix the regressions WITHOUT breaking your original feature
5. Push and CI will re-run automatically

---

## Original Ticket Context

[Copy from original ticket]

---

## Files in Scope

[Original files + regression test files]
```

2. Update ticket status via CLI:
   ```bash
   ./scripts/agent-cli.sh update-ticket TKT-XXX --status ready
   ```
3. Archive blocker: `mv docs/agent-output/blocked/CI-TKT-*.json docs/agent-output/archive/`
4. Log: `"Auto-created TKT-XXX-v2 for regression fix"`

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

### Step 2.1: Find Threads Needing Response

Look for threads where:
- `decision.option_id === "custom"` AND
- Last message has `role: "human"`

### Step 2.2: Respond to Each

1. Read the human's question
2. Read the finding context (issue, options, suggested_fix)
3. Add your response:

```json
{
  "role": "system",
  "text": "[your answer - concise and actionable]",
  "timestamp": "[now ISO format]"
}
```

**Response Guidelines:**
- Keep answers concise (2-3 sentences max)
- Provide clear options when applicable
- Reference specific code/files when relevant
- If you need more context, ask a clarifying question

---

## Task 3: CREATE TICKETS & RESOLVE THREADS

### Step 3.1: Find Threads to Process

Look for threads where:
- `decision != null` AND
- `status !== "resolved"`

### Step 3.2: Check for Duplicates FIRST

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

### Step 3.3: Skip or Create

**SKIP these (don't create tickets):**
- `custom_note` contains: "skip", "dont need", "already have ticket", "already covered"
- Questions ending in "?"
- `decision.option_id` is "skip" or "wont_fix"

**CREATE tickets for:**
- Clear "implement" decisions with NO existing coverage
- Set `finding.status = "ticketed"`
- Set `finding.ticket_id = "TKT-XXX"`
- Set `thread.status = "resolved"`

### Step 3.4: Create Ticket

Use the ticket schema from `docs/workflow/templates/ticket-schema.json`:

```json
{
  "id": "TKT-XXX",
  "title": "[from finding title]",
  "feature": "[from finding feature]",
  "priority": "[from finding severity]",
  "status": "ready",
  "files_to_modify": ["[from finding location]"],
  "acceptance_criteria": ["[from suggested_fix]"],
  "source_finding": "F-XXX",
  "created_at": "[now]"
}
```

---

## Task 4: SYNC CHECK

After all updates, run:

```bash
node docs/scripts/process-decisions.js
```

This catches any inconsistencies between files.

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

### Blockers Routed to Inbox (Human Needed)
| Blocker | Reason | Status |
|---------|--------|--------|
| BLOCKED-TKT-063 | Clarification needed | Awaiting human decision |
| ENV-TKT-070 | Environment issue | Awaiting human intervention |
| EXT-TKT-062 | External setup (MaxMind) | Awaiting human to create account |

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
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
   ┌───────────┐           ┌───────────┐           ┌───────────┐
   │ QA-*-FAIL │           │ CI-TKT-*  │           │BLOCKED-*  │
   │           │           │           │           │ ENV-TKT-* │
   └─────┬─────┘           └─────┬─────┘           │ EXT-TKT-* │
         │                       │                 └─────┬─────┘
         ▼                       ▼                       │
   ┌───────────┐          ┌───────────┐           ┌─────▼─────┐
   │  AUTO:    │          │ Compare   │           │  INBOX:   │
   │  Create   │          │ to scope  │           │  Human    │
   │  rework   │          └─────┬─────┘           │  needed   │
   │  ticket   │          ┌─────┴─────┐           └───────────┘
   └───────────┘          ▼           ▼
                    ┌─────────┐ ┌─────────┐
                    │ Outside │ │ Inside  │
                    └────┬────┘ └────┬────┘
                         ▼           ▼
                    ┌─────────┐ ┌─────────┐
                    │  AUTO:  │ │  AUTO:  │
                    │  fix    │ │  "Fix   │
                    │  regr.  │ │  tests" │
                    └─────────┘ └─────────┘
```

**Key Principle:** Only BLOCKED-* and ENV-* go to inbox. Everything else is auto-handled.

---

## Checklist Before Finishing

- [ ] All blockers in `blocked/` folder processed
- [ ] **QA failures: AUTO-created continuation tickets (no human needed)**
- [ ] CI blockers: continuation tickets created OR routed to inbox
- [ ] Clarification blockers: decision threads created (human needed)
- [ ] Environment blockers: routed to inbox (human needed)
- [ ] All questions in threads answered
- [ ] No duplicate tickets created
- [ ] `decisions.json` threads marked resolved where appropriate
- [ ] `findings.json` statuses updated (ticketed/skipped)
- [ ] `tickets.json` updated with new tickets
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

