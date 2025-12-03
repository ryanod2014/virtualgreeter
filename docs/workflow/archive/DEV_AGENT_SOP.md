# Dev Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the Dev Agent's implementation workflow.
>
> **One-liner to launch:** `You are a Dev Agent. Read and execute docs/workflow/DEV_AGENT_SOP.md then execute your assigned ticket.`

---

## 🔄 Dev Agent Checklist

Execute these steps **in order** for every dev ticket:

### Step 0: Signal Start (REQUIRED)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** STARTED
- **Branch:** `[branch-name]`
- **Files Locking:** [list all files you plan to modify]
- **Notes:** Beginning implementation
```

**⚠️ FILE LOCKS:** If your ticket spec lists locked files, verify they're still available in `AGENT_TASKS.md` → FILE LOCKS section. If locked by another agent, report BLOCKED immediately.

---

### Step 1: Environment Setup

```bash
# Checkout the branch (should already exist)
git fetch origin
git checkout [branch-name]
git pull origin [branch-name]

# Install dependencies
pnpm install
```

---

### Step 2: Understand the Task

#### 2.1 Read Your Ticket Spec Thoroughly

Your ticket spec in `docs/prompts/active/` contains:
- What needs to be implemented
- Which files to modify
- Acceptance criteria
- Any previous context (for continuation tickets)

#### 2.2 Read Relevant Feature Docs

```bash
ls docs/features/
```

Feature docs describe **intended behavior**. Your implementation must match.

#### 2.3 Review Related Code

Before writing code, understand the existing patterns:
- How similar features are implemented
- Existing abstractions to reuse
- Code style conventions

---

### Step 3: Implement

#### 3.1 Make Changes

- Follow existing code patterns
- Keep changes minimal and focused
- Don't refactor unrelated code
- Add comments for complex logic

#### 3.2 Test Locally

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Run tests
pnpm test
```

**All must pass before committing.**

#### 3.3 Commit Frequently

```bash
git add [files]
git commit -m "[TICKET-ID]: [brief description of change]"
```

Good commit messages:
- `FIX-006: Add idle warning toast component`
- `FIX-006: Implement 30s countdown timer`
- `FIX-006: Style toast to match widget theme`

---

### Step 4: Handle Blockers

If you get stuck:

#### 4.1 Technical Blocker
Try to solve it yourself first:
- Check existing code for patterns
- Read relevant documentation
- Search the codebase for similar implementations

#### 4.2 Can't Proceed? Report BLOCKED

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** BLOCKED
- **Branch:** `[branch-name]`
- **Blocker Type:** Technical / Product Decision / Environment / External Dependency
- **Question:** [Specific question - be precise]
- **Context:** [File path, line number, what you're trying to do]
- **What I Tried:** [List approaches you attempted]
- **Options Considered:** 
  - Option A: [description] - Pros: [x], Cons: [y]
  - Option B: [description] - Pros: [x], Cons: [y]
- **Notes:** Awaiting PM triage. Work paused at [describe where you stopped].
```

**Then STOP.** Don't continue until you receive a continuation ticket with answers.

---

### Step 5: Complete Implementation

#### 5.1 Final Checks

```bash
# Ensure everything passes
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Review your changes
git diff main..HEAD
```

#### 5.2 Push Changes

```bash
git push origin [branch-name]
```

---

### Step 6: Report Completion (REQUIRED)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Dev Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** COMPLETE
- **Branch:** `[branch-name]`
- **Output:** Branch pushed to origin
- **Files Modified:**
  - `[file1]` - [what changed]
  - `[file2]` - [what changed]
- **How to Test:** [Brief description of how to verify the fix]
- **Notes:** [Summary of implementation, any concerns, edge cases handled]
```

---

## 📋 Continuation Tickets

If you're working on a **continuation ticket** (e.g., `dev-agent-FIX006-v2.md`):

### What's Different:
1. Previous work already exists on the branch
2. The spec includes context from the previous session
3. There may be answers to questions you asked

### Your Process:
1. Read the **entire** continuation spec (includes previous context)
2. Check the **"Previous Progress"** section to see where you left off
3. Check the **"Answers"** section for resolved blockers
4. Continue from where the previous agent stopped
5. Don't redo completed work

---

## 🎯 Quality Standards

### Code Quality
- [ ] Follows existing patterns in the codebase
- [ ] No unnecessary changes to unrelated code
- [ ] Clear variable and function names
- [ ] Comments explain "why", not "what"
- [ ] No console.logs left in (except intentional debugging)

### Type Safety
- [ ] No `any` types unless absolutely necessary
- [ ] Props interfaces defined for components
- [ ] API responses properly typed

### Error Handling
- [ ] Errors caught and handled appropriately
- [ ] User-facing errors are friendly
- [ ] Edge cases considered

---

## ⚠️ Critical Rules

1. **ALWAYS signal start** - PM tracks active agents via completions
2. **ALWAYS check file locks** - Don't modify files locked by other agents
3. **ALWAYS run checks** - typecheck, lint, build, test before pushing
4. **Report blockers immediately** - Don't spin; escalate and pause
5. **ALWAYS report completion** - PM can't create next phase ticket without your report
6. **Stay focused** - Only implement what's in your ticket spec
7. **Don't break existing features** - If tests fail, fix them or report it

