# Dev Ticket Template

> **Purpose:** Template for creating dev tickets. PM must fill all required fields.
> **Schema:** `docs/workflow/templates/ticket-schema.json`

---

## Ticket Creation Checklist

Before marking a ticket as "ready", verify:

### Context
- [ ] `issue` explains what's wrong AND why it matters
- [ ] `feature_docs` links to relevant docs/features/*.md files
- [ ] `similar_code` lists 1-2 patterns for agent to follow

### Scope
- [ ] `files_to_modify` explicitly lists all files agent can touch
- [ ] `files_to_read` lists context files (optional)
- [ ] `out_of_scope` states what NOT to do (minimum 2 items)

### Work
- [ ] `fix_required` has specific implementation steps
- [ ] `acceptance_criteria` are all testable by agent (binary yes/no)
- [ ] `risks` list specific pitfalls (not vague)

### Verification
- [ ] `dev_checks` has typecheck + build + quick manual test
- [ ] `qa_notes` has any special context QA needs

### Size Check
- [ ] Ticket has ≤5 files to modify (if more, split it)
- [ ] Ticket has ≤6 acceptance criteria (if more, split it)
- [ ] Ticket doesn't span multiple systems (if so, split it)

---

## Template

```json
{
  "id": "TKT-XXX",
  "title": "",
  "priority": "critical | high | medium | low",
  "difficulty": "easy | medium | hard",
  "feature": "",
  "status": "ready",
  
  "issue": "What's wrong and why it matters",
  
  "feature_docs": [
    "docs/features/[category]/[feature].md"
  ],
  
  "similar_code": [
    "path/to/file.ts - what pattern to follow"
  ],
  
  "files_to_modify": [
    "explicit/paths/to/files.ts"
  ],
  
  "files_to_read": [
    "context/files.ts"
  ],
  
  "out_of_scope": [
    "Do NOT modify files outside listed scope",
    "Do NOT add features beyond the fix",
    "Do NOT refactor unrelated code"
  ],
  
  "fix_required": [
    "Step 1: ...",
    "Step 2: ..."
  ],
  
  "acceptance_criteria": [
    "Criterion 1 (testable)",
    "Criterion 2 (testable)"
  ],
  
  "risks": [
    "Risk 1: specific pitfall",
    "Risk 2: specific pitfall"
  ],
  
  "dev_checks": [
    "pnpm typecheck passes",
    "pnpm build passes",
    "Quick manual verification: ..."
  ],
  
  "qa_notes": "Any special context for QA agent"
}
```

---

## Finding Feature Docs

```bash
# List all feature docs
ls docs/features/

# Categories available:
# admin/, agent/, api/, auth/, billing/, feedback/, 
# monitoring/, platform/, stats/, superadmin/, visitor/
```

Match the ticket's feature to the appropriate doc folder.

---

## Finding Similar Code

```bash
# Search for relevant functions/patterns
grep -r "functionName" apps/ --include="*.ts" -l

# Find similar components in a feature
ls apps/dashboard/src/features/[feature-name]/

# Find similar patterns
grep -r "pattern" apps/ -A 5 --include="*.tsx"
```

Provide 1-2 examples with line numbers when possible.

---

## Writing Out of Scope

Always include at minimum:
1. "Do NOT modify files outside the listed scope"
2. "Do NOT add features beyond what's specified"

Common additions based on ticket type:
- UI tickets: "Do NOT change global styles or theme"
- API tickets: "Do NOT change response schema without spec update"
- DB tickets: "Do NOT modify existing migrations"
- Billing tickets: "Do NOT change Stripe configuration"

---

## Size Guidelines

| Difficulty | Files | Criteria | Scope |
|------------|-------|----------|-------|
| Easy | 1-2 | 2-3 | Single focused change |
| Medium | 2-4 | 3-5 | Related changes in one area |
| Hard | 4+ | 5+ | **Consider splitting** |

### When to Split

Split the ticket if:
- More than 5 files to modify
- More than 6 acceptance criteria
- Touches multiple systems (frontend + backend + database)
- Requires new infrastructure (scheduler, queue, migrations)
- Changes span multiple features

### How to Split

Break into logical chunks:
1. **By layer:** API ticket → Frontend ticket → Integration ticket
2. **By feature:** Core feature → Edge case handling → UI polish
3. **By system:** Stripe integration → Webhook handler → Database updates

Example:
```
TKT-004 (too big): "Complete Pause Subscription with Stripe Integration"
    ↓ Split into:
TKT-004a: "Implement Stripe Pause API Call"
TKT-004b: "Add Auto-Resume Scheduler Job"
TKT-004c: "Handle Pause/Resume Webhooks"
TKT-004d: "Widget + Agent Status for Paused Orgs"
```

---

## Common Mistakes

### ❌ Vague Acceptance Criteria
> "The feature works correctly"

### ✅ Testable Acceptance Criteria
> "Clicking 'Cancel' redirects to /dashboard within 2 seconds"

---

### ❌ Missing Out of Scope
> (nothing listed)

### ✅ Clear Boundaries
> "Do NOT add org-level toggle for this feature"
> "Do NOT modify the existing API response format"

---

### ❌ No Similar Code Reference
> (agent has to figure out patterns themselves)

### ✅ Pattern to Follow
> "See apps/dashboard/src/features/agents/AgentCard.tsx for similar component structure"

---

### ❌ Unverifiable Criteria
> "Copy reviewed by stakeholder"

### ✅ Agent-Verifiable
> "Modal displays exact text: 'Your data will be retained for 30 days'"

