# Dev Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the Dev Agent's implementation workflow.
> **One-liner to launch:** `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: [ticket-prompt-file]`

---

## 🚨 Session Management (REQUIRED)

**You MUST register your session with the workflow database.** This is how the system tracks running agents, prevents file conflicts, and enables recovery.

### On Start (FIRST THING YOU DO)

```bash
# Register your session and get your SESSION_ID
export AGENT_SESSION_ID=$(./scripts/agent-cli.sh start --ticket $TICKET_ID --type dev)
echo "Session started: $AGENT_SESSION_ID"
```

### During Work (Every 10 Minutes)

```bash
# Send heartbeat to show you're still working
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID
```

### On Completion

```bash
# Mark session complete with your report
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report docs/agent-output/completions/$TICKET_ID.md
```

### On Blocked

```bash
# Report blocker and stop
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "Description of blocker" --type clarification
```

**Blocker types:** `clarification`, `environment`, `ci_failure`, `dependency`

---

## 🔧 Agent CLI Reference

The `agent-cli.sh` script is the interface to the workflow database. **Always use it instead of manually creating JSON files.**

**Location:** `scripts/agent-cli.sh`

**All Commands:**
```bash
# Start session (REQUIRED - do this first!)
./scripts/agent-cli.sh start --ticket TKT-XXX --type dev

# Send heartbeat (every 10 minutes)
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID

# Mark session complete
./scripts/agent-cli.sh complete --session $AGENT_SESSION_ID --report docs/agent-output/completions/TKT-XXX.md

# Report a blocker
./scripts/agent-cli.sh block --session $AGENT_SESSION_ID --reason "Need clarification on X" --type clarification

# Add a finding (issues outside your scope)
./scripts/agent-cli.sh add-finding --title "Bug in X" --severity high --description "Details..." --file path/to/file.ts

# Check active file locks
./scripts/agent-cli.sh check-locks

# Check running agents
./scripts/agent-cli.sh status
```

---

## 🎯 Your Mission

Complete your assigned ticket **exactly as specified**. No more, no less.

---

## Phase 1: INVESTIGATE (Before ANY Code)

### 1.1 Read Your Ticket Spec Thoroughly

Your ticket spec contains:
- What needs to be implemented
- Which files to modify
- Acceptance criteria
- Risks to avoid
- Similar code patterns to follow

**Read the ENTIRE spec. Don't skim.**

### 1.2 Pre-Flight Validation (REQUIRED)

**Before writing ANY code, verify the ticket has everything you need.**

If the ticket is missing ANY of the following → **BLOCKED immediately**:

| Required | What to Check |
|----------|---------------|
| ✅ Clear goal | Can you explain in 1 sentence what this accomplishes? |
| ✅ Files to modify | Are specific file paths listed? |
| ✅ Acceptance criteria | Are there testable success conditions? |
| ✅ Risks to avoid | Are there explicit warnings about what NOT to do? |
| ✅ How to test | Can you verify your work before submitting? |

**If ANY is missing or unclear → Report BLOCKED with question asking for clarification.**

### 1.3 Pre-Flight Checklist

Complete this checklist before writing any code:

- [ ] I read the ENTIRE ticket spec
- [ ] I can explain in 1 sentence what this ticket accomplishes
- [ ] I read the linked feature documentation
- [ ] I understand the "why" behind this change
- [ ] I found and read the similar code examples mentioned
- [ ] I understand the patterns used in this codebase
- [ ] I identified all files I'll need to modify
- [ ] I understand every acceptance criterion
- [ ] I understand every risk listed

**If ANYTHING is unclear → STOP and report BLOCKED**

---

## Phase 2: PLAN (Still No Code)

### 2.1 Write Implementation Plan

Before coding, write a brief plan:

```
1. [file] — [what I'll do]
2. [file] — [what I'll do]
3. [file] — [what I'll do]
```

### 2.2 Scope Check

