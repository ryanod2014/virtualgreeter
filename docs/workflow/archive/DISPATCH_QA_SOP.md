# Dispatch Agent SOP - QA Review Pipeline

> **Purpose:** Manage the flow of tickets from "needs review" through QA testing to either main merge or blocked status.
> **One-liner to launch:** `You are the Dispatch Agent. Read docs/workflow/DISPATCH_QA_SOP.md then manage the QA review pipeline.`

---

## 🔄 Dispatch Cycle for QA Reviews

Execute these steps **in order** every dispatch session:

---

### Phase 1: Identify Tickets Ready for QA Review

#### 1.1 Find Tickets in "needs_review" Status

In the PM workflow, dev agents complete tickets and they move to a review state. Check for:

```bash
# Check for completed dev work awaiting review
ls docs/agent-output/completions/

# Check dev-status.json for completed items
cat docs/data/dev-status.json | jq '.completed'

# Look for branches that haven't been merged
git branch -a | grep agent/
```

**Criteria for QA-ready ticket:**
- Dev agent has completed and written completion report
- Branch exists and has commits
- Not yet merged to main
- No blocker file exists for this ticket

#### 1.2 Check Which Branches Need Review

```bash
# List all agent branches not in main
git log main..agent/TKT-XXX --oneline

# If commits exist, branch is ready for review
```

---

### Phase 2: Create QA Review Prompts

For each ticket ready for review:

**File:** `docs/prompts/active/qa-review-[TICKET-ID].md`

Use template: `docs/workflow/templates/qa-review-agent.md`

```bash
# Copy template
cp docs/workflow/templates/qa-review-agent.md docs/prompts/active/qa-review-TKT-XXX.md

# Fill in ticket details from tickets.json
cat docs/data/tickets.json | jq '.tickets[] | select(.id == "TKT-XXX")'
```

**Key sections to fill:**
1. Ticket ID, title, branch
2. Issue and fix_required (from ticket)
3. All acceptance_criteria
4. QA notes
5. Whether browser testing is needed

---

### Phase 3: Launch QA Review Agents

```markdown
## 🧪 QA Review Sprint - Launch Commands

**Instructions:** Run these in Claude Code sessions.

### Ready for Review
1. `You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute: docs/prompts/active/qa-review-TKT-001.md`
2. `You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute: docs/prompts/active/qa-review-TKT-006.md`

**Total: [N] QA agents ready to launch**

### Notes
- QA agents can run in parallel (no file conflicts since they're read-only)
- Each QA session takes 30-120 minutes depending on ticket complexity
```

---

### Phase 4: Process QA Results

#### 4.1 Check for Completed QA Reports

```bash
# Check for QA results
ls docs/agent-output/qa-results/

# Passed tickets
ls docs/agent-output/qa-results/QA-*-PASSED-*.md

# Failed tickets
ls docs/agent-output/qa-results/QA-*-FAILED-*.md
ls docs/agent-output/blocked/QA-*-FAILED-*.json
```

#### 4.2 Handle PASSED Tickets

For each passed ticket:

1. **Queue for Human Merge** (or auto-merge if permitted)

```bash
# Add to merge queue
echo "## TKT-XXX - Ready for Merge

**Branch:** agent/TKT-XXX-description
**QA Report:** docs/agent-output/qa-results/QA-TKT-XXX-PASSED-*.md
**Merge Command:**
\`\`\`bash
git checkout main
git pull origin main
git merge --squash agent/TKT-XXX-description
git commit -m \"feat(scope): TKT-XXX - Title\"
git push origin main
\`\`\`
" >> docs/MERGE_QUEUE.md
```

2. **Update Ticket Status**

```bash
# Update tickets.json: status "needs_review" → "done"
```

3. **Archive Files**

```bash
# Archive QA prompt
mv docs/prompts/active/qa-review-TKT-XXX.md docs/prompts/archive/

# Archive completion report
mv docs/agent-output/completions/TKT-XXX-*.md docs/agent-output/archive/
```

#### 4.3 Handle FAILED Tickets

For each failed ticket:

1. **Read the Blocker Report**

```bash
cat docs/agent-output/blocked/QA-TKT-XXX-FAILED-*.json
```

2. **Create Continuation Ticket**

Based on the QA failure, create a continuation prompt for the dev agent:

