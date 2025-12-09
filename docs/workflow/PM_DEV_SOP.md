# PM Development Workflow

> **Purpose:** PM workflow for dev sprints - creating tickets, launching dev agents, handling blockers.
> **Schema:** `docs/workflow/templates/ticket-schema.json`
> **Template:** `docs/workflow/templates/dev-ticket.md`
> **Launch Command:** `You are the PM. Read and execute docs/workflow/PM_DEV_SOP.md`

---

## Quick Reference

| File | Purpose |
|------|---------|
| `docs/data/tickets.json` | All tickets with full details (source of truth) |
| `docs/data/findings.json` | Blocked dev agents (type: "blocker") awaiting decisions |
| `docs/data/.agent-credentials.json` | Service logins & API keys for agents (gitignored) |
| `docs/agent-output/completions/` | Dev agent completion reports (auto-aggregated) |
| `docs/workflow/templates/ticket-schema.json` | Required ticket fields |
| `docs/workflow/templates/dev-ticket.md` | Ticket creation template |
| `docs/workflow/DEV_AGENT_SOP.md` | Dev agent instructions |

---

## Pre-Launch Setup (One-Time)

Before launching your first dev agents, ensure credentials are populated:

### Populate Agent Credentials

**File:** `docs/data/.agent-credentials.json` (gitignored)

Dev agents may need to:
- Log into Stripe/Supabase to get API keys
- Access test accounts to verify features
- Use external service credentials

**Populate the file with:**

1. **Service logins** (`services.*`) — Email/password for Stripe, Supabase, Vercel, etc.
2. **Test accounts** (`test_accounts.*`) — Local/staging app credentials
3. **Pre-fetched API keys** (`api_keys.*`) — Preferred: agents can use directly without browser navigation

```bash
# Check if credentials file exists
cat docs/data/.agent-credentials.json

# If empty or missing, copy from example and fill in:
# (The file was created with a template structure)
```

**⚠️ Security Notes:**
- This file is gitignored - NEVER commit it
- For 2FA-protected services, pre-fetch API keys and put them in `api_keys.*`
- Update `_LAST_UPDATED` when you modify credentials

---

## PM Cycle Checklist

Execute these steps **in order** every PM session:

### Phase 1: Check Agent Status

#### 1.1 Check for Blocked Agents

Blockers are in per-agent files. There are TWO types:

```bash
# List all blockers
ls docs/agent-output/blocked/

# Clarification blockers (need decision)
cat docs/agent-output/blocked/BLOCKED-TKT-*.json

# Environmental blockers (need fix)
cat docs/agent-output/blocked/ENV-TKT-*.json

# CI failure blockers (regression detected)
cat docs/agent-output/blocked/CI-TKT-*.json
```

##### For CLARIFICATION Blockers (BLOCKED-TKT-*)

Agent needs a decision on how to proceed.

1. Present blocker to human with the agent's options + recommendation
2. Wait for human decision
3. Create continuation ticket with decision
4. Archive the blocker file to `docs/agent-output/archive/`

##### For ENVIRONMENTAL Blockers (ENV-TKT-*)

Agent hit a technical issue they can't solve (type error, pnpm fails, pre-existing bug, etc.)

**Present to human with these options:**

| Option | When to Use | PM Action |
|--------|-------------|-----------|
| **A) Human fixes it** | Simple fix (typo, missing env var) | Human fixes → PM creates continuation with "Issue resolved, continue" |
| **B) Update ticket** | Agent needs specific guidance | PM adds fix instructions to ticket → Create new version (v2) |
| **C) Reassign** | Needs different skill set | PM assigns to human dev or different agent |
| **D) Cancel ticket** | Issue too complex, not worth fixing | PM cancels ticket, archives blocker |

**Continuation ticket for environmental blockers:**

```markdown
## 🔧 Environment Issue Resolution

**Original Issue:** [Copy from blocker]

**Resolution:** [What was done to fix it]
- [Specific fix 1]
- [Specific fix 2]

**What agent should do now:**
1. Pull latest: `git pull origin [branch]`
2. Reinstall deps: `pnpm install`
3. Verify fix: [How to verify the issue is resolved]
4. Continue from: [Where they left off]
```