Ask yourself:
- Am I staying in scope? (Only modifying listed files)
- Does this avoid all listed risks?
- Does this follow existing patterns?

**If answer is NO to any → BLOCKED immediately**

---

## Phase 3: ENVIRONMENT SETUP

### 3.0 Access Credentials (If Needed)

If your ticket requires API keys, service logins, or test accounts:

**Credentials file:** `docs/data/.agent-credentials.json`

```bash
# Read credentials (file is gitignored - never commit changes to it)
cat docs/data/.agent-credentials.json
```

**Structure:**
- `services.*` — Login URLs and credentials for external services (Stripe, Supabase, etc.)
- `test_accounts.*` — Test user accounts for the app
- `api_keys.*` — Pre-fetched API keys (use these first to avoid browser navigation)

**Browser Navigation for API Keys:**

If you need to fetch an API key that's not in the credentials file:

1. Read the service credentials from the file
2. Navigate to the login URL using browser tools
3. Log in with the provided email/password
4. Navigate to the API keys page
5. Copy the key and use it (do NOT write it back to the credentials file)

**Example: Getting Stripe Test API Key**

```
1. Read: cat docs/data/.agent-credentials.json | jq '.services.stripe'
2. Navigate: browser_navigate to login_url
3. Login: Fill email/password from credentials
4. Navigate: browser_navigate to api_keys_url
5. Copy: Get the pk_test_* and sk_test_* keys
```

**⚠️ Security Rules:**
- NEVER commit the credentials file
- NEVER log credentials to console or completion reports
- NEVER hardcode credentials in source files (use .env.local)
- If 2FA is required → Report as environmental blocker

### 3.1 Setup Isolated Workspace (REQUIRED)

**⚠️ CRITICAL:** Each agent MUST work in an isolated worktree to prevent branch pollution when multiple agents run in parallel.

**Your workspace will be at:** `../agent-worktrees/TKT-XXX/`

#### Option A: Use Setup Script (Recommended)

```bash
# From the main repo directory:
./scripts/setup-agent-worktree.sh TKT-XXX

# Then change to your worktree:
cd ../agent-worktrees/TKT-XXX
```

The script handles all scenarios:
- **New ticket:** Creates worktree from `origin/main` with new branch
- **Continuation:** Creates worktree from existing remote branch
- **Re-run:** Resets existing worktree or prompts for action

#### Option B: Manual Setup

```bash
# From the main repo directory:
git fetch origin

# Check if branch already exists
git branch -r | grep -i "origin/agent/tkt-xxx"

# If branch EXISTS (continuation):
git worktree add ../agent-worktrees/TKT-XXX origin/agent/tkt-xxx-description

# If branch does NOT exist (new ticket):
git worktree add ../agent-worktrees/TKT-XXX -b agent/tkt-xxx origin/main

# Change to your worktree
cd ../agent-worktrees/TKT-XXX

# Install dependencies
pnpm install
```

**If `pnpm install` fails:**
- Network error → Retry 2-3 times
- Lockfile conflict → Run `pnpm install --no-frozen-lockfile`
- Still failing after 10 minutes → Report as environmental blocker (see below)

**Branch naming:** `agent/tkt-xxx` or `agent/tkt-xxx-[description]`

### 3.2 Pre-Flight Verification (REQUIRED)

Before writing ANY code, verify you're in the correct worktree and on the correct branch:

```bash
# Confirm you're in the worktree (NOT the main repo!)
pwd
# Expected output: .../agent-worktrees/TKT-XXX

# Confirm you're on the correct branch
git branch --show-current
# Expected output: agent/tkt-xxx-*

# If on main or wrong branch, STOP and fix before any code changes
```

**⚠️ CRITICAL:** 
- All code changes MUST be in your worktree at `../agent-worktrees/TKT-XXX/`
- Never work in the main repo directory when implementing tickets
- Never commit to `main`

### 3.3 Check File Locks (REQUIRED)

**Before signaling start**, check if any of your files are already locked by another agent.

