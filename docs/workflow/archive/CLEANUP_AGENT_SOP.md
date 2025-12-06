# Cleanup Agent SOP

> **Purpose:** Clean up raw findings from other agents before they reach the human inbox.
> **One-liner to launch:** `You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then execute.`

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
- ❌ Do NOT create tickets (PM does that)

---

## Quick Reference

| File | Purpose |
|------|---------|
| `docs/data/findings-staging.json` | Raw findings from agents (unprocessed) |
| `docs/data/findings.json` | INBOX - cleaned findings for human review |
| `docs/data/findings-processed.json` | Audit trail of rejected/merged findings |
| `docs/data/tickets.json` | Existing tickets (check for duplicates) |

---

## Workflow

### Step 1: Read Current State

```bash
# Check staging queue size
cat docs/data/findings-staging.json | jq '.findings | length'

# Check current inbox size
cat docs/data/findings.json | jq '.findings | length'

# Check what's already been processed
cat docs/data/findings-processed.json | jq '.findings | length'

# Check existing tickets (to avoid duplicates)
cat docs/data/tickets.json | jq '.tickets | length'
```

### Step 2: Read Your Batch Assignment

PM will specify one of:
- **Batch size:** "Process next 10 findings"
- **Priority filter:** "Process all Critical", "Process High priority"
- **Feature focus:** "Process all billing-related findings"

If no specific instruction, default to:
1. ALL Critical findings first
2. Then next 10 High findings

### Step 3: Load and Analyze Findings

Read the staging queue:
```bash
cat docs/data/findings-staging.json
```

For each finding in your assigned batch, evaluate using **semantic understanding**:

| Question | Evaluation Method | Action |
|----------|-------------------|--------|
| Is this a duplicate of another staging finding? | Compare meaning, not just keywords | MERGE into one |
| Is this a duplicate of something already in inbox? | Check `findings.json` | REJECT as duplicate |
| Is this covered by an existing ticket? | Check `tickets.json` titles/issues | REJECT, note ticket ID |
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

### Step 6: Update Data Files

After analysis, update the JSON files:

#### 6.1 Promote findings to inbox

Add promoted findings to `docs/data/findings.json`:
```json
{
  "id": "F-XXX",
  "feature": "...",
  "title": "...",
  "severity": "high",
  "status": "pending",
  "cleanup_notes": "Promoted from staging - valid, actionable finding"
  // ... rest of finding fields
}
```

#### 6.2 Record processed findings

Add rejected/merged findings to `docs/data/findings-processed.json`:
```json
{
  "id": "F-YYY",
  "action": "rejected",
  "reason": "Duplicate of TKT-001 (Stripe webhook handling)",
  "processed_at": "2025-12-06T12:00:00Z",
  "original_finding": { /* full original finding */ }
}
```

Or for merged findings:
```json
{
  "id": "F-ZZZ",
  "action": "merged",
  "merged_into": "F-XXX",
  "reason": "Same root cause as F-XXX (sensitive data in DOM)",
  "processed_at": "2025-12-06T12:00:00Z",
  "original_finding": { /* full original finding */ }
}
```

#### 6.3 Remove from staging

Remove all processed findings from `docs/data/findings-staging.json`.

#### 6.4 Update summary

Update `docs/data/findings-summary.json` with new counts.

### Step 7: Write Cleanup Report

After processing, output a summary for the PM:

```markdown
## 🧹 Cleanup Report

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
- Run cleanup again when inbox is processed
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

Cleanup Agent:
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

4. Updates files:
   - findings.json: +12 findings
   - findings-processed.json: +3 (1 rejected, 2 merged)
   - findings-staging.json: -15 findings

5. Writes report for PM
```

---

## Checklist Before Finishing

- [ ] Read staging queue completely for assigned batch
- [ ] Each finding has a decision (promote/merge/reject/defer)
- [ ] No duplicates promoted to inbox
- [ ] Merged findings have combined best description
- [ ] Rejected findings have clear, specific reason
- [ ] `findings.json` updated with promoted findings
- [ ] `findings-staging.json` updated (processed items removed)
- [ ] `findings-processed.json` updated with rejected/merged
- [ ] Cleanup report written for PM
- [ ] Summary counts are accurate

---

## Launch Commands

**Standard cleanup (Critical + 10 High):**
```
You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then execute.
```

**Critical only:**
```
You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then process only Critical findings.
```

**Specific batch:**
```
You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then process the next 20 Medium priority findings.
```

**Feature-focused:**
```
You are a Cleanup Agent. Read docs/workflow/CLEANUP_AGENT_SOP.md then process all billing-related findings.
```