##### For EXTERNAL SETUP Blockers (EXT-TKT-*)

Agent needs a third-party service set up that requires human action (account creation, database download, API keys, etc.)

**This is NOT something agents can do themselves.** These require:
- Creating accounts on external services
- Accepting license agreements
- Downloading files from authenticated dashboards
- Setting up billing/payment (even for free tiers)

**Present to human with these steps:**

1. **Review the blocker's `human_actions_required` list**

2. **Ask human to complete setup AND provide credentials in chat:**
   
   Tell human:
   > "Please complete the setup steps and then paste the credentials here so I can add them to the credentials file for the dev agent."

3. **Human completes setup and provides credentials in chat:**
   ```
   Created MaxMind account:
   - Email: dev@company.com  
   - Password: SecurePass123!
   - License Key: abc123xyz
   - Database downloaded to: apps/server/data/GeoLite2-City.mmdb
   ```

4. **PM/Dispatch adds credentials to `.agent-credentials.json`:**
   ```bash
   # Read current file first
   cat docs/data/.agent-credentials.json
   ```
   
   Then add the new service (merge, don't overwrite):
   ```json
   {
     "services": {
       "maxmind": {
         "login_url": "https://www.maxmind.com/en/account/login",
         "email": "dev@company.com",
         "password": "SecurePass123!",
         "license_key": "abc123xyz"
       }
     },
     "api_keys": {
       "maxmind_license": "abc123xyz"
     },
     "_LAST_UPDATED": "2025-12-07T12:00:00Z"
   }
   ```

5. **Verify setup is complete:**
   ```bash
   # Example: Verify MaxMind database
   ls -la apps/server/data/GeoLite2-City.mmdb
   
   # Example: Verify credentials added
   cat docs/data/.agent-credentials.json | jq '.services.maxmind'
   ```

6. **Create continuation ticket with setup info:**

```markdown
## 🔌 External Service Setup Complete

**Service:** [e.g., MaxMind GeoLite2]

**Setup Completed:**
- ✅ Account created at [URL]
- ✅ Database file at: `apps/server/data/GeoLite2-City.mmdb`
- ✅ Credentials added to `.agent-credentials.json`

**What agent should do now:**
1. Verify file exists: `ls -la apps/server/data/GeoLite2-City.mmdb`
2. Implement the integration code
3. Test with REAL data (not just mocks)
4. Verify acceptance criteria with actual service
```

**⚠️ IMPORTANT: Tickets requiring external setup should NEVER have status "ready" until human completes setup.**

Archive the blocker file to `docs/agent-output/archive/`

##### For CI FAILURE Blockers (CI-TKT-*)

CI detected a test regression — tests failed OUTSIDE the ticket's `files_to_modify` scope.

**Auto-handling (if attempt < 3):**

| Option | When to Use | PM Action |
|--------|-------------|-----------|
| **A) Fix regression** | Agent's changes broke something | Create continuation ticket to fix the regression |
| **B) Expand scope** | Change was intentional but scope too narrow | Add file to `files_to_modify`, relaunch |
| **C) Fix test** | Old test was wrong/outdated | Create ticket to update the test |
| **D) Escalate** | Attempt >= 3 or too complex | Mark ticket "needs_human", notify human |

**Continuation ticket for CI regressions:**

```markdown
## 🔧 CI Regression Fix

**Branch:** `[branch]` (ALREADY EXISTS - do NOT create new branch)
**PR:** #[pr_number] (already open)

**What happened:**
CI failed because your changes broke tests outside your ticket scope.

**Failing test(s):**
- [test file from blocker]

**Your files_to_modify:**
- [original scope files]

**Your task:**
1. Pull latest: `git pull origin [branch]`
2. Review the failing test to understand what broke
3. Fix your code to not break the failing test
4. Do NOT break your original feature
5. Push and CI will re-run automatically

**Attempt:** [N] of 3
```