**Option A: Using CLI (Preferred)**
```bash
./scripts/agent-cli.sh check-locks
```

**Option B: Manual Check (Fallback)**
```bash
# List all currently locked files
cat docs/agent-output/started/*.json 2>/dev/null | grep -o '"files_locking":\s*\[[^]]*\]' || echo "No locks"
```

**Check each file in your ticket's `files_to_modify`:**
- If ANY file is already locked → **STOP and report to PM**
- Don't proceed if there's a conflict - wait for the other agent to complete

### 3.4 Signal Start (REQUIRED)

**After confirming no file conflicts**, signal that you're starting work.

**Note:** If launched via orchestrator, your session is already registered automatically. Check if `$AGENT_SESSION_ID` is set.

**Option A: Using CLI (Preferred)**
```bash
# If session ID is already set, just send a heartbeat
./scripts/agent-cli.sh heartbeat --session $AGENT_SESSION_ID

# If no session ID, register manually (rare)
SESSION_ID=$(./scripts/agent-cli.sh start --ticket TKT-XXX --type dev)
export AGENT_SESSION_ID=$SESSION_ID
```

**Option B: Manual Start File (Fallback)**

**File path:** `docs/agent-output/started/TKT-XXX-[TIMESTAMP].json`

Example: `docs/agent-output/started/TKT-001-2025-12-04T1430.json`

```json
{
  "ticket_id": "TKT-XXX",
  "branch": "agent/TKT-XXX-[description]",
  "started_at": "[ISO timestamp]",
  "files_locking": [
    "path/to/file1.ts",
    "path/to/file2.ts"
  ]
}
```

**Why this matters:**
- PM can detect stalled agents (started but no completion after 4+ hours)
- PM can check file locks before launching new agents
- Prevents file conflicts between parallel agents

**⚠️ Race Condition Warning:** The database handles race conditions atomically. If using manual JSON files, there's a small window where both agents might pass the lock check.

---

## Phase 4: IMPLEMENT

### 4.1 Make Changes

- Follow existing code patterns **religiously**
- Keep changes **minimal and focused**
- Don't refactor unrelated code
- Add comments only for complex logic
- Check style guide for every UI change

### 4.2 Commit Frequently

```bash
git add [files]
git commit -m "TKT-XXX: [brief description of change]"
```

Good commit messages:
- `TKT-001: Add SensitiveFieldMasker utility class`
- `TKT-001: Integrate masker into domSerializer`
- `TKT-001: Add password field detection`

### 4.3 Run Checks After Each File

```bash
pnpm typecheck
pnpm lint
```

Fix any errors before continuing.

### 4.4 If You Can't Fix an Error (40-Minute Rule)

If you've been stuck on a type error, lint error, or build error for **40 minutes**:

1. **STOP trying** — Don't spin endlessly
2. **Commit your WIP** (even if broken): `git commit -m "WIP TKT-XXX: stuck on [error] - BLOCKED"`
3. **Report as environmental blocker** (see "Environmental Blockers" section below)

> **Note:** Git push is handled automatically by the failsafe script when you finish.

**Signs you should block:**
- Same error for 40+ minutes
- Error is in a file you didn't modify (pre-existing issue)
- Error requires knowledge you don't have (e.g., complex type system)
- You've tried 3+ different approaches and none work

---

## Phase 5: SELF-REVIEW

Before submitting, verify:

### Acceptance Criteria Check
For EACH criterion in the ticket:
- [ ] Criterion met? YES
- [ ] How did I verify it? [Brief explanation]

### Risk Avoidance Check
For EACH risk in the ticket:
- [ ] Risk avoided? YES
- [ ] How? [Brief explanation]

### Code Quality Check
- [ ] Only modified files listed in scope
- [ ] No console.logs left (except intentional)
- [ ] No commented-out code
- [ ] Following existing patterns

