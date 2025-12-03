# PM Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the PM Agent's workflow checklist. Execute this every time you run as PM.
>
> **One-liner to launch:** `You are the PM Agent. Read and execute docs/workflow/PM_SOP.md`

---

## 🔄 PM Cycle Checklist

Execute these steps **in order** every PM session:

### Phase 1: Status Collection

#### 1.1 Read Agent Completions
```bash
cat docs/agent-inbox/completions.md
```

Process all **unprocessed entries** (entries after the last `PM Processed` marker):

| Status | PM Action |
|--------|-----------|
| `STARTED` | Update `AGENT_TASKS.md` - mark ticket as "🔄 Running", add to FILE LOCKS |
| `COMPLETE` | Move to next phase (Review or QA), create next agent spec |
| `BLOCKED` | Triage blocker (see 1.2), create continuation ticket with answers |
| `NEEDS_REVIEW` | Create review agent spec |
| `APPROVED` | Move to next phase or mark ready to merge |
| `FAILED` | Create fix ticket, assign back to dev |

#### 1.2 Triage Blockers & Questions

For each `BLOCKED` entry with questions:

1. **Read the blocker details** in `docs/agent-inbox/completions.md`
2. **Check relevant docs** for answers:
   - `docs/features/` - Feature specifications
   - `TODO.md` - Product requirements
   - Previous strategy reports
3. **Provide recommendation with confidence:**

```markdown
### PM Recommendation for [TICKET-ID]
**Question:** [Agent's question]
**Recommendation:** [Your answer]
**Confidence:** HIGH / MEDIUM / LOW
**Reasoning:** [Why you recommend this]
**Action:** Awaiting human confirmation / Proceeding with recommendation
```

- **HIGH confidence:** Proceed and note in continuation ticket
- **MEDIUM/LOW confidence:** Add to `docs/agent-inbox/completions.md` under `## Awaiting Human Input` section

---

### Phase 2: Results Collection

#### 2.1 Strategy Agent Results
- Read any new strategy reports in `docs/strategy/`
- Extract new tickets and add to backlog
- Update `docs/strategy/INSIGHTS-LOG.md` with findings

#### 2.2 QA Agent Results
For each QA completion:

| Result | PM Action |
|--------|-----------|
| `APPROVED` | Mark ticket ready to merge |
| `FAILED` | Create new fix ticket for dev agent |

**If QA FAILED:**
```markdown
### [TICKET-ID]-fix
**Type:** Bug Fix (QA Regression)
**Original Ticket:** [TICKET-ID]
**Failure Report:** [Summary from QA]
**Branch:** [Same branch - agent should amend]
```

---

### Phase 3: Ticket Creation ⚠️ CRITICAL PHASE

**YOUR MAIN JOB: Create ticket specs for ALL available work (up to 15 parallel).**

#### 3.1 Scan the Backlog

Read `docs/AGENT_TASKS.md` and identify ALL tickets that:
- Need dev specs created
- Are ready for review (need review specs)
- Are approved and need QA specs
- Have blockers resolved (need continuation specs)

#### 3.2 Check File Locks

Before creating a ticket, verify its files aren't locked:
```bash
grep -A 20 "FILE LOCKS" docs/AGENT_TASKS.md
```

**Rule:** No two tickets can modify the same file simultaneously.
- If files are locked → Skip that ticket, note dependency
- If files are free → Create the ticket spec

#### 3.3 Create ALL Ticket Specs (Max 15)

**For EACH ticket in the backlog that can be worked on:**

1. **Read the ticket details** from `AGENT_TASKS.md` and `TODO.md`
2. **Read the template** from `docs/workflow/templates/`
3. **Create the spec file** in `docs/prompts/active/`
4. **Fill in ALL fields** - ticket ID, branch, files to modify, requirements, acceptance criteria

**Priority Order:**
1. Continuation tickets (devs/QA waiting on answers)
2. P0 tickets (ship blockers)
3. P1 tickets (high priority)
4. QA tickets for approved code
5. Review tickets for completed dev work
6. New dev tickets
7. Strategy tickets

**Ticket Types & Templates:**

| Type | Template | Output File |
|------|----------|-------------|
| Dev | `docs/workflow/templates/dev-agent.md` | `docs/prompts/active/dev-agent-[ID]-v[N].md` |
| Dev Continuation | `docs/workflow/templates/dev-continuation.md` | `docs/prompts/active/dev-agent-[ID]-v[N].md` |
| Review | `docs/workflow/templates/review-agent.md` | `docs/prompts/active/review-agent-[ID].md` |
| QA | `docs/workflow/templates/qa-agent.md` | `docs/prompts/active/qa-agent-[ID]-v[N].md` |
| Strategy | `docs/workflow/templates/strategy-agent.md` | `docs/prompts/active/strategy-agent-[FOCUS].md` |

#### 3.4 Gather Ticket Information

For each dev ticket, you need:
- **Ticket ID & Description** - from `AGENT_TASKS.md`
- **Branch name** - from `AGENT_TASKS.md` or create following pattern `fix/[TICKET-ID]-[short-name]`
- **Files to modify** - search codebase to identify relevant files
- **Requirements** - from `TODO.md` or feature docs
- **Acceptance criteria** - what "done" looks like

