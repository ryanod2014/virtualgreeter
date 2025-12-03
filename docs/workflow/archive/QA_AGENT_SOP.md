# QA Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the QA Agent's testing workflow.
>
> **One-liner to launch:** `You are a QA Agent. Read and execute docs/workflow/QA_AGENT_SOP.md then execute your assigned ticket.`

---

## 🔄 QA Agent Checklist

Execute these steps **in order** for every QA ticket:

### Step 0: Signal Start (REQUIRED)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** STARTED
- **Branch:** `[branch-name]`
- **Notes:** Beginning QA testing
```

---

### Step 1: Checkout Branch

```bash
git fetch origin
git checkout [branch-name]
git pull origin [branch-name]
```

---

### Step 2: Identify What to Test

#### 2.1 Read Feature Documentation

Find the relevant feature doc in `docs/features/` that describes the **intended behavior**.

```bash
ls docs/features/
# Find the relevant doc for this ticket's feature area
```

The feature doc is the **source of truth** for expected behavior.

#### 2.2 Read the Ticket Spec

Read the dev agent spec to understand:
- What was changed
- What files were modified
- What the fix/feature was supposed to accomplish

#### 2.3 Generate Test Scenarios

Create a comprehensive test matrix:

| Category | What to Test |
|----------|--------------|
| **Happy Path** | The main use case works as documented |
| **Edge Cases** | Boundary conditions, empty states, limits |
| **Error Cases** | Invalid input, network failures, timeouts |
| **Regression** | Existing functionality still works |
| **Security** | No new vulnerabilities introduced |

**Output format:**

```markdown
## Test Scenarios for [TICKET-ID]

### Automated Tests (QA Agent will execute)
| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| 1 | [description] | [steps] | [expected] |
| 2 | [description] | [steps] | [expected] |

### Human Tests (Requires manual verification)
| # | Scenario | Steps | Expected Result | Why Human? |
|---|----------|-------|-----------------|------------|
| 1 | [description] | [steps] | [expected] | [reason] |
```

---

### Step 3: Decide Human vs Automated Testing

#### Heuristics for Human Testing:

| Condition | → Human Test |
|-----------|--------------|
| UI/visual changes | ✅ Always |
| Video playback behavior | ✅ Always |
| Complex user flows (multi-step) | ✅ Usually |
| Audio/media quality | ✅ Always |
| Mobile responsiveness | ✅ Always |
| Cross-browser compatibility | ✅ Always |
| "Feels right" / UX judgment | ✅ Always |

#### Heuristics for Automated Testing:

| Condition | → Automated Test |
|-----------|------------------|
| API behavior (request/response) | ✅ Always |
| Database state changes | ✅ Always |
| Code logic (calculations, conditionals) | ✅ Always |
| Error handling | ✅ Usually |
| Build/lint/typecheck | ✅ Always |
| Security field sanitization | ✅ Usually |

---

### Step 4: Create Human QA Ticket (if needed)

If any scenarios require human testing, create entry in `docs/human-qa-queue.md`:

```markdown
## [TICKET-ID] - [Brief Description]

**Priority:** P0/P1/P2
**Branch:** `[branch-name]`  
**Related Feature Doc:** `docs/features/[feature].md`
**QA Agent:** [Your identifier]
**Created:** [Date]

### Test Scenarios

| # | Scenario | Steps | Expected Result | Pass/Fail |
|---|----------|-------|-----------------|-----------|
| 1 | [description] | 1. [step] 2. [step] 3. [step] | [expected] | ⬜ |
| 2 | [description] | 1. [step] 2. [step] | [expected] | ⬜ |

### Environment
- URL: [staging URL or localhost instructions]
- Test Account: [if needed]
- Prerequisites: [any setup needed]

### Notes for Human Tester
[Any additional context or gotchas]
```

---

### Step 5: Execute Automated Tests

#### 5.1 Build Verification

```bash
# Run from project root
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

**All must pass.** If any fail, ticket is `FAILED`.