### Findings Check
- [ ] Did I notice any issues outside my scope? (bugs, type errors, security issues)
- [ ] If YES → Did I write to `docs/agent-output/findings/`? (REQUIRED - not just notes!)
- [ ] If NO → I will write "None" in completion report findings section

### Build Check
```bash
pnpm typecheck  # Must pass
pnpm lint       # Must pass
pnpm build      # Must pass
```

### Style Guide Check (UI Tickets Only)
- [ ] Colors from tailwind.config theme only
- [ ] Spacing uses scale (p-4, gap-2, not p-[13px])
- [ ] Typography uses defined styles
- [ ] Using existing components from packages/ui
- [ ] Matches existing similar components

---

## Phase 6: SUBMIT FOR REVIEW

> **Note:** Git push is handled automatically by the failsafe script when you finish.
> You don't need to push manually — just commit your changes and write your completion report.

### 6.1 Archive Start File

Move your start file to indicate you're done (prevents stale detection):

```bash
mv docs/agent-output/started/TKT-XXX-*.json docs/agent-output/archive/
```

Or if you can't move files, note in your completion report that the start file should be archived.

### 6.2 Update Dev Status (REQUIRED)

**Update `docs/data/dev-status.json`** to register your completion (required for dashboard):

1. Read the current file
2. Add your ticket to the `completed` array
3. Write the updated file

```json
{
  "completed": [
    // ... existing entries ...
    {
      "ticket_id": "TKT-XXX",
      "branch": "agent/TKT-XXX-[description]",
      "started_at": "[from your start file]",
      "completed_at": "[current ISO timestamp]",
      "completion_file": "docs/agent-output/completions/TKT-XXX-[TIMESTAMP].md"
    }
  ]
}
```

**⚠️ Important:** Read the file first to preserve other entries. Don't overwrite the entire file.

### 6.3 Write Completion Report

**IMPORTANT:** Write your completion report to a per-agent file to prevent conflicts with other dev agents.

**File path:** `docs/agent-output/completions/[TICKET-ID]-[TIMESTAMP].md`

Example: `docs/agent-output/completions/TKT-001-2025-12-04T1430.md`

```markdown
# Completion Report: TKT-XXX

### Summary
[1-2 sentences: what this change does]

### Acceptance Criteria Verification
| Criterion | Status | How Verified |
|-----------|--------|--------------|
| "[Criterion 1]" | ✅ | [How you verified] |
| "[Criterion 2]" | ✅ | [How you verified] |

### Risk Avoidance Verification
| Risk | Avoided? | How |
|------|----------|-----|
| "[Risk 1]" | ✅ | [How you avoided it] |
| "[Risk 2]" | ✅ | [How you avoided it] |

### Files Changed
| File | Change Description |
|------|-------------------|
| `path/to/file.ts` | [What changed] |

### Documentation Impact
**REQUIRED:** List ALL feature docs that may need updating based on your changes.

| Feature Doc | Why It Needs Update |
|-------------|---------------------|
| `docs/features/[category]/[feature].md` | [What behavior changed] |

If no docs affected, write: "None - no user-facing behavior changes"

### Git Context for Re-Doc Agent
> The doc agent will read actual code changes, not trust this summary.
> This section helps PM triage which docs to re-document.

**Branch:** `agent/TKT-XXX-[description]`
**Key commits:**
- `[hash]` - [message]

**Files changed (for git diff):**
- `path/to/file.ts`

### UI Changes (if applicable)
| Change | Description |
|--------|-------------|
| [Component] | [What it looks like now] |

### How to Test
1. [Step 1]
2. [Step 2]
3. [Expected result]

### Findings Reported
**⚠️ REQUIRED:** If you noticed ANY issues outside your scope, you MUST have written them to `docs/agent-output/findings/`. List them here:

- [ ] I wrote findings files for all issues I noticed (or there were none)

| Finding ID | File Written | Title |
|------------|--------------|-------|
| F-DEV-TKT-XXX-1 | `docs/agent-output/findings/F-DEV-TKT-XXX-*.json` | [title] |

If no findings: "None - no issues noticed outside scope"

**❌ WRONG:** Mentioning issues only in "Notes" section below
**✅ CORRECT:** Writing to `docs/agent-output/findings/` AND listing here

### Notes
[Anything unusual, decisions made, edge cases handled]
```

