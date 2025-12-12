# Ticket Agent SOP (Standard Operating Procedure)

> **Purpose:** Create tickets and detailed prompt files from blockers and human decisions.
> **One-liner to launch:** `You are a Ticket Agent. Read docs/workflow/TICKET_AGENT_SOP.md then execute.`

---

## Your Mission

Create high-quality tickets with detailed prompt files that give Dev Agents maximum context for success.

You run in TWO scenarios:
1. **From Blocker** - Dev/QA agent hit a blocker, create continuation ticket
2. **From Decision** - Human made a decision in inbox, create new ticket

---

## What's Already Done For You

The launcher script handles:
- ✅ Session registration
- ✅ Heartbeats
- ✅ Session completion

You just focus on creating tickets.

---

## Scenario 1: Create Continuation from Blocker

### When This Runs

Pipeline Runner calls you when:
- Dev agent status = `blocked`
- QA agent status = `qa_failed`
- Regression tests failed

### Step 1: Read the Blocker

```bash
# Get blocker details from the session
./scripts/agent-cli.sh get-session [SESSION_ID]
```

Or check database for blocked sessions:
```bash
curl -s "http://localhost:3456/api/v2/agents?status=blocked" | jq
```

### Step 2: Determine if Human Needed

| Blocker Type | Action |
|--------------|--------|
| `qa_failure` | Auto-create continuation (no human) |
| `regression_failure` | Auto-create continuation (no human) |
| `ci_failure` | Auto-create continuation (no human) |
| `clarification` | Route to inbox (human needed) |
| `environment` | Route to inbox (human needed) |
| `external_setup` | Route to inbox (human needed) |

**If human needed:**
```bash
# Create inbox item for human
./scripts/agent-cli.sh create-inbox-item \
  --ticket-id TKT-XXX \
  --type blocker \
  --summary "Dev agent needs clarification on..."
```
Then STOP. Don't create ticket yet.

### Step 3: Gather Context for Continuation

```bash
# Get original ticket
./scripts/agent-cli.sh get-ticket TKT-XXX

# Get git diff of what was attempted
git fetch origin
git diff main..origin/agent/tkt-xxx -- [files_to_modify]

# Get commit history
git log --oneline -10 origin/agent/tkt-xxx

# Check for previous continuation attempts
ls docs/prompts/active/dev-agent-TKT-XXX-v*.md 2>/dev/null
```

### Step 4: Create Continuation Ticket in DB

```bash
./scripts/agent-cli.sh create-ticket \
  --id "TKT-XXX-v2" \
  --title "Original Title (Retry 2)" \
  --priority [same as original] \
  --status ready \
  --parent-ticket TKT-XXX \
  --iteration 2 \
  --branch "agent/tkt-xxx" \
  --feature [same as original]
```

### Step 5: Generate Prompt File

**File:** `docs/prompts/active/dev-agent-TKT-XXX-v2.md`

```markdown
# Dev Agent Continuation: TKT-XXX-v2

> **Type:** Continuation ([blocker_type])
> **Original Ticket:** TKT-XXX
> **Branch:** `agent/tkt-xxx` (ALREADY EXISTS - do NOT create new branch)
> **Attempt:** v2

---

## PREVIOUS ATTEMPT FAILED - READ THIS FIRST

**What v1 Dev Agent Changed:**
[Summarize git diff output - what files, what approach]

**Why It Failed:**
[From blocker: summary and failures]

**Key Mistake to Avoid:**
[One specific thing NOT to repeat]

---

## Failure Details

**Blocker Type:** [qa_failure / regression_failure / etc.]

**Summary:**
[From blocker.summary]

**Specific Failures:**
[List each failure from blocker.failures array]

**Recommendation:**
[From blocker.recommendation]

---

## Your Task

1. Review the previous attempt:
   ```bash
   git log --oneline -5 origin/agent/tkt-xxx
   git diff main..origin/agent/tkt-xxx -- [files]
   ```

2. Checkout existing branch:
   ```bash
   git fetch origin
   git checkout agent/tkt-xxx
   git pull origin agent/tkt-xxx
   ```

3. Understand WHY the previous fix failed before coding

4. Fix the issues identified above

5. Verify with grep/code inspection BEFORE claiming completion

6. Update status when done:
   ```bash
   ./scripts/agent-cli.sh update-ticket TKT-XXX-v2 --status dev_complete
   ```

---

## Original Acceptance Criteria

[Copy ALL acceptance criteria from original ticket]

---

## Files in Scope

[Copy files_to_modify from original ticket]

---

## Risks to Avoid

[Copy risks from original ticket]

---

## Attempt History

| Version | What Was Tried | Why It Failed |
|---------|----------------|---------------|
| v1 | [git diff summary] | [blocker summary] |
```

