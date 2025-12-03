# Strategy Agent SOP (Standard Operating Procedure)

> **Purpose:** This document defines the Strategy Agent's analysis workflow.
>
> **One-liner to launch:** `You are a Strategy Agent. Read and execute docs/workflow/STRATEGY_AGENT_SOP.md with focus area: [FOCUS]`

---

## 🎯 Strategy Agent Role

Strategy Agents analyze the codebase to find:
- Security vulnerabilities
- Performance issues
- Code quality problems
- Missing functionality
- Technical debt
- Best practice violations

**Output:** Strategy reports that generate new tickets.

---

## 🔄 Strategy Agent Checklist

### Step 0: Check Long-Term Memory (REQUIRED)

**Before starting any analysis, read previous strategy reports:**

```bash
ls docs/strategy/
cat docs/strategy/INSIGHTS-LOG.md
```

**Purpose:** 
- Don't duplicate previous findings
- Build on previous insights
- Avoid recommending already-rejected approaches

If `INSIGHTS-LOG.md` mentions your focus area, note:
- What was already found
- What was already tried
- What was rejected (and why)

---

### Step 1: Signal Start

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Strategy Agent [FOCUS]
- **Ticket:** STRATEGY-[FOCUS]
- **Status:** STARTED
- **Focus Area:** [Security / Performance / Code Quality / etc.]
- **Notes:** Beginning analysis. Checked previous reports: [list relevant ones]
```

---

### Step 2: Define Scope

Based on your focus area, identify what to analyze:

| Focus Area | What to Analyze |
|------------|-----------------|
| **Security** | Auth flows, API endpoints, data exposure, input validation |
| **Performance** | Database queries, bundle size, render performance, caching |
| **Billing** | Stripe integration, subscription logic, payment flows |
| **Database** | Schema design, indexes, query patterns, migrations |
| **Error Handling** | Try/catch coverage, error boundaries, user feedback |
| **Testing** | Test coverage gaps, missing test types |
| **Code Quality** | Duplication, complexity, dead code, patterns |

---

### Step 3: Conduct Analysis

#### 3.1 Review Relevant Code

```bash
# Find files related to your focus
grep -r "[keyword]" apps/ packages/ --include="*.ts" --include="*.tsx"

# Review specific directories
ls -la apps/dashboard/src/app/api/
```

#### 3.2 Check Existing Documentation

```bash
# Feature docs
ls docs/features/

# Previous strategy reports
ls docs/strategy/

# TODO items
cat TODO.md | grep -i "[focus area]"
```

#### 3.3 Document Findings

For each issue found:

```markdown
### [FINDING-ID]: [Brief Title]

**Severity:** CRITICAL / HIGH / MEDIUM / LOW
**Category:** Security / Performance / Quality / etc.
**Location:** `[file path]:[line numbers]`

**Description:**
[What the issue is]

**Impact:**
[What could go wrong / user impact]

**Evidence:**
[Code snippet or proof]

**Recommendation:**
[How to fix it]

**Effort Estimate:** [time estimate]
```

---

### Step 4: Cross-Reference with Previous Work

Before finalizing, verify:

- [ ] This issue wasn't already reported in `docs/strategy/INSIGHTS-LOG.md`
- [ ] This issue doesn't have an existing ticket in `AGENT_TASKS.md`
- [ ] The recommendation wasn't previously rejected

If it's a **new angle on a previous issue**, note that:
```markdown
**Relation to Previous:** Builds on FINDING-XYZ from [date] report. 
Previous finding covered [X], this finding adds [Y].
```

---

### Step 5: Generate Report

Create report at: `docs/strategy/[DATE]-[FOCUS]-audit.md`

```markdown
# [Focus Area] Audit Report

**Date:** [YYYY-MM-DD]
**Agent:** Strategy Agent
**Focus:** [Focus Area]
**Scope:** [What was analyzed]

---

## Executive Summary

[2-3 sentence overview of findings]

**Key Stats:**
- Files analyzed: [N]
- Issues found: [N]
- Critical: [N] | High: [N] | Medium: [N] | Low: [N]

---

## Findings

### Critical Issues

[List critical findings]

### High Priority Issues

[List high findings]

### Medium Priority Issues

[List medium findings]

### Low Priority Issues

[List low findings]

---

## Recommended Tickets

| Priority | Ticket ID | Title | Effort |
|----------|-----------|-------|--------|
| P0 | [ID] | [title] | [time] |
| P1 | [ID] | [title] | [time] |

---

## What Was NOT Found

[Explicitly list areas that were checked and found to be fine.
This helps future strategy agents know what's already been verified.]

---

## Methodology

[Brief description of how the analysis was conducted]
```

---

### Step 6: Update Insights Log

**Append to `docs/strategy/INSIGHTS-LOG.md`:**

```markdown
---

## [DATE] - [FOCUS] Audit

**Agent:** Strategy Agent
**Report:** `docs/strategy/[DATE]-[FOCUS]-audit.md`

### Key Findings
- [Finding 1 - one line summary]
- [Finding 2 - one line summary]

### Tickets Generated
- [TICKET-ID]: [title]
- [TICKET-ID]: [title]

### Areas Verified Clean
- [Area 1] - no issues found
- [Area 2] - no issues found

### Notes for Future Audits
- [Any context that would help future strategy agents]
```

---

### Step 7: Report Completion

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Strategy Agent [FOCUS]
- **Ticket:** STRATEGY-[FOCUS]
- **Status:** COMPLETE
- **Output:** `docs/strategy/[DATE]-[FOCUS]-audit.md`
- **Findings:** [N] total ([N] critical, [N] high, [N] medium, [N] low)
- **Tickets Generated:** [list ticket IDs]
- **Notes:** [Summary and any recommendations for PM]
```

---

## 📚 Long-Term Memory: INSIGHTS-LOG.md

The `docs/strategy/INSIGHTS-LOG.md` file is the **long-term memory** for strategy work.

**What goes in it:**
- Summary of every strategy report
- Key findings (for quick reference)
- What was verified as clean
- Rejected approaches (and why)
- Cross-references between reports

**Why it matters:**
- Prevents duplicate analysis
- Builds institutional knowledge
- Helps new strategy agents ramp up
- Tracks what's been tried before

---

## 🎯 Focus Area Templates

### Security Audit Checklist
- [ ] Authentication flows (signup, login, session)
- [ ] Authorization checks (who can access what)
- [ ] API endpoint protection
- [ ] Input validation and sanitization
- [ ] Data exposure in responses
- [ ] Secrets management
- [ ] CORS and CSP headers
- [ ] Rate limiting

### Performance Audit Checklist
- [ ] Database query efficiency
- [ ] N+1 query problems
- [ ] Missing indexes
- [ ] Bundle size analysis
- [ ] Render performance
- [ ] Memory leaks
- [ ] Caching opportunities
- [ ] Lazy loading

### Billing Audit Checklist
- [ ] Subscription creation flow
- [ ] Payment failure handling
- [ ] Webhook processing
- [ ] Seat management
- [ ] Proration calculations
- [ ] Cancellation flow
- [ ] Trial handling
- [ ] Edge cases (race conditions, etc.)

---

## ⚠️ Critical Rules

1. **ALWAYS check INSIGHTS-LOG.md first** - Don't duplicate work
2. **Document what was NOT found** - Helps future audits
3. **Update INSIGHTS-LOG.md** - Maintain long-term memory
4. **Be specific** - Include file paths and line numbers
5. **Prioritize findings** - Not everything is critical
6. **Generate actionable tickets** - Findings need to become work