The PM Dashboard automatically aggregates all dev agent completions.

---

## When You Get BLOCKED

If you're unsure about ANYTHING — **STOP and report it.**

### Step 1: Commit All Work-In-Progress

**Before writing the blocker file**, commit any uncommitted work so it's not lost:

```bash
# Stage all changes
git add .

# Commit with WIP prefix
git commit -m "WIP TKT-XXX: [what you were working on] - BLOCKED"
```

> **Note:** Git push is handled automatically by the failsafe script when you finish.

This ensures the next agent (or you in a continuation) can see exactly where you stopped.

### Step 2: Write Blocker to Per-Agent File

**File path:** `docs/agent-output/blocked/BLOCKED-TKT-XXX-[TIMESTAMP].json`

Example: `docs/agent-output/blocked/BLOCKED-TKT-001-2025-12-04T1430.json`

Write a JSON file with this structure:

```json
{
  "id": "BLOCKED-TKT-XXX-[number]",
  "type": "blocker",
  "source": "dev-agent-TKT-XXX",
  "severity": "critical",
  "title": "[Short question title]",
  "feature": "[Feature from your ticket]",
  "category": "clarification",
  "status": "pending",
  "found_at": "[ISO date]",
  
  "issue": "[Your specific question - be precise]",
  
  "options": [
    {
      "id": 1,
      "label": "[Option 1 name] — [Description + tradeoffs]",
      "recommended": false
    },
    {
      "id": 2,
      "label": "[Option 2 name] — [Description + tradeoffs]",
      "recommended": true
    },
    {
      "id": 3,
      "label": "[Option 3 name] — [Description + tradeoffs]",
      "recommended": false
    }
  ],
  
  "recommendation": "Option [N] because [1 sentence reason]",
  
  "blocker_context": {
    "ticket_id": "TKT-XXX",
    "ticket_version": 1,
    "branch": "agent/tkt-xxx-[description]",
    "progress": {
      "commits": [
        "[hash] - [message]",
        "[hash] - [message]"
      ],
      "done": [
        "[Completed item 1]",
        "[Completed item 2]"
      ],
      "remaining": [
        "[Blocked item] ← YOU ARE HERE",
        "[Not started item]",
        "[Not started item]"
      ],
      "stopped_at": {
        "file": "path/to/file.ts",
        "line": 45,
        "context": "[What you were about to do]"
      },
      "notes_for_next_agent": "[Anything the next agent needs to know]"
    }
  }
}
```

### Example Blocker:

```json
{
  "id": "BLOCKED-TKT-001-1",
  "type": "blocker",
  "source": "dev-agent-TKT-001",
  "severity": "critical",
  "title": "Should password masking use regex or DOM attributes?",
  "feature": "Co-Browse (Viewer + Sender)",
  "category": "clarification",
  "status": "pending",
  "found_at": "2025-12-04T10:30:00Z",
  
  "issue": "The ticket says to mask 'sensitive fields' but doesn't specify the detection method. Should I use regex patterns to detect field names like 'password' and 'ssn', or rely on DOM attributes like type='password' and autocomplete='cc-number'?",
  
  "options": [
    {
      "id": 1,
      "label": "Regex pattern matching — Match field names/IDs containing 'password', 'ssn', 'credit'. Catches more but may have false positives.",
      "recommended": false
    },
    {
      "id": 2,
      "label": "DOM attributes only — Use type='password', autocomplete='cc-*', data-sensitive='true'. Semantic and reliable but may miss custom fields.",
      "recommended": true
    },
    {
      "id": 3,
      "label": "Both approaches — Combine regex + DOM attributes. Most comprehensive but more complex.",
      "recommended": false
    }
  ],
  
  "recommendation": "Option 2 because DOM attributes are semantic, standard, and won't have false positives. Custom fields can opt-in with data-sensitive attribute.",
  
  "blocker_context": {
    "ticket_id": "TKT-001",
    "ticket_version": 1,
    "branch": "agent/tkt-001-cobrowse-sanitization",
    "progress": {
      "commits": [
        "a1b2c3d - TKT-001: Add SensitiveFieldMasker utility class",
        "e4f5g6h - TKT-001: Create test file structure"
      ],
      "done": [
        "Created masker class skeleton",
        "Set up test file"
      ],
      "remaining": [
        "Implementing detection logic ← BLOCKED HERE",
        "Integration with domSerializer",
        "Final testing"
      ],
      "stopped_at": {
        "file": "apps/widget/src/features/cobrowse/SensitiveFieldMasker.ts",
        "line": 45,
        "context": "About to implement isSensitiveField() method"
      },
      "notes_for_next_agent": "I created a class-based approach to keep masking logic separate from serialization. The test file has placeholder tests ready."
    }
  }
}
```

