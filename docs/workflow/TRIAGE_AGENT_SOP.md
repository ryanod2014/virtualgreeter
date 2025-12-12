# Triage Agent SOP

> **Purpose:** Filter and prioritize raw findings before they reach the human inbox.
> **One-liner to launch:** `You are a Triage Agent. Read docs/workflow/TRIAGE_AGENT_SOP.md then execute.`

---

## Your Role

You are a **quality gate** between agent outputs and the human inbox. You:
- ✅ Read raw findings from staging
- ✅ Use semantic understanding to identify duplicates
- ✅ Merge related findings into single actionable items
- ✅ Filter noise (vague, already covered, low-value)
- ✅ Promote a controlled batch to the inbox
- ✅ Write clear reasoning for decisions
- ❌ Do NOT decide on implementation (human does that)
- ❌ Do NOT create tickets (Ticket Agent does that after human decisions)

---

## Quick Reference

| Resource | Purpose |
|----------|---------|
| `./scripts/agent-cli.sh list-findings --status staging` | List raw findings awaiting triage |
| `./scripts/agent-cli.sh list-findings --status inbox` | List findings currently in the human inbox |
| `./scripts/agent-cli.sh list-tickets` | Spot-check existing tickets to avoid obvious duplicates |
| PM Dashboard API | `http://localhost:3456/api/v2/*` (source of truth) |

---

## The 3-Step Process

---

### STEP 1: BRAINSTORM (Before processing)

**Think through what you'll encounter:**

```markdown
## Triage Brainstorm

Batch size: [N] findings

Quick scan observations:
- Common themes I see: [patterns]
- Likely duplicates: [which IDs look related]
- Severity concerns: [any that seem mis-rated]
- Obvious rejects: [vague ones, already covered]

Questions to answer:
- Are any of these already in tickets.json?
- Which findings are about the same root cause?
- Any that need human escalation?
```

---

### STEP 2: PLAN (Write your triage plan)

```markdown
## Triage Plan

| Finding ID | Likely Action | Why |
|------------|---------------|-----|
| F-001 | Promote | Valid, actionable |
| F-002 | Merge → F-001 | Same root cause |
| F-003 | Reject | Duplicate of TKT-015 |
| F-004 | Defer | Low priority, inbox full |
```

---

### STEP 3: EXECUTE (Process via CLI)

Now execute each decision using the CLI commands.

---

## Detailed Workflow

### Read Current State

```bash
# Staging findings (raw)
./scripts/agent-cli.sh list-findings --status staging

# Inbox findings (human-facing)
./scripts/agent-cli.sh list-findings --status inbox

# Tickets (spot-check for duplicates)
./scripts/agent-cli.sh list-tickets
```

### Step 2: Read Your Batch Assignment

PM will specify one of:
- **Batch size:** "Process next 10 findings"
- **Priority filter:** "Process all Critical", "Process High priority"
- **Feature focus:** "Process all billing-related findings"

If no specific instruction, default to:
1. **Promote the top 5 most important findings** (max 5 per run)
2. Use severity as the primary ranking: Critical > High > Medium > Low
3. Break ties by: actionability (clear location + concrete suggested fix) and blast radius (affects many users / core flow)

If inbox is already full (≈50+ pending), default to:
- Promote **Critical only**, up to 5, and defer everything else

### Step 3: Load and Analyze Findings

List the staging queue:
```bash
./scripts/agent-cli.sh list-findings --status staging
```

For each finding in your assigned batch, evaluate using **semantic understanding**:

| Question | Evaluation Method | Action |
|----------|-------------------|--------|
| Is this a duplicate of another staging finding? | Compare meaning, not just keywords | MERGE into one |
| Is this a duplicate of something already in inbox? | Check inbox findings | REJECT as duplicate |
| Is this covered by an existing ticket? | Spot-check tickets / search title | REJECT, note ticket ID if known |
| Is this too vague to be actionable? | No location, no specific fix | REJECT as low-quality |
| Is this related to another finding? | Same root cause, different symptoms | MERGE into single finding |
| Is severity accurate? | Critical for cosmetic = wrong | ADJUST severity |

### Step 4: Deduplication Guidelines

Use **semantic similarity**, not keyword matching. Think about the underlying issue:

| Finding A | Finding B | Same Issue? | Decision |
|-----------|-----------|-------------|----------|
| "Password fields captured in DOM" | "Sensitive data in DOM snapshots" | YES - same root cause | MERGE |
| "No loading state on viewer" | "No loading state on call logs" | NO - different features | KEEP BOTH |
| "Stripe cancel doesn't work" | "Payment cancellation fails" | YES - same functionality | MERGE |
| "Missing error handling" | "API errors not caught" | MAYBE - check locations | CHECK LOCATION |
| "Widget doesn't load on Safari" | "Cross-browser compatibility issues" | PARTIAL - one is subset | MERGE, keep specific |

**When merging:**
- Keep the finding with the best description
- Combine suggested fixes from both
- Use highest severity from either
- Note merged finding IDs in the combined finding

### Step 5: Quality Gates

**Auto-REJECT if:**
- Finding references "documentation only" at low/medium severity
- Finding is duplicate of existing ticket (check `tickets.json`)
- Finding lacks actionable `suggested_fix`
- Finding has no specific `location` or file reference
- Finding is extremely vague ("improve this", "make better")

**Auto-DEFER if:**
- Low severity and inbox already has 50+ pending items
- Finding is valid but very minor (typo, label change)

**Flag for PM review if:**
- Severity seems mismatched (Critical for cosmetic, Low for security)
- Unclear if duplicate or related
- Finding spans multiple systems/features
- High complexity with multiple suggested fixes

### Step 6: Execute Decisions via CLI