**Example: Creating a dev spec**
```bash
# 1. Check TODO.md for ticket details
grep -A 20 "FIX-001" TODO.md

# 2. Find relevant files
grep -r "reassignVisitors\|findBestAgent" apps/server/src --include="*.ts" -l

# 3. Read the template
cat docs/workflow/templates/dev-agent.md

# 4. Create the spec file with all fields filled in
# Write to: docs/prompts/active/dev-agent-FIX001-v1.md
```

#### 3.5 Version Numbering

- First ticket: `dev-agent-FIX001-v1.md`
- After blocker resolved: `dev-agent-FIX001-v2.md`
- After QA failure: `dev-agent-FIX001-v3.md`

---

### Phase 4: Update Task Board

Update `docs/AGENT_TASKS.md`:

1. **Pipeline Overview** - Update counts per phase
2. **AGENTS CURRENTLY RUNNING** - List active agents
3. **Ready to Launch** - List all specs created this cycle
4. **FILE LOCKS** - Add locks for tickets being created
5. **All Tickets Table** - Update statuses
6. **Quick Stats** - Update metrics

---

### Phase 5: Mark Completions Processed

Add to `docs/agent-inbox/completions.md`:

```markdown
---
### [DATE] - PM Cycle #[N] Processed
- Processed entries: [list ticket IDs]
- Created tickets: [list ALL new spec files created]
- Blockers triaged: [count]
- Human input needed: [count]
---
```

---

### Phase 6: Output All Launch Commands ⚠️ REQUIRED

**At the end of EVERY PM cycle, output the launch commands for ALL tickets ready to run.**

Format:

```markdown
## 🚀 Ready to Launch ([N] agents)

### Dev Agents
1. `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-[ID]-v[N].md`
2. `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-[ID]-v[N].md`
...

### Review Agents
1. `You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-[ID].md`
...

### QA Agents
1. `You are a QA Agent. Read docs/workflow/QA_AGENT_SOP.md then execute: docs/prompts/active/qa-agent-[ID]-v[N].md`
...

### Strategy Agents
1. `You are a Strategy Agent. Read docs/workflow/STRATEGY_AGENT_SOP.md with focus: [FOCUS]`
...
```

**Include ALL agents that can run in parallel (up to 15 total).**

---

## 📋 File Lock Management

### Adding Locks (when ticket starts)
```markdown
## 🔒 FILE LOCKS

| File | Locked By | Ticket |
|------|-----------|--------|
| apps/widget/src/Widget.tsx | Dev Agent | FIX-006 |
| apps/server/src/features/signaling/socket-handlers.ts | Dev Agent | FIX-007 |
```

### Removing Locks (when ticket completes)
Remove the row from the table.

### Conflict Resolution
If a new ticket would touch a locked file:
1. Check if the locking ticket is still active
2. If active: Queue the new ticket, note dependency
3. If stale (no activity 2+ hours): Investigate, possibly force-unlock

---

## 📊 Ticket Lifecycle

```
┌─────────────┐
│   BACKLOG   │
└──────┬──────┘
       │ PM creates dev spec
       ▼
┌─────────────┐
│  DEV AGENT  │──── BLOCKED ────► PM Triage ──► Continuation Ticket
└──────┬──────┘
       │ COMPLETE
       ▼
┌─────────────┐
│REVIEW AGENT │──── CHANGES_REQUESTED ──► Dev Continuation
└──────┬──────┘
       │ APPROVED
       ▼
┌─────────────┐
│  QA AGENT   │──── FAILED ──► Fix Ticket (back to Dev)
└──────┬──────┘
       │ APPROVED
       ▼
┌─────────────┐     ┌─────────────┐
│ HUMAN QA?   │────►│   MERGED    │
└─────────────┘     └─────────────┘
```

---

## 🎯 PM Decision Heuristics

### When to escalate to human:
- Product decisions (feature behavior, UX choices)
- Security decisions
- Breaking changes
- Anything with billing/payment implications
- Low confidence recommendations

### When to auto-proceed:
- Technical implementation details
- Bug fixes with clear expected behavior (from docs)
- Code style/patterns (follow existing codebase)
- Test coverage additions

---

## 📝 Output Artifacts

Each PM cycle MUST produce:
1. ✅ Updated `AGENT_TASKS.md`
2. ✅ New agent specs in `docs/prompts/active/` (for ALL available work)
3. ✅ Human QA items in `docs/human-qa-queue.md` (if any)
4. ✅ Process marker in `docs/agent-inbox/completions.md`
5. ✅ **Launch commands for ALL ready agents** (Phase 6)

---

## ⚠️ Critical Rules

1. **Create specs for ALL available work** (up to 15 parallel)
2. **Never create duplicate tickets** for the same work
3. **Always check file locks** before creating tickets
4. **Version continuation tickets** so agents have full context
5. **Escalate payment/security** decisions to human
6. **ALWAYS output launch commands** at the end of every cycle