**⚠️ CRITICAL:** The `blocker_context` section is REQUIRED. Without it, the next agent can't continue your work.

**Then STOP.** Don't continue until you receive a continuation ticket with the answer.

---

## Environmental Blockers (Different from Clarification Blockers)

Use this format when you're blocked by **technical issues**, not missing information:

- `pnpm install` fails and won't resolve
- Type/lint/build error you can't fix after 40 minutes
- Pre-existing bug in code you didn't modify
- Missing environment variables or secrets
- External service is down

**File path:** `docs/agent-output/blocked/ENV-TKT-XXX-[TIMESTAMP].json`

```json
{
  "id": "ENV-TKT-XXX-[number]",
  "type": "blocker",
  "category": "environment",
  "source": "dev-agent-TKT-XXX",
  "severity": "critical",
  "title": "[Short description of technical issue]",
  "feature": "[Feature from your ticket]",
  "status": "pending",
  "found_at": "[ISO date]",
  
  "issue": "[Detailed description of what's failing]",
  
  "what_i_tried": [
    "[Approach 1 and why it didn't work]",
    "[Approach 2 and why it didn't work]",
    "[Approach 3 and why it didn't work]"
  ],
  
  "error_details": {
    "error_message": "[Exact error message]",
    "file": "[File where error occurs]",
    "line": "[Line number if applicable]",
    "stack_trace": "[First few lines of stack trace if available]"
  },
  
  "suggested_resolution": "[What you think needs to happen to fix this]",
  
  "blocker_context": {
    "ticket_id": "TKT-XXX",
    "branch": "agent/TKT-XXX-[description]",
    "time_spent": "[How long you spent trying to fix]",
    "progress": {
      "done": ["[What you completed before hitting this]"],
      "blocked_on": "[Specific step that's blocked]"
    }
  }
}
```

**What happens next:**
1. PM sees your environmental blocker
2. PM presents to human with your suggested resolution
3. Human either:
   - Fixes the underlying issue (e.g., fixes pre-existing type error, adds env var)
   - Updates your ticket with specific fix instructions
   - Cancels the ticket if issue is too complex
4. PM creates continuation ticket with resolution
5. You (or another agent) continues from where you left off

---

## Scope Rules

### ✅ DO:
- Only modify files listed in ticket spec
- Follow existing patterns **exactly**
- Make minimal changes needed
- Check each risk before completing

### ❌ DON'T:
- Add features not in the spec
- Refactor code outside your scope
- "Improve" things you notice along the way
- Add configuration options unless requested
- Create abstractions for one-time use

### If You Notice Something Wrong (But It's Not In Your Scope):

**⚠️ MANDATORY: You MUST report findings. Do NOT just mention them in your completion report notes.**

1. **Do NOT fix it yourself**
2. **IMMEDIATELY report the finding** (before you forget)
3. Continue with your ticket

