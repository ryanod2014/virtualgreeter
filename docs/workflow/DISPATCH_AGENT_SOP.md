# Dispatch Agent SOP

> **Purpose:** Orchestrate the flow between blockers, findings, decisions, and tickets.
> **One-liner to launch:** `You are a Dispatch Agent. Read docs/workflow/DISPATCH_AGENT_SOP.md then execute.`

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

| Prefix | Type | Description |
|--------|------|-------------|
| `CI-TKT-*` | CI Failure | Tests failed on agent branch |
| `BLOCKED-TKT-*` | Clarification | Agent has a question |
| `ENV-TKT-*` | Environment | Infra/credentials issue |

### Step 1.2: Route Each Blocker

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

2. Update ticket in `tickets.json`: set `status: "in_progress"`
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

### Blockers Processed
| Blocker | Action | Result |
|---------|--------|--------|
| CI-TKT-006 | Auto-continuation | Created TKT-006-v2 |
| BLOCKED-TKT-063 | Routed to inbox | Awaiting human decision |

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
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
      ┌──────────┐    ┌──────────┐    ┌──────────┐
      │ CI-TKT-* │    │BLOCKED-* │    │ ENV-TKT-*│
      └────┬─────┘    └────┬─────┘    └────┬─────┘
           │               │               │
           ▼               │               │
    ┌──────────────┐       │               │
    │ Compare to   │       │               │
    │ ticket scope │       │               │
    └──────┬───────┘       │               │
           │               │               │
     ┌─────┴─────┐         │               │
     ▼           ▼         │               │
┌─────────┐ ┌─────────┐    │               │
│ Outside │ │ Inside  │    │               │
│ scope   │ │ scope   │    │               │
└────┬────┘ └────┬────┘    │               │
     │           │         │               │
     ▼           ▼         ▼               ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ AUTO:    │ │ AUTO:    │ │ INBOX:   │ │ INBOX:   │
│ Create   │ │ "Fix     │ │ Human    │ │ Human    │
│ fix tkt  │ │ tests"   │ │ decision │ │ needed   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

---

## Checklist Before Finishing

- [ ] All blockers in `blocked/` folder processed
- [ ] CI blockers: continuation tickets created OR routed to inbox
- [ ] Clarification blockers: decision threads created
- [ ] All questions in threads answered
- [ ] No duplicate tickets created
- [ ] `decisions.json` threads marked resolved where appropriate
- [ ] `findings.json` statuses updated (ticketed/skipped)
- [ ] `tickets.json` updated with new tickets
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