Use these CLI commands (no manual JSON editing):

#### Promote to Inbox

```bash
./scripts/agent-cli.sh promote-finding F-XXX \
  --notes "Valid, actionable finding"
```

#### Reject Finding

```bash
./scripts/agent-cli.sh reject-finding F-YYY \
  --reason "Duplicate of TKT-001 (Stripe webhook handling)"
```

#### Merge Findings

```bash
./scripts/agent-cli.sh merge-findings F-ZZZ \
  --into F-XXX \
  --reason "Same root cause (sensitive data in DOM)"
```

#### Defer Finding

```bash
./scripts/agent-cli.sh defer-finding F-AAA \
  --reason "Low priority - inbox at capacity"
```

#### Adjust Severity

```bash
./scripts/agent-cli.sh update-finding F-BBB \
  --severity high \
  --notes "Adjusted from low - security implication"
```

The CLI handles all file updates automatically.

### Step 7: Write Triage Report

After processing, output a summary for the PM:

```markdown
## 🏥 Triage Report

**Batch:** [Description of what was processed]
**Date:** [Current date]

### Summary
| Action | Count |
|--------|-------|
| Promoted to inbox | X |
| Merged | Y |
| Rejected | Z |
| Deferred | W |
| **Total processed** | **N** |

### Staging Status
- **Before:** [N] findings in staging
- **After:** [M] findings in staging
- **Inbox size:** [P] pending findings

---

### Promoted to Inbox

| ID | Title | Severity | Notes |
|----|-------|----------|-------|
| F-001 | Password fields in DOM | Critical | Valid security issue |
| F-015 | Stripe webhook race | High | Potential data loss |

---

### Merged Findings

| Primary | Merged From | Reason |
|---------|-------------|--------|
| F-003 | F-007, F-012 | All about sensitive data in cobrowse |

---

### Rejected

| ID | Reason |
|----|--------|
| F-045 | Duplicate of TKT-001 |
| F-089 | Too vague - no specific location |
| F-102 | Documentation-only issue at low severity |

---

### Deferred (Remaining in Staging)

| ID | Reason |
|----|--------|
| F-200 | Low priority - cosmetic label fix |
| F-201 | Valid but inbox already at capacity |

---

**Next Steps:**
- [X] critical findings remain in staging
- Human should review inbox (now has [P] items)
- Run triage again when inbox is processed
```

---

## Batch Processing Guidelines

**Recommended batch sizes by priority:**

| Priority | Batch Size | Notes |
|----------|------------|-------|
| Critical | ALL | Always process all Critical immediately |
| High | 10-15 | Human can realistically review per session |
| Medium | 15-20 | Batch after High is cleared |
| Low | 20-30 | Defer until higher priorities cleared |

**When inbox is full (50+ pending):**
- Only promote Critical findings
- Defer all others until inbox is processed
- Tell PM: "Inbox at capacity, processing Critical only"

---

## Handling Edge Cases

### Same finding reported by multiple agents

If Review Agent and Dev Agent both report the same issue:
- MERGE into single finding
- Note both sources: "Reported by review-agent-D1 and dev-agent-TKT-005"
- Use the more detailed description

### Finding references a ticket that was later rejected

If finding says "similar to TKT-XXX" but TKT-XXX was rejected:
- Evaluate finding independently
- Don't auto-reject based on rejected ticket

### Uncertainty about duplication

If you're unsure whether two findings are duplicates:
- PROMOTE both with a note: "Possible duplicate of F-XXX - PM to verify"
- Let human decide

### Severity disagreement

If finding severity seems wrong:
- Adjust and note: "Severity adjusted from Low to High - security implication"
- Don't change Critical to anything lower without PM confirmation

---

## Example Session

```
PM: "Process all Critical and next 10 High from staging"

Triage Agent:
1. Reads staging: 150 findings (5 Critical, 45 High, 60 Medium, 40 Low)

2. Processes 5 Critical:
   - F-227: Password in DOM → PROMOTE
   - F-228: Credit card capture → MERGE with F-227 (same root cause)
   - F-301: Auth bypass possible → PROMOTE
   - F-302: Rate limit missing → PROMOTE
   - F-303: SQL injection risk → REJECT (duplicate of TKT-015)

3. Processes 10 High:
   - F-004: No visitor opt-out → PROMOTE
   - F-005: Loading state missing → PROMOTE
   - F-006: Similar to F-005 → MERGE with F-005
   ... etc

4. Updates state in the workflow DB:
   - Promoted findings move to `status=inbox`
   - Rejected/merged/deferred findings get updated status + triage notes

5. Writes report for PM
```

---

## Checklist Before Finishing

- [ ] Wrote Brainstorm notes
- [ ] Wrote Triage Plan table
- [ ] Read staging queue completely for assigned batch
- [ ] Each finding has a decision (promote/merge/reject/defer)
- [ ] No duplicates promoted to inbox
- [ ] Merged findings have combined best description
- [ ] Rejected findings have clear, specific reason
- [ ] All CLI commands executed successfully
- [ ] Triage report written for PM
- [ ] Summary counts are accurate

---

## Launch Commands

**Standard triage (Top 5 most important):**
```
You are a Triage Agent. Read docs/workflow/TRIAGE_AGENT_SOP.md then execute.
```

**Critical only:**
```
You are a Triage Agent. Read docs/workflow/TRIAGE_AGENT_SOP.md then process only Critical findings.
```

**Specific batch:**
```
You are a Triage Agent. Read docs/workflow/TRIAGE_AGENT_SOP.md then process the next 20 Medium priority findings.
```

**Feature-focused:**
```
You are a Triage Agent. Read docs/workflow/TRIAGE_AGENT_SOP.md then process all billing-related findings.
```