**Common things that require findings:**
- Pre-existing type errors in files you didn't modify
- Bugs you noticed while reading code
- Security issues outside your scope
- Missing error handling in related code
- Broken tests not related to your ticket

**How to report findings (NOT blockers):**

**Option A: Using CLI (Preferred)**
```bash
./scripts/agent-cli.sh add-finding \
  --title "Pre-existing type error in utils.ts" \
  --severity high \
  --description "Type error on line 42: 'string' is not assignable to 'number'" \
  --file apps/dashboard/src/utils.ts \
  --feature "Auth"
```

**Option B: Manual JSON File (Fallback)**

**File path:** `docs/agent-output/findings/F-DEV-TKT-XXX-[TIMESTAMP].json`

Example: `docs/agent-output/findings/F-DEV-SEC-001-2025-12-05T1230.json`

**⚠️ You MUST report findings. Mentioning issues in completion report "Notes" is NOT sufficient.**

Write a JSON file with this structure:

```json
{
  "id": "F-DEV-[ticket-id]-[number]",
  "source": "dev-agent-[your-ticket-id]",
  "title": "[Short descriptive title]",
  "category": "bug|security|ux|performance|docs",
  "severity": "critical|high|medium|low",
  "file": "path/to/file.ts",
  "line": 42,
  "issue": "What's wrong and why it matters",
  "suggestion": "How to fix it",
  "status": "pending",
  "found_at": "[ISO date]"
}
```

The PM Dashboard automatically aggregates all findings from per-agent files and the database.

---

## Continuation Tickets

If you're working on a **continuation ticket** (e.g., `dev-agent-TKT-001-v2.md`):

### What's Different:
1. Branch already exists with previous work
2. Spec includes blocker resolution (human's decision)
3. Progress checkpoint shows where to resume

### Your Process:
1. Read the **entire** continuation spec
2. Check the **"Blocker Resolution"** section for the answer
3. Check the **"Where You Left Off"** section
4. Checkout existing branch (don't create new)
5. Review previous commits and code
6. **Write a NEW start file** (see 3.4) — yes, even for continuations
7. Continue from checkpoint
8. Don't redo completed work

```bash
# For continuation tickets:
git fetch origin
git checkout [existing-branch]
git pull origin [existing-branch]

# Review what's been done
git log --oneline -10

# THEN: Write new start file before continuing work
# (Previous agent's start file was archived when they blocked)
```

### If Branch Was Deleted or Has Conflicts

**Branch deleted:** Report as environmental blocker — PM needs to investigate what happened.

**Merge conflicts with main:** 
```bash
git merge origin/main
# If conflicts are simple, resolve them
# If conflicts are complex (>10 files or unclear), report as environmental blocker
```

---

## Quality Standards

### Code Quality
- [ ] Follows existing patterns in the codebase
- [ ] No unnecessary changes to unrelated code
- [ ] Clear variable and function names
- [ ] Comments explain "why", not "what"
- [ ] No console.logs left (except intentional)

### Type Safety
- [ ] No `any` types unless absolutely necessary
- [ ] Props interfaces defined for components
- [ ] API responses properly typed

### Error Handling
- [ ] Errors caught and handled appropriately
- [ ] User-facing errors are friendly
- [ ] Edge cases considered

---

## ⚠️ Critical Rules

1. **Validate the ticket first** — If anything is missing, BLOCKED before coding
2. **Read the full spec** — Don't skim
3. **Stay in scope** — Only modify listed files
4. **Follow patterns** — Copy existing code style exactly
5. **Check everything** — typecheck, lint, build before completing
6. **Report blockers immediately** — Don't spin; STOP and write blocker to `docs/agent-output/blocked/`
7. **Document progress** — Especially when blocked
8. **Don't over-engineer** — Simple solutions for simple problems
9. **Verify each criterion** — Before marking complete
10. **Write findings to FILE** — If you notice issues outside scope, write to `docs/agent-output/findings/` (NOT just completion report notes!)