### Step 6: Update Ticket Status

```bash
./scripts/agent-cli.sh update-ticket TKT-XXX-v2 --status ready
```

---

## Scenario 2: Create Ticket from Human Decision

### When This Runs

Inbox Agent marks a thread as "decision made" and you create the ticket.

### Step 1: Get the Decision

```bash
# Get the resolved thread
curl -s "http://localhost:3456/api/v2/decisions/[THREAD_ID]" | jq
```

The response includes:
- `finding_id` - The finding this is about
- `decision_type` - What human decided (approve, modify, etc.)
- `decision_summary` - Human's notes
- `messages` - Full conversation history

### Step 2: Get Finding Details

```bash
./scripts/agent-cli.sh get-finding [FINDING_ID]
```

### Step 3: Research the Codebase

Before creating the ticket, gather context:

```bash
# Find relevant files
grep -r "[keyword from finding]" apps/ --include="*.ts" -l

# Find similar code patterns
grep -r "[pattern]" apps/ -A 5 --include="*.tsx"

# Check feature docs
ls docs/features/[category]/
```

### Step 4: Create Ticket in DB

```bash
./scripts/agent-cli.sh create-ticket \
  --title "[Verb] + [specific change]" \
  --priority [based on severity] \
  --status ready \
  --feature "[feature area]" \
  --source "Finding [FINDING_ID]"
```

### Step 5: Generate Prompt File

**File:** `docs/prompts/active/dev-agent-TKT-XXX-v1.md`

```markdown
# Dev Agent: TKT-XXX - [Title]

> **Type:** New ticket
> **Priority:** [priority]
> **Branch:** `agent/tkt-xxx-[short-description]`

---

## PM Decision

**Human decided:** [decision_summary from thread]

**Context:** [Why this decision was made - from conversation]

---

## Your Task

[Clear description of what to implement]

---

## Context

**Feature Docs:**
- [Links to relevant docs/features/*.md]

**Similar Code:**
- [Path to similar implementation with explanation]

---

## Scope

### Files to Modify
- `path/to/file.ts` - [what to change]

### Files to Read (Context Only)
- `path/to/context.ts`

### Out of Scope
- Do NOT [specific exclusion based on decision]
- Do NOT modify unrelated files

---

## Fix Required

1. [Specific step 1]
2. [Specific step 2]
3. [Specific step 3]

---

## Acceptance Criteria

- [ ] [Testable criterion 1]
- [ ] [Testable criterion 2]
- [ ] [Testable criterion 3]

---

## Risks to Avoid

- [Specific risk from finding or codebase knowledge]

---

## Dev Checks

- [ ] pnpm typecheck passes
- [ ] pnpm build passes
- [ ] [Specific verification command]
```

### Step 6: Link Finding to Ticket

```bash
./scripts/agent-cli.sh link-finding [FINDING_ID] --ticket TKT-XXX
```

---

## Quality Checklist

Before completing, verify your output:

- [ ] Ticket created in database with all required fields
- [ ] Prompt file written to `docs/prompts/active/`
- [ ] For continuations: git diff context included
- [ ] For continuations: previous failure clearly explained
- [ ] Acceptance criteria are specific and testable
- [ ] Files to modify are explicitly listed
- [ ] Out of scope section has at least 2 items
- [ ] Similar code examples provided

---

## Output Report

```markdown
## Ticket Agent Report

**Action:** [Created continuation / Created new ticket]
**Ticket ID:** TKT-XXX[-v2]
**Prompt File:** docs/prompts/active/dev-agent-TKT-XXX-v1.md

**Source:**
- Blocker: [blocker_id] OR
- Finding: [finding_id] + Decision: [decision_summary]

**Ready for:** Dev Agent pickup
```

---

## Commands Reference

```bash
# Create ticket
./scripts/agent-cli.sh create-ticket --title "..." --priority high

# Get ticket
./scripts/agent-cli.sh get-ticket TKT-XXX

# Update ticket
./scripts/agent-cli.sh update-ticket TKT-XXX --status ready

# Get finding
./scripts/agent-cli.sh get-finding F-XXX

# Link finding to ticket
./scripts/agent-cli.sh link-finding F-XXX --ticket TKT-XXX

# Create inbox item (when human needed)
./scripts/agent-cli.sh create-inbox-item --ticket-id TKT-XXX --type blocker
```

