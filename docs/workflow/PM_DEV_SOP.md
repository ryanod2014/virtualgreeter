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
| `docs/agent-output/completions/` | Dev agent completion reports (auto-aggregated) |
| `docs/workflow/templates/ticket-schema.json` | Required ticket fields |
| `docs/workflow/templates/dev-ticket.md` | Ticket creation template |
| `docs/workflow/DEV_AGENT_SOP.md` | Dev agent instructions |

---

## PM Cycle Checklist

Execute these steps **in order** every PM session:

### Phase 1: Check Blocked Queue

Blockers are now stored in `docs/data/findings.json` with `type: "blocker"`.

```bash
# Check for blockers in findings.json
cat docs/data/findings.json | grep -A5 '"type": "blocker"'

# Or use the dashboard at http://localhost:3456
```

**For each blocked agent:**
1. Present blocker to human with the agent's options + recommendation
2. Wait for human decision
3. Create continuation ticket with decision
4. Move blocker to "Resolved" section

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
ls docs/agent-output/completions/  # Dev completion reports (auto-aggregated by dashboard)
```

**For each COMPLETE status:**
1. Move ticket to Review phase
2. Create review-agent prompt (or mark for human QA)
3. Extract any **Observations** → Add to triage queue

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