#### 5.2 Unit/Integration Tests

```bash
pnpm test
```

#### 5.3 Browser Testing (if applicable)

Use the browser tools to test the feature:

1. **Navigate to the page:**
```
mcp_cursor-browser-extension_browser_navigate → URL
```

2. **Get page state:**
```
mcp_cursor-browser-extension_browser_snapshot
```

3. **Interact with elements:**
```
mcp_cursor-browser-extension_browser_click → element ref
mcp_cursor-browser-extension_browser_type → input ref + text
```

4. **Check console for errors:**
```
mcp_cursor-browser-extension_browser_console_messages
```

5. **Check network requests:**
```
mcp_cursor-browser-extension_browser_network_requests
```

#### 5.4 Database Verification (if applicable)

If the feature involves database changes:

1. Login to Supabase dashboard
2. Query relevant tables
3. Verify data integrity

---

### Step 6: Document Results

Create a test report:

```markdown
## QA Report: [TICKET-ID]

### Summary
- **Status:** PASSED / FAILED
- **Branch:** `[branch-name]`
- **Tested:** [Date]

### Build Verification
- [ ] Typecheck: PASS/FAIL
- [ ] Lint: PASS/FAIL  
- [ ] Build: PASS/FAIL
- [ ] Tests: PASS/FAIL

### Automated Test Results
| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| 1 | [scenario] | ✅/❌ | [notes] |
| 2 | [scenario] | ✅/❌ | [notes] |

### Issues Found
[List any bugs or concerns]

### Human QA Required
- [ ] Yes - see `docs/human-qa-queue.md`
- [ ] No - all tests automated
```

---

### Step 7: Handle Blockers

If you encounter a blocker:

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** BLOCKED
- **Branch:** `[branch-name]`
- **Blocker Type:** Technical / Product Decision / Environment / External
- **Question:** [Specific question that needs answering]
- **Context:** [Relevant details - file, line, scenario]
- **What I Tried:** [What you attempted before getting stuck]
- **Notes:** Awaiting PM triage
```

---

### Step 8: Report Completion (REQUIRED)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent [TICKET-ID]
- **Ticket:** [TICKET-ID]
- **Status:** APPROVED / FAILED
- **Branch:** `[branch-name]`
- **Human QA:** Required / Not Required
- **Output:** QA report above
- **Notes:** [Summary - what passed, what failed, any concerns]
```

---

## 🎯 Testing Priority

When time-constrained, prioritize:

1. **P0 Security** - Always test thoroughly
2. **Happy Path** - Main use case must work
3. **Critical Edge Cases** - Likely failure modes
4. **Regression** - Don't break existing features
5. **Nice-to-have Edge Cases** - If time permits

---

## 📋 Common Test Patterns

### API Endpoint Testing
```markdown
| Method | Endpoint | Input | Expected Status | Expected Body |
|--------|----------|-------|-----------------|---------------|
| POST | /api/foo | {valid} | 200 | {success: true} |
| POST | /api/foo | {invalid} | 400 | {error: "..."} |
| POST | /api/foo | (no auth) | 401 | {error: "..."} |
```

### State Machine Testing
```markdown
| Current State | Action | Expected State | Side Effects |
|---------------|--------|----------------|--------------|
| idle | click | loading | API called |
| loading | success | ready | Data shown |
| loading | error | error | Error shown |
```

### Widget Testing
```markdown
| Trigger | Condition | Expected Behavior |
|---------|-----------|-------------------|
| Page load | Agent available | Widget shows after delay |
| Page load | No agent | Widget hidden |
| Agent login | Visitor waiting | Widget appears |
```

---

## ⚠️ Critical Rules

1. **ALWAYS signal start** - PM needs to track active agents
2. **Feature docs are truth** - Test against documented behavior, not assumptions
3. **Create human QA tickets** - Don't skip visual/UX testing
4. **Report blockers immediately** - Don't spin; escalate and wait
5. **ALWAYS report completion** - PM can't proceed without your report