**Max attempts:** If attempt >= 3, escalate to human instead of creating another continuation.

#### 1.2 Check for Stalled Agents

Agents signal start by writing to `docs/agent-output/started/`. Detect stalls:

```bash
# List started agents
ls -la docs/agent-output/started/

# Compare to completions - stalled = started but no completion after 4+ hours
ls docs/agent-output/completions/
```

**Stall Detection Logic:**
1. For each file in `started/`, check if matching completion exists in `completions/`
2. If no completion AND started > 4 hours ago → Agent may be stalled
3. Check git branch for activity: `git log agent/TKT-XXX --oneline -5 --since="4 hours ago"`
4. If no recent commits → Investigate (agent may have crashed or gone silent)

**For stalled agents:**
1. Check if there's a blocker file they forgot to write
2. If truly stalled, create continuation ticket with checkpoint from git history
3. Archive the stale start file

#### 1.3 Check File Locks

Before launching new agents, check which files are locked:

```bash
# See all files currently locked by running agents
cat docs/agent-output/started/*.json | jq '.files_locking[]'
```

**Rule:** Don't launch a ticket if its `files_to_modify` overlap with any locked files.

**Continuation Ticket Format:**
```
docs/prompts/active/dev-agent-TKT-XXX-v2.md
```

See [Continuation Ticket Template](#continuation-ticket-template) below.

---

### Phase 2: Check Completions

Check for dev agent completion reports:

```bash
ls docs/prompts/active/   # Active agents
ls docs/agent-output/completions/  # Dev completion reports
```

**For each new completion file:**

1. **Update `docs/data/dev-status.json`** (required for dashboard to show it):
   ```json
   {
     "completed": [
       {
         "ticket_id": "SEC-001",
         "branch": "agent/SEC-001-api-auth",
         "started_at": "2025-12-05T12:00:00Z",
         "completed_at": "2025-12-05T12:39:00Z",
         "completion_file": "docs/agent-output/completions/SEC-001-*.md"
       }
     ]
   }
   ```

2. Archive the agent's start file (if not already done by agent):
   ```bash
   mv docs/agent-output/started/TKT-XXX-*.json docs/agent-output/archive/
   ```

3. Move ticket to Review phase in `docs/data/tickets.json` (status: "review")

4. Check for **Findings** in `docs/agent-output/findings/` — add to triage queue

5. Create review-agent prompt (or mark for human QA)

**Handling Observations:**
If completion report has "Observations" section (issues noticed outside scope):
1. Format as finding in `docs/REVIEW_FINDINGS.md` under "Dev Observations"
2. Present to human for decision
3. Create ticket if approved

---

### Phase 3: Create Dev Tickets

**3.1 Check Backlog**
```bash
cat docs/data/tickets.json | jq '.tickets[] | select(.status == "ready") | .id'
```

**3.2 Ticket Quality Checklist**

Before a ticket is ready for dev, verify ALL fields:

- [ ] **Context:**
  - [ ] `issue` explains what's wrong AND why it matters
  - [ ] `feature_docs` links to relevant docs/features/*.md
  - [ ] `similar_code` lists 1-2 patterns to follow

- [ ] **Scope:**
  - [ ] `files_to_modify` explicitly listed
  - [ ] `out_of_scope` has at least 2 items
  
- [ ] **Work:**
  - [ ] `fix_required` has specific steps
  - [ ] `acceptance_criteria` are all testable (binary yes/no)
  - [ ] `risks` are specific, not vague

- [ ] **Verification:**
  - [ ] `dev_checks` has typecheck + build + quick test
  - [ ] `qa_notes` has context for QA agent

- [ ] **⚠️ External Services Check (CRITICAL):**
  - [ ] Does ticket mention third-party services? (MaxMind, Stripe, AWS, etc.)
  - [ ] If YES: Is `external_services` field populated?
  - [ ] If credentials NOT in `.agent-credentials.json`: Mark ticket as `blocked` until human sets up
  - [ ] If account creation needed: **DO NOT set status to "ready"**

- [ ] **Size Check:**
  - [ ] ≤5 files to modify
  - [ ] ≤6 acceptance criteria
  - [ ] Single system (not frontend + backend + database)

**If ticket fails size check → SPLIT IT** (see below).

**3.3 Finding Feature Docs**

```bash
# List all feature docs
ls docs/features/

# Match ticket feature to doc folder
ls docs/features/billing/   # For billing tickets
ls docs/features/admin/     # For admin tickets
```

**3.4 Finding Similar Code**

```bash
# Search for similar patterns
grep -r "functionName" apps/ --include="*.ts" -l

# Find similar components
ls apps/dashboard/src/features/

# Search for patterns
grep -r "pattern" apps/ -A 5 --include="*.tsx"
```

**3.5 Writing Out of Scope**

Always include at minimum:
1. "Do NOT modify files outside the listed scope"
2. "Do NOT add features beyond what's specified"

Common additions:
- UI: "Do NOT change global styles or theme"
- API: "Do NOT change response schema"
- DB: "Do NOT modify existing migrations"
- Billing: "Do NOT change Stripe configuration"

---

### Phase 4: Create Dev Agent Prompts

For each ready ticket, create a dev agent prompt:

**File:** `docs/prompts/active/dev-agent-TKT-XXX-v1.md`

```markdown
# Dev Agent: TKT-XXX - [Title]

> **Type:** New ticket
> **Priority:** [critical/high/medium/low]
> **Branch:** `agent/TKT-XXX-[short-description]`

---

## Your Task

[Copy issue from ticket]

---

## Context

**Feature Docs:**
- [Link to relevant docs]

**Similar Code:**
- [Path to similar implementation]

---

## Scope

### Files to Modify
- `path/to/file.ts`

### Files to Read (Context Only)
- `path/to/context.ts`

### Out of Scope
- Do NOT [specific exclusion]
- Do NOT [specific exclusion]

---

## Fix Required

1. [Step 1]
2. [Step 2]

---

## Acceptance Criteria

- [ ] [Criterion 1]
- [ ] [Criterion 2]

---

## Risks to Avoid

- [Risk 1]
- [Risk 2]

---

## Dev Checks (Before Submitting)

- [ ] pnpm typecheck passes
- [ ] pnpm build passes
- [ ] [Quick manual verification]

---

## QA Notes

[Any special context for QA agent]
```

---

### Phase 5: Output Launch Commands

```markdown
## 🚀 Dev Sprint - Launch Commands

**Instructions:** Open separate Cursor chats, paste one command per chat.

### Critical Priority
1. `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-001-v1.md`
2. ...

### High Priority
1. `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-009-v1.md`
2. ...

**Total: [N] dev agents ready to launch**

---

### Parallel Execution Notes

These tickets can run in parallel (no file conflicts):
- TKT-001 (widget files)
- TKT-006 (middleware only)
- TKT-019 (incoming-call only)

These must run sequentially (shared files):
- TKT-002, TKT-030 (both touch settings/actions.ts)

### ⚠️ Race Condition Mitigation

**Problem:** If two agents start at the exact same moment, both might pass the file lock check before either writes their start file.

**Mitigation:**
1. **Launch agents with 5-10 second gaps** - don't paste all launch commands simultaneously
2. **Check file conflicts in tickets.json before creating prompts** - PM's responsibility
3. **If conflict detected after launch** - one agent will see the other's start file and stop

**Launch Sequence:**
```bash
# Launch first agent, wait 5 seconds
# Launch second agent, wait 5 seconds
# Continue...
```

This gives each agent time to write their start file before the next agent checks for locks.
```

---

### Phase 6: Handle Documentation Updates

After a dev agent completes a ticket, handle re-documentation:

#### 6.1 Check Completion Report for Documentation Impact

Read the dev agent's completion report. Look for the "Documentation Impact" section.

#### 6.2 Mark Affected Docs as Needing Re-Documentation

For each affected doc, update `docs/data/doc-status.json`:

```json
{
  "[feature-id]": {
    "documented": false,
    "needs_redoc": true,
    "pending_tickets": ["TKT-XXX"],
    "redoc_context": {
      "branch": "[branch from completion report]",
      "summary": "[from completion report]",
      "files_changed": ["[from completion report]"],
      "git_diff_cmd": "git diff main..[branch] -- [files]"
    }
  }
}
```

#### 6.3 Create Re-Doc Agent Prompts

For features needing re-documentation:

**File:** `docs/prompts/active/redoc-agent-[FEATURE-ID].md`

Use template: `docs/workflow/templates/redoc-agent.md`

**Key:** Include the `git_diff_cmd` so doc agent reads actual code changes, not dev's summary.

#### 6.4 Pipeline Order

```
Dev Completes → PM Marks Docs Stale → Doc Agent Re-Documents → QA Agent Tests (future)
```

Documentation informs QA. QA agents (future) will use updated docs for test context.

#### 6.5 Quick Reference

```bash
# Check which docs need re-documentation
cat docs/data/doc-status.json | jq '.features | to_entries[] | select(.value.needs_redoc == true) | .key'

# After re-doc complete, mark as documented
# Update doc-status.json: documented=true, needs_redoc=false, pending_tickets=[], redoc_context=null
```

---

## Splitting Oversized Tickets

### When to Split

- More than 5 files to modify
- More than 6 acceptance criteria
- Touches multiple systems (frontend + backend + database)
- Requires new infrastructure (scheduler, queue, migrations)

### How to Split

**By Layer:**
```
TKT-004 (too big): Complete Pause with Stripe
    ↓
TKT-004a: Stripe Pause API Call
TKT-004b: Auto-Resume Scheduler
TKT-004c: Webhook Handlers
TKT-004d: Widget/Agent Status
```

**By Feature:**
```
TKT-005 (too big): Payment Failure Blocking
    ↓
TKT-005a: Add past_due Type
TKT-005b: Create Blocker Modal
TKT-005c: Handle Webhook
TKT-005d: Send Email
TKT-005e: Force Agents Offline
```

### Dependency Management

When splitting, note dependencies:
```json
{
  "id": "TKT-004b",
  "depends_on": ["TKT-004a"]
}
```

Launch dependent tickets after their dependencies complete.

---

## Continuation Ticket Template

When a dev agent is blocked and human decides:

**File:** `docs/prompts/active/dev-agent-TKT-XXX-v2.md`

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation (blocked → resumed)
> **Original Ticket:** TKT-XXX - [Title]
> **Branch:** `agent/TKT-XXX-[description]` (ALREADY EXISTS)

---

## 🔓 Blocker Resolution

**Question:** [The question agent asked]

**Human Decision:** [Option X] — [Human's decision and any notes]

---

## 📍 Where You Left Off

**Branch exists with [N] commits.** Do NOT create a new branch.

```bash
git fetch origin
git checkout agent/TKT-XXX-[description]
git pull origin agent/TKT-XXX-[description]
```

**Files already created:**
- `path/to/new-file.ts`

**Files already modified:**
- `path/to/modified.ts` (lines X-Y)

**What's done:**
- ✅ [Completed item]
- ✅ [Completed item]

**What's left:**
- ⬜ [Remaining item] ← START HERE
- ⬜ [Remaining item]
- ⬜ [Remaining item]

**Previous agent's notes:**
> [Notes from blocked report]

---

## 📋 Original Ticket Spec

[Include full original spec so agent has complete context]

---

## ✅ Acceptance Criteria (unchanged unless noted)

[Copy from original, mark any updates based on human decision]

---

## 🚫 Risks to Avoid (unchanged)

[Copy from original]

---

## 🚀 Your Task

1. Read this entire spec
2. Checkout the existing branch (don't create new)
3. Review existing commits and code
4. Continue from where previous agent stopped
5. Complete remaining items
6. Submit for review when done
```

---

## Dev Observations → Triage

When dev completion report includes Observations:

**1. Format as finding:**

```markdown
## DEV-OBS-[NNN] - [Title]

**Source:** Dev Agent (TKT-XXX completion)
**Found:** [date]
**Type:** Dev Observation

### Observation
[Copy from completion report]

### Options
1. **Create ticket** — Add to backlog
2. **Investigate** — Review agent digs deeper first
3. **Skip** — Not a real issue
4. **Defer** — Known, will address later

### Recommendation
[PM's recommendation]

### Human Decision
⏳ PENDING
```

**2. Add to REVIEW_FINDINGS.md** under "Dev Observations" section

**3. Present to human** for decision

**4. Create ticket** if approved

---

## File Lock Management

When multiple dev agents run in parallel, track file locks:

```markdown
## 🔒 Active File Locks

| File | Locked By | Ticket | Since |
|------|-----------|--------|-------|
| apps/dashboard/src/lib/stripe.ts | Dev Agent | TKT-002 | 2h ago |
| apps/server/src/features/webhooks/stripe.ts | Dev Agent | TKT-002 | 2h ago |
```

**Rules:**
1. Before creating ticket prompt, check if files are locked
2. If locked, queue ticket until lock released
3. When agent completes, remove file locks
4. If agent goes stale (>4 hours no activity), investigate

---

## Git Workflow

### Dev Agents Create Branches

Branch naming: `agent/TKT-XXX-short-description`

Examples:
- `agent/TKT-001-cobrowse-sanitization`
- `agent/TKT-006-middleware-redirect`

### Human Merges

After QA approval:
1. Human reviews branch
2. Human merges to main (squash merge recommended)
3. PM archives the dev prompt

```bash
# Archive completed prompts
mv docs/prompts/active/dev-agent-TKT-XXX*.md docs/prompts/archive/
git add docs/prompts/
git commit -m "docs: archive completed dev prompt TKT-XXX"
```

### Archive Agent Outputs

After processing completions, archive or delete the per-agent output files:

```bash
# Archive processed completion reports
mv docs/agent-output/completions/*.md docs/agent-output/archive/

# Or delete if not needed for history
rm docs/agent-output/completions/*.md
```

---

## Troubleshooting

**Q: Agent is blocked but didn't report it**
A: Check git branch for uncommitted work. Review recent commits. If agent is stale, create continuation ticket with checkpoint.

**Q: Two agents modified the same file**
A: This shouldn't happen if file locks are tracked. Resolve conflicts manually, investigate how lock was bypassed.

**Q: Agent completed but broke something**
A: Create fix ticket referencing original. Run `git revert` on main if deployed.

**Q: How do I prioritize blocked agents?**
A: Critical tickets first. Blocked agents should be unblocked within 4 hours max.

**Q: Agent added features not in spec**
A: Reject in review. Send back with clear instruction to remove additions.

**Q: Agent didn't follow style guide**
A: Reject in review. Create continuation ticket with specific style violations to fix.

---

## Example PM Session

```
PM starts dev session...

1. Check blocked queue
   → TKT-001 blocked asking about SSN masking
   → Present to human: "Agent asks: Should SSN be included? Options: 1) Yes 2) No 3) Configurable"
   → Human: "Option 1 - include SSN"
   → Create continuation ticket dev-agent-TKT-001-v2.md

2. Check completions
   → TKT-006 complete
   → Move to review phase
   → Agent noted observation: "Password reset token doesn't expire"
   → Add to triage queue

3. Check ready tickets
   → TKT-009, TKT-011 ready but need enhancement
   → Add feature_docs, similar_code, out_of_scope

4. Create dev prompts
   → dev-agent-TKT-009-v1.md
   → dev-agent-TKT-011-v1.md

5. Output launch commands
   → 3 agents ready (TKT-001-v2, TKT-009, TKT-011)
   → Note file conflicts: TKT-009 and TKT-011 have no overlap

6. Human launches agents
```

