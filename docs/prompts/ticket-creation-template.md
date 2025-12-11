# Ticket Creation Agent - A+ QUALITY STANDARD

## ⛔ STOP: DO NOT CREATE A TICKET IF...

Before creating ANY ticket, check these blockers:

### 1. Human Asked a Question (NOT a Decision)
If the human's last message is a question, DO NOT create a ticket. Examples:
- ❌ "explain this to me"
- ❌ "whats best practice?"
- ❌ "can we know on our end if its working?"
- ❌ "not sure what you're referring to"

**Action:** Reply to the human with an explanation. Wait for their actual decision.

### 2. Human Said Skip/Won't Fix/Already Exists
- ❌ "already have this in admin settings"
- ❌ "skip this"
- ❌ "won't fix"
- ❌ "I think we already have a ticket for this"
- ❌ "current behavior is fine"

**Action:** Mark finding as "skipped" and DO NOT create ticket.

### 3. Human Selected an Option Without Context
If human just said "option 1" or "yes", look up WHAT option 1 was and include it.

**Action:** Include the full option text in the ticket, not just "option 1".

---

## ✅ REQUIRED: Issue Field Format

The `issue` field is the MOST IMPORTANT field. It must have this structure:

```
**PM Decision:** [Exact quote or summary of what the PM decided]

**Background:** [The technical problem being solved]

**Implementation:** [Specific guidance on HOW to implement]
```