**File:** `docs/prompts/active/dev-agent-TKT-XXX-v[N+1].md`

```markdown
# Dev Agent Continuation: TKT-XXX-v[N+1]

> **Type:** QA Failure Fix
> **Original Ticket:** TKT-XXX - [Title]
> **Branch:** `agent/TKT-XXX-[description]` (ALREADY EXISTS - DO NOT CREATE NEW)

---

## 🔴 QA Failure

**QA Report:** `docs/agent-output/qa-results/QA-TKT-XXX-FAILED-*.md`

### What Failed

[Copy from QA blocker report]

### Expected Behavior

[Copy from QA report - what should have happened]

### Actual Behavior

[Copy from QA report - what actually happened]

### Evidence

[Copy error messages, console output, screenshots]

---

## 📍 Your Task

1. Pull the existing branch: `git checkout agent/TKT-XXX-description && git pull`
2. Fix the issue(s) identified by QA
3. Ensure all acceptance criteria pass
4. Re-run all dev checks
5. Push fixes

---

## ✅ Acceptance Criteria (unchanged)

[Copy original acceptance criteria]

---

## Dev Checks (MUST pass before submitting)

- [ ] pnpm typecheck passes
- [ ] pnpm lint passes
- [ ] pnpm build passes
- [ ] pnpm test passes
- [ ] [Original manual verification]
- [ ] **NEW:** [Specific check for the failure that was found]
```

3. **Archive the Failed QA Files**

```bash
# Move blocker to archive after creating continuation
mv docs/agent-output/blocked/QA-TKT-XXX-FAILED-*.json docs/agent-output/archive/
```

4. **Update Ticket Status**

```bash
# Update tickets.json: status stays "needs_review" but add attempt count
# Or set to "blocked" temporarily
```

---

### Phase 5: Monitor Active QA Agents

```bash
# Check for started QA agents
ls docs/agent-output/started/QA-*

# Check for stalled agents (started > 2 hours ago with no result)
find docs/agent-output/started/QA-* -mmin +120

# If stalled, investigate or timeout
```

---

## QA Review Flow Diagram

```
Tickets.json (ready)
        │
        ▼
Dev Agent Completes
        │
        ▼
Completion in docs/agent-output/completions/
        │
        ▼
┌───────────────────────┐
│ Dispatch Creates      │
│ QA Review Prompt      │
└───────────────────────┘
        │
        ▼
QA Review Agent Launched
        │
        ├── Build Verification (pnpm typecheck/lint/build/test)
        │         │
        │         └── FAIL → BLOCKED → Continuation Ticket
        │
        ├── Acceptance Criteria Check
        │         │
        │         └── FAIL → BLOCKED → Continuation Ticket
        │
        ├── Browser Tests (if applicable)
        │         │
        │         └── FAIL → BLOCKED → Continuation Ticket
        │
        ▼
   All Pass?
        │
    ┌───┴───┐
    │       │
   YES     NO
    │       │
    ▼       ▼
 PASSED  BLOCKED
    │       │
    ▼       ▼
 Merge    Create
 Queue    Continuation
    │       │
    ▼       ▼
  MAIN    Dev Agent
           Fixes
```

---

## QA Agent Parallel Execution

QA Review agents are **read-only** on the codebase (they don't modify source files), so they can all run in parallel:

```markdown
## Parallel QA Sessions

- QA-TKT-001: Testing cobrowse sanitization (branch: agent/TKT-001-*)
- QA-TKT-006: Testing middleware redirect (branch: agent/TKT-006-*)
- QA-TKT-019: Testing RNA sync (branch: agent/TKT-019-*)

All can run simultaneously - no file conflicts.
```

---

## Troubleshooting

**Q: QA agent can't run browser tests (Playwright not configured)**
A: Ensure Playwright MCP is set up per the QA_REVIEW_AGENT_SOP.md prerequisites.

**Q: QA agent passed but branch can't merge (conflicts)**
A: Create continuation ticket to resolve merge conflicts.

**Q: QA agent taking too long**
A: Check if agent is stuck. Set 2-hour timeout for investigation.

**Q: Same ticket failing QA multiple times**
A: After 3 QA failures, escalate to human review.

**Q: QA agent says "can't test this"**
A: Some features may need human QA. Document partial coverage and flag for human.

