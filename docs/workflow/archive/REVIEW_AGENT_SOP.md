# Review Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the Code Review Agent's workflow.
>
> **One-liner to launch:** `You are a Review Agent. Read and execute docs/workflow/REVIEW_AGENT_SOP.md then execute your assigned ticket.`

---

## 🔄 Review Agent Checklist

### Step 0: Signal Start (REQUIRED)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** STARTED
- **Branch:** `[branch-name]`
- **Notes:** Beginning code review
```

---

### Step 1: Get the Changes

```bash
git fetch origin
git checkout [branch-name]
git pull origin [branch-name]

# Get the diff against main
git diff main..HEAD
```

---

### Step 2: Review Checklist

#### 2.1 Core Fix/Feature
- [ ] Does the change accomplish what the ticket describes?
- [ ] Does it match the intended behavior in `docs/features/`?
- [ ] Are all acceptance criteria met?

#### 2.2 Code Quality
- [ ] Follows existing patterns in the codebase
- [ ] No unnecessary changes to unrelated code
- [ ] Clear, readable code
- [ ] Appropriate comments where needed
- [ ] No debug code left in (console.logs, etc.)

#### 2.3 Type Safety
- [ ] No inappropriate `any` types
- [ ] Props/interfaces properly defined
- [ ] API responses properly typed

#### 2.4 Error Handling
- [ ] Errors handled appropriately
- [ ] Edge cases considered
- [ ] User-facing errors are friendly

#### 2.5 Security
- [ ] No new data exposure
- [ ] Authorization checks in place
- [ ] Input validation where needed
- [ ] No hardcoded secrets

#### 2.6 Performance
- [ ] No obvious performance issues
- [ ] No unnecessary re-renders (React)
- [ ] No N+1 queries (if DB involved)

#### 2.7 Testing
- [ ] Existing tests still pass
- [ ] New tests added if appropriate
- [ ] Edge cases testable

---

### Step 3: Build Verification

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
pnpm test
```

**All must pass.** If any fail due to this branch's changes, mark as CHANGES_REQUESTED.

---

### Step 4: Generate Review Report

```markdown
## Code Review: [TICKET-ID]

### Summary
- **Status:** APPROVED / CHANGES_REQUESTED
- **Branch:** `[branch-name]`
- **Reviewed:** [Date]

### What Was Changed
[Brief description of the changes]

### Files Modified
- `[file1]` - [what changed]
- `[file2]` - [what changed]

### Review Findings

#### ✅ Approved Items
- [Item that looks good]
- [Item that looks good]

#### ⚠️ Concerns (non-blocking)
- [Minor issue or suggestion]

#### ❌ Required Changes (blocking)
- [Issue that must be fixed]

### Build Status
- Typecheck: PASS/FAIL
- Lint: PASS/FAIL
- Build: PASS/FAIL
- Tests: PASS/FAIL

### Verdict
[APPROVED: Ready for QA]
[OR]
[CHANGES_REQUESTED: Must address required changes before QA]
```

---

### Step 5: Report Completion (REQUIRED)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** APPROVED / CHANGES_REQUESTED
- **Branch:** `[branch-name]`
- **Output:** Review report above
- **Notes:** [Summary - what was good, what needs work]
```

---

## 📋 Review Verdicts

| Verdict | When to Use | PM Action |
|---------|-------------|-----------|
| **APPROVED** | All checks pass, code is solid | Create QA ticket |
| **CHANGES_REQUESTED** | Issues that must be fixed | Create continuation dev ticket |

### APPROVED Criteria:
- All review checklist items pass
- Build verification passes
- No blocking issues found
- Minor concerns can be noted but don't block

### CHANGES_REQUESTED Criteria:
- Build fails
- Security issues found
- Logic errors
- Missing error handling for critical paths
- Doesn't meet acceptance criteria

---

## ⚠️ Critical Rules

1. **ALWAYS signal start** - PM tracks active agents
2. **Be specific** - Point to exact files and lines for issues
3. **Distinguish blocking vs non-blocking** - Not everything is a blocker
4. **Run the build** - Don't approve code that doesn't build
5. **ALWAYS report completion** - PM needs your verdict to proceed
6. **Check feature docs** - Verify behavior matches intended design