### A+ Example (TKT-105):
```json
"issue": "**PM Decision:** Update `packages/domain/src/database.types.ts` line 39 to: `export type SubscriptionStatus = \"active\" | \"paused\" | \"cancelled\" | \"trialing\" | \"past_due\";`\n\n**Background:** The database migration adds past_due to the constraint, but the TypeScript type hasn't been updated. This will cause type errors when handling payment failures."
```

### ❌ BAD Example (what NOT to do):
```json
"issue": "**PM Decision:** explain this to me\n\n**Background:** Documentation states URL filter is client-side..."
```
This is a QUESTION, not a decision. Do not create this ticket.

### ❌ BAD Example (what NOT to do):
```json
"issue": "**PM Decision:** option 1\n\n**Background:** The security section states..."
```
What is option 1?! This is useless. Include the actual option text.

---

## ✅ REQUIRED: Technical Context Fields

### files_to_modify (NEVER empty for code changes)
Must contain specific file paths where code will change.

**Good:**
```json
"files_to_modify": [
  "apps/server/src/features/billing/actions.ts",
  "apps/dashboard/src/lib/stripe/subscriptionManagement.ts"
]
```

**Bad:**
```json
"files_to_modify": []
```

### files_to_read (Context for understanding)
Files the dev should read BEFORE starting work.

**Good:**
```json
"files_to_read": [
  "apps/dashboard/src/features/billing/actions.ts - see existing pauseAccount function",
  "docs/features/billing/pause-subscription.md - understand current state machine"
]
```

### similar_code (Patterns to follow)
Existing code that demonstrates the pattern to use.

**Good:**
```json
"similar_code": [
  "apps/server/src/features/routing/routingService.ts - error handling patterns",
  "apps/server/src/lib/stripe/customerManagement.ts - Stripe API integration pattern"
]
```

---

## ✅ REQUIRED: Scope Definition

### out_of_scope (NEVER empty)
Explicitly state what the dev should NOT touch. Reference related tickets.

**Good:**
```json
"out_of_scope": [
  "Do NOT implement auto-resume functionality (that's TKT-103)",
  "Do NOT modify widget UI (that's TKT-104)",
  "Do NOT add retry logic - focus on error notification only"
]
```

**Bad:**
```json
"out_of_scope": []
```

---

## ✅ REQUIRED: Implementation Guidance

### fix_required (Specific steps, NOT copy of PM note)
Step-by-step implementation guidance.

**Good:**
```json
"fix_required": [
  "Add subscription_status check in VISITOR_JOIN handler at socket-handlers.ts:97",
  "If status === 'paused', emit 'error' event with code 'ORG_PAUSED'",
  "Update widget to display 'Service temporarily unavailable' message",
  "Add test case for paused organization visitor join attempt"
]
```

**Bad:**
```json
"fix_required": [
  "Custom response",
  "Note: yah these calls should still be logged"
]
```
This just copies the PM note. Transform it into actionable steps!

---

## ✅ REQUIRED: Verification

### dev_checks (Specific commands, NOT empty)
Commands the dev should run to verify their work.

**Good:**
```json
"dev_checks": [
  "pnpm typecheck passes",
  "pnpm build passes",
  "grep -r 'CACHE_TTL_SECONDS' apps/server/src - verify env var is used",
  "pnpm test -- cache - run cache-related tests",
  "Manual: Set env var to 60, verify cache expires in 1 minute"
]
```

**Bad:**
```json
"dev_checks": []
```

### acceptance_criteria (Specific, testable)
How do we know the work is complete?

**Good:**
```json
"acceptance_criteria": [
  "Pausing account calls Stripe API to pause subscription",
  "Resuming account calls Stripe API to resume subscription",
  "Database and Stripe state remain in sync after all operations",
  "Error during Stripe call is logged and retried once",
  "Admin sees error notification if Stripe call ultimately fails"
]
```

**Bad:**
```json
"acceptance_criteria": [
  "Issue described in F-XXX is resolved",
  "Change is tested and verified"
]
```
This is generic boilerplate. Be specific!

---

## ✅ REQUIRED: Risk Assessment

### risks (What could go wrong)
Identify potential problems and edge cases.

**Good:**
```json
"risks": [
  "High - Stripe API failures could leave database and Stripe out of sync",
  "Need idempotency handling for retries",
  "Must handle edge cases: already paused, invalid subscription ID, expired token",
  "Changing default behavior could break existing orgs - must match current defaults"
]
```

---

## VALIDATION CHECKLIST

Before saving ANY ticket, verify ALL of these:

```
□ PM gave an actual DECISION (not a question)
□ Decision is NOT skip/won't fix/already exists
□ issue field has: PM Decision + Background + (optionally) Implementation
□ PM Decision includes the ACTUAL decision text (not "option 1")
□ files_to_modify is NOT empty (for code changes)
□ out_of_scope is NOT empty
□ fix_required has ACTIONABLE steps (not copy of PM note)
□ dev_checks has SPECIFIC commands
□ acceptance_criteria are TESTABLE (not generic boilerplate)
□ risks are identified
```

If ANY checkbox fails, DO NOT CREATE THE TICKET. Either:
1. Go back to PM for clarification, OR
2. Fill in the missing technical details yourself by reading the codebase

---

## FULL TICKET SCHEMA

```json
{
  "id": "TKT-XXX",
  "title": "Verb + specific change (e.g., 'Add Stripe integration for pause subscription')",
  "priority": "critical|high|medium|low",
  "feature": "Feature area name",
  "difficulty": "easy|medium|hard",
  "status": "ready",
  "source": "Finding F-XXX",
  
  "issue": "**PM Decision:** [actual decision]\n\n**Background:** [technical context]\n\n**Implementation:** [optional: specific guidance]",
  
  "feature_docs": ["docs/features/relevant-doc.md"],
  "similar_code": ["path/to/pattern.ts - description of why it's relevant"],
  "files_to_modify": ["exact/file/paths.ts"],
  "files_to_read": ["context/files.ts - what to look for"],
  
  "out_of_scope": [
    "Do NOT change X (that's TKT-YYY)",
    "Do NOT refactor Y",
    "Do NOT add Z feature"
  ],
  
  "fix_required": [
    "Step 1: Specific action with file/line reference",
    "Step 2: Another specific action",
    "Step 3: Add test for new behavior"
  ],
  
  "acceptance_criteria": [
    "Specific testable criterion 1",
    "Specific testable criterion 2",
    "Edge case is handled correctly"
  ],
  
  "risks": [
    "Risk 1 with mitigation approach",
    "Risk 2 - edge case to watch for"
  ],
  
  "dev_checks": [
    "pnpm typecheck passes",
    "pnpm build passes",
    "specific grep or test command",
    "Manual: specific manual verification step"
  ],
  
  "qa_notes": "How QA should test this. Include edge cases to verify.",
  
  "finding_ids": ["F-XXX"],
  "parent_ticket_id": null,
  "iteration": 1,
  "branch": null,
  "worktree_path": null,
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

---

## REFERENCE: A+ TICKET EXAMPLES

### Example 1: TKT-102 (Complex backend change)
- Clear code references (actions.ts:127-131)
- Cross-ticket awareness (references TKT-103, TKT-104)
- Specific risks with mitigations
- Idempotency and edge cases called out

### Example 2: TKT-105 (Simple type fix)
- PM Decision IS the exact fix
- Specific file and line number
- Clear out of scope
- Minimal but complete

### Example 3: TKT-066 (Feature with notification)
- Multiple acceptance criteria
- Specific failure thresholds ("after 3 consecutive failures")
- Risk noted ("don't over-notify")
- Manual test steps in dev_checks

---

## REMEMBER

A dev reading this ticket should be able to:
1. ✅ Understand WHAT the problem is
2. ✅ Understand WHAT the PM decided
3. ✅ Know WHERE to make changes
4. ✅ Know HOW to implement (patterns to follow)
5. ✅ Know WHAT NOT to touch
6. ✅ Verify their work with specific commands
7. ✅ Understand edge cases and risks

If any of these are unclear, THE TICKET IS NOT READY.
