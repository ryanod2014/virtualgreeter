# PM Documentation Workflow

> **Purpose:** PM workflow for documentation sprints AND review sprints.
> **🆕 Interactive Dashboard:** `docs/pm-dashboard-ui/index.html` - Answer questions, resolve findings, generate tickets
> **Launch Commands:**
> - **Doc Mode:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md`
> - **Review Mode:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md - Review Mode`

---

## 🆕 Interactive Dashboard Workflow (Recommended)

The **React Dashboard** lets you answer questions and resolve findings through a UI instead of chat.

### How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│   YOU (Dashboard)                    │   PM (Cursor Chat)               │
├──────────────────────────────────────┼──────────────────────────────────┤
│ 1. Open dashboard                    │                                  │
│    http://localhost:3456             │                                  │
│                                      │                                  │
│ 2. Select option OR                  │                                  │
│    type question in thread           │                                  │
│                                      │                                  │
│ 3. Auto-saves to decisions.json      │ 4. Tell PM: "check my answers"   │
│                                      │                                  │
│                                      │ 5. PM reads decisions.json       │
│                                      │    - Creates tickets for resolved│
│                                      │    - Responds to questions       │
│                                      │                                  │
│ 6. Refresh dashboard                 │                                  │
│    See PM responses in thread!       │                                  │
│                                      │                                  │
│ 7. Continue conversation or resolve  │                                  │
└──────────────────────────────────────┴──────────────────────────────────┘
```

### Data Files

| File | Purpose |
|------|---------|
| `docs/data/findings.json` | Findings with questions from review agents |
| `docs/data/decisions.json` | Conversation threads + human decisions |
| `docs/data/tickets.json` | All tickets with full details |
| `docs/pm-dashboard-ui/index.html` | Interactive React dashboard |

### Quick Start

```bash
# Start server with auto-save
node docs/pm-dashboard-ui/server.js

# Open http://localhost:3456 in browser
```

### 🔴 PM: Responding to Questions (MANDATORY)

When human asks a question in the dashboard (e.g., "I don't understand"), PM **MUST** respond in the thread:

```bash
# PM reads the question from decisions.json
cat docs/data/decisions.json | grep -B5 -A15 '"status": "in_discussion"'

# PM writes response back to the thread
node docs/scripts/pm-respond.js F-XXX "Your clarification message here"
```

**Example:**
```bash
node docs/scripts/pm-respond.js F-643 "This finding is about uptime monitoring. The free tier only supports 3-min checks, but configs say 1-min. Options: (1) change to 3-min, (2) pay $20/mo for 1-min, (3) skip - docs issue only"
```

Human then refreshes dashboard and sees PM response in the conversation thread.

> ⚠️ **NEVER** respond only in Cursor chat. ALWAYS write responses to `decisions.json` so they appear in the dashboard thread.

### PM Agent Command (after answering in dashboard)

```
You are the PM. Read docs/data/decisions.json and:
1. For each finding with a decision (decision.option_id exists AND != "custom"), create ticket in tickets.json
2. For any needing clarification, add follow-up questions to decisions.json
3. Update findings.json status to "ticketed" or "skipped" for each processed finding
4. Update decisions.json thread status to "resolved" for each processed thread  ← CRITICAL!
5. Run: node docs/scripts/process-decisions.js  ← ALWAYS RUN THIS AT THE END
```

> ⚠️ **Common Bug:** PM agents often forget steps 3-4. The dashboard checks BOTH:
> - `thread.status === "resolved"` in decisions.json
> - `finding.status === "ticketed" OR "skipped"` in findings.json
> 
> If either is missing, items will still show as "pending". **Always run the sync script!**

### Quick Fix If Dashboard Shows Wrong Count

If dashboard shows items "to process" that should be done:
```bash
node docs/scripts/process-decisions.js
```
This script:
- Syncs decisions.json → findings.json → tickets.json
- Creates missing tickets for resolved findings
- Marks skipped items properly
- Fixes any inconsistencies between files

---

## Legacy Data-Driven Workflow

For reference, the original JSON + Markdown workflow:

| File | Purpose |
|------|---------|
| `docs/data/tickets.json` | All tickets with full details |
| `docs/data/findings-summary.json` | Finding counts by priority/category |
| `docs/PM_DASHBOARD.md` | Auto-generated dashboard (read-only) |
| `docs/TICKET_BACKLOG.md` | Auto-generated backlog (read-only) |

**To update tickets:**
1. Edit `docs/data/tickets.json`
2. Run `node docs/scripts/generate-docs.js`
3. Dashboard and backlog are regenerated with accurate counts

---

## PM Responsibilities

### Mode 1: Documentation Sprint
1. Create doc-agent prompts for undocumented features
2. Output launch commands for parallel execution
3. Handle Git automatically

### Mode 2: Review Sprint
1. Create review-agent prompts for documented features
2. Output launch commands for parallel execution
3. Dashboard auto-aggregates agent outputs from `docs/agent-output/reviews/`
4. **⚠️ Ask which priority level to process** (Critical, High, etc.)
5. Present findings for selected priority with questions
6. Wait for human answers
8. Create tickets for answered findings only
9. Keep remaining findings as `⏳ PENDING` for future sessions
10. Human reviews tickets async before dev sprint (approve/reject/prioritize)

> 💡 **Batched Processing:** Human can process Critical first, then High later, etc. Findings stay in backlog until processed.

---

# MODE 1: DOCUMENTATION SPRINT

> Use when: Features need documentation

## Phase 1: Setup & Prompt Generation

**1.1 Check Git Status**
```bash
git status
```
- Note any uncommitted doc changes
- If docs exist uncommitted, commit them first (see Git SOP below)

**1.2 Read Current State**
```bash
cat docs/FEATURE_INVENTORY.md   # What needs documenting
ls docs/agent-output/doc-tracker/  # Recent doc completions (auto-aggregated)
ls docs/prompts/active/         # What prompts exist
```

**1.3 Create Missing Prompts**

For each undocumented feature in the inventory:
1. Create prompt file: `docs/prompts/active/doc-agent-[ID].md`
2. Use template from: `docs/workflow/templates/doc-agent.md`
3. Fill in: Feature ID, name, description, source files, key questions

**1.4 Commit Prompts**
```bash
git add docs/prompts/active/
git commit -m "docs: add doc-agent prompts for [list features]"
git push
```

---

## Phase 2: Output Launch Commands

Output ALL commands grouped by category:

```markdown
## 🚀 Documentation Sprint - Launch Commands

**Instructions:** Open separate Cursor chats, paste one command per chat. All run in parallel.

### Admin Features ([N] remaining)
1. `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-D1.md`
2. ...

### Billing Features ([N])
1. `You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-B1.md`
2. ...

### Auth Features ([N])
...

**Total: [N] agents ready to launch**
```

---

## Phase 3: Monitor & Commit

**3.1 Check Progress**
```bash
ls -la docs/agent-output/doc-tracker/  # Agent completion reports (auto-aggregated by dashboard)
find docs/features -name "*.md" -mmin -60  # Docs created in last hour
git status                            # Uncommitted changes
```

**3.2 Commit New Docs (AUTOMATIC)**

If there are uncommitted doc files:
```bash
git add docs/
git commit -m "docs: [list features documented]"
git push
```

**Do this automatically whenever you see uncommitted changes in `docs/`.**

---

# MODE 2: REVIEW SPRINT

> Use when: All docs complete, need to find issues and create tickets

## Phase 1: Setup Review Agents

**1.1 Check Current State**
```bash
ls docs/agent-output/reviews/   # Agent review outputs (auto-aggregated by dashboard)
cat docs/TICKET_BACKLOG.md      # Existing tickets
ls docs/prompts/active/         # Active prompts
```

**1.2 Decide Scope**

Options:
- **Full Review:** All documented features (50+ agents)
- **Category Review:** One category at a time (e.g., all Billing)
- **Targeted Review:** Specific features only

**1.3 Create Review Prompts**

For each feature to review:
1. Create prompt file: `docs/prompts/active/review-agent-[ID].md`
2. Use template from: `docs/workflow/templates/review-agent.md`
3. Fill in: Feature ID, doc file path, any focus areas

**1.4 Commit Prompts**
```bash
git add docs/prompts/active/
git commit -m "docs: add review-agent prompts for [list features]"
git push
```

---

## Phase 2: Output Launch Commands

```markdown
## 🔍 Review Sprint - Launch Commands

**Instructions:** Open separate Cursor chats, paste one command per chat. All run in parallel.

### [Category] Features ([N] to review)
1. `You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-V1.md`
2. `You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-V2.md`
...

**Total: [N] review agents ready to launch**
```

---

## Phase 2.5: Sync Verification (MANDATORY)

> 🔴 **CRITICAL:** Run this EVERY time before proceeding. Agents sometimes write findings but fail to update the tracker.

**2.5.0 Check Agent Outputs**

Agent outputs are now written to per-agent files in `docs/agent-output/reviews/` and auto-aggregated by the dashboard.

```bash
# Count review agent outputs
echo "Review outputs:"
ls docs/agent-output/reviews/*.md 2>/dev/null | wc -l

# List recent review outputs
ls -la docs/agent-output/reviews/
```

The dashboard auto-aggregates all per-agent outputs. No manual sync needed.

> ℹ️ **Per-Agent Files:** Each review agent writes to its own file (e.g., `D-routing-rules-2025-12-04T1430.md`). This prevents race conditions when multiple agents run simultaneously.

---

## Phase 2.6: Clarification Questions (REQUIRED)

> ⚠️ **STOP:** Before creating any tickets, PM must ask clarifying questions.

**2.6.1 Wait for Agents to Complete**
```bash
ls docs/agent-output/reviews/   # Check for new agent outputs
# Or open dashboard at http://localhost:3456 - it auto-aggregates
```

**2.6.2 Summarize Findings for Human**

Present a summary of all findings grouped by category and severity:

```markdown
## 📋 Review Findings Summary

**Total Findings:** [N]

### By Severity
- 🔴 Critical: [N] findings
- 🟠 High: [N] findings
- 🟡 Medium: [N] findings
- 🟢 Low: [N] findings

### Findings Pending Questions (not yet ticketed)
- 🔴 Critical: [N] pending
- 🟠 High: [N] pending
- 🟡 Medium: [N] pending
- 🟢 Low: [N] pending
```

**2.6.3 Ask Which Priority to Process**

> 💡 **Batched Processing:** Human can choose to process one priority level at a time.

Ask the human:

```markdown
**Which priority level would you like to process now?**

1. 🔴 **Critical only** ([N] findings) - Recommended first
2. 🔴🟠 **Critical + High** ([N] findings)
3. 🔴🟠🟡 **Critical + High + Medium** ([N] findings)
4. 🔴🟠🟡🟢 **All findings** ([N] findings)

Remaining findings will stay in the backlog for future sessions.
```

**2.6.4 Present Findings for Selected Priority**

For each finding in the selected priority batch, present:

```markdown
### 🔴 Critical Finding #1: [Title]
**Feature:** [Feature name]
**Issue:** [Description]
**Source:** [Reference]

**Questions:**
1. [Specific question about this finding]
2. [Any context needed]

---
```

**2.6.5 Ask Clarifying Questions**

For the selected batch only, ask:

1. **Per-Finding Questions:**
   - Present each finding with specific questions
   - "Is [behavior] intentional or a bug?"
   - "Can you clarify the intended behavior for [X]?"

2. **Grouping Questions:**
   - "Findings #X and #Y seem related. Combine into one ticket?"

3. **Priority Adjustment:**
   - "Should any of these be escalated or deprioritized?"

4. **Exclusions:**
   - "Should any of these be marked 'Won't Fix'?"

**2.6.6 Wait for Human Response**

> ⏸️ **PAUSE HERE.** Do not proceed to Phase 3 until the human has answered all questions for this batch.

Document the human's answers in the chat for reference during ticket creation.

**2.6.7 Track Remaining Backlog**

After creating tickets for the current batch, update findings status:
- Processed findings: `📋 TICKETED` or `❌ WON'T FIX`
- Remaining findings: `⏳ PENDING` (for next session)

---

## Phase 3: Create Tickets

> ✅ **Proceed only after Phase 2.5 sync check AND Phase 2.6 questions are answered.**

**3.1 Apply Human's Decisions**

Before creating tickets, apply any:
- Exclusions (skip certain findings)
- Priority overrides
- Ticket combinations
- Immediate rejections

**3.2 🔴 CHECK FOR DUPLICATES (MANDATORY)**

Before creating ANY ticket, search for existing tickets with similar issues:

```bash
# Search tickets for keywords from the finding
grep -i "keyword1\|keyword2\|keyword3" docs/data/tickets.json
```

**If similar ticket exists:**
1. Do NOT create a new ticket
2. Link the finding to the existing ticket ID
3. Tell human: "F-XXX is the same issue as TKT-YYY - linking to existing ticket"

**Example duplicate patterns:**
- Same feature + same fix = duplicate
- Different finding IDs but same root cause = duplicate  
- Same error message or behavior = duplicate

> ⚠️ Review agents may report the same issue from different docs/features. Always check before creating!

**3.3 Create Tickets for Approved Findings**

> ℹ️ **Workflow:** PM creates tickets based on human's answers. Human reviews tickets async before dev sprint.

For each approved finding in `REVIEW_FINDINGS.md`:

1. Add ticket to `TICKET_BACKLOG.md` in appropriate priority section:
   - Agent severity "Critical" → 🔴 Critical
   - Agent severity "High" → 🟠 High
   - Agent severity "Medium" → 🟡 Medium
   - Agent severity "Low" → 🟢 Low

2. Use detailed ticket format (one per ticket):

```markdown
### TKT-[NNN]: [Short Title]

| Field | Value |
|-------|-------|
| **Priority** | 🔴 Critical / 🟠 High / 🟡 Medium / 🟢 Low |
| **Feature** | [Feature name] |
| **Status** | 📋 Ready |
| **Difficulty** | 🟢 Easy / 🟡 Medium / 🔴 Hard |
| **Complexity** | Low / Medium / High |
| **Risk** | 🟢 Low / 🟡 Medium / 🔴 High |
| **Source** | [Finding reference] |

**Issue:**
[Description of the problem]

**Fix Required:**
[What needs to be done]

**Files to Edit:**
- `path/to/file1.ts` - [what changes]
- `path/to/file2.tsx` - [what changes]

**Risk Notes:**
[What could go wrong if fix isn't executed correctly, what other features might be affected]

**Acceptance Criteria:**
- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Feature Inventory:**
- [ ] If new feature added: Update `docs/FEATURE_INVENTORY.md`
- [ ] If feature modified: Verify inventory still accurate
```

> ⚠️ **IMPORTANT:** If a ticket adds a new feature or significantly modifies an existing one, include a checklist item to update `docs/FEATURE_INVENTORY.md`. This keeps inventory in sync with the codebase.

3. Update finding status in `REVIEW_FINDINGS.md`:
   - Change `⏳ PENDING` to `📋 TICKETED`

**Ticket Field Definitions:**

| Field | Description |
|-------|-------------|
| **Difficulty** | How hard is the actual coding? 🟢 Easy (< 1hr), 🟡 Medium (1-4hrs), 🔴 Hard (4+ hrs) |
| **Complexity** | How many systems/concepts involved? Low (1 file), Medium (2-5 files), High (6+ files or cross-cutting) |
| **Risk** | What happens if done wrong? 🟢 Low (cosmetic), 🟡 Medium (broken feature), 🔴 High (data loss, billing, security) |
| **Files to Edit** | Explicit list for parallelization - tickets touching different files can run in parallel |

**3.3 Update Quick Stats**

Update the counts in `TICKET_BACKLOG.md` header.

**3.4 Commit Updates**
```bash
git add docs/REVIEW_FINDINGS.md docs/TICKET_BACKLOG.md
git commit -m "docs: [N] tickets created from review findings"
git push
```

---

## Phase 4: Human Reviews Tickets (Async)

> Human reviews `TICKET_BACKLOG.md` before dev sprint starts.

**Human Actions:**
- ✅ Approve ticket (keep as-is)
- ❌ Won't Fix (move to Rejected section with reason)
- 🔄 Modify priority (move to different section)
- ❄️ On Hold (defer to future sprint)

**PM Updates:**
- Move rejected tickets to "Rejected Tickets" section
- Update Quick Stats counts
- Commit changes

---

## Phase 5: Update Dashboard

> 🔄 **REQUIRED:** Update `docs/PM_DASHBOARD.md` so Human sees current pipeline state.

**5.1 Update Pipeline Counts**

Update these sections in `docs/PM_DASHBOARD.md`:
- Stage 2: Reviews (counts from `REVIEW_TRACKER.md`)
- Stage 3: Questions (count `⏳ PENDING` in `REVIEW_FINDINGS.md`)
- Stage 4: Tickets (counts from `TICKET_BACKLOG.md`)
- ASCII pipeline diagram at top

**5.2 Log Pending Questions**

If any questions were asked but not answered:
- Add to "Pending Questions" table at bottom of dashboard
- Include finding reference, question text, date asked

**5.3 Log Session**

Add entry to Session Log table:
```markdown
| [Date] | [Session type] | [Action taken] | [Result] |
```

---

## Phase 6: Archive & Cleanup

```bash
# Archive review prompts
mv docs/prompts/active/review-agent-*.md docs/prompts/archive/
git add docs/prompts/
git commit -m "docs: archive completed review prompts"
git push
```

---

# GIT SOP (Automatic - Both Modes)

### When PM Starts
```bash
git status
git add docs/
git commit -m "docs: batch update"
git push
```

### After Creating Prompts
```bash
git add docs/prompts/
git commit -m "docs: add prompts for [features]"
git push
```

### After Processing (Doc Mode)
```bash
git add docs/features/
git commit -m "docs: [feature names] documentation complete"
git push
```

### After Processing (Review Mode)
```bash
# Update dashboard with current pipeline status
git add docs/PM_DASHBOARD.md docs/REVIEW_FINDINGS.md docs/TICKET_BACKLOG.md
git commit -m "docs: review complete, [N] tickets created"
git push
```

### When Sprint Complete
```bash
git add docs/
git commit -m "docs: sprint complete"
git push

# Archive prompts
mv docs/prompts/active/doc-agent-*.md docs/prompts/archive/
mv docs/prompts/active/review-agent-*.md docs/prompts/archive/
git add docs/prompts/
git commit -m "docs: archive completed prompts"
git push
```

---

# QUICK REFERENCE

## Files by Mode

| File | Doc Mode | Review Mode |
|------|----------|-------------|
| `docs/PM_DASHBOARD.md` | ✅ Update | ✅ Update |
| `docs/FEATURE_INVENTORY.md` | ✅ Read | ✅ Read |
| `docs/agent-output/doc-tracker/` | ✅ Read (auto-aggregated) | - |
| `docs/agent-output/reviews/` | - | ✅ Read (auto-aggregated) |
| `docs/TICKET_BACKLOG.md` | - | ✅ Write |
| `docs/workflow/templates/doc-agent.md` | ✅ Use | - |
| `docs/workflow/templates/review-agent.md` | - | ✅ Use |
| `docs/prompts/active/` | ✅ Write | ✅ Write |
| `docs/features/` | ✅ Output | ✅ Read |

> 💡 **PM_DASHBOARD.md** is the Human's single view of the entire pipeline. Update it after each session.

## Launch Commands

**Doc Agent:**
```
You are a Doc Agent. Read docs/workflow/DOC_AGENT_SOP.md then execute: docs/prompts/active/doc-agent-[ID].md
```

**Review Agent:**
```
You are a Review Agent. Read docs/workflow/REVIEW_AGENT_SOP.md then execute: docs/prompts/active/review-agent-[ID].md
```

---

# EXAMPLE SESSIONS

## Doc Mode Example
```
PM starts in Doc Mode...

1. Check git status → clean
2. Read inventory → 5 features need docs
3. Create 5 doc-agent prompts
4. Commit prompts
5. Output 5 launch commands
6. Human launches agents
7. PM monitors, commits completed docs
```

## Review Mode Example (Batched Processing)
```
PM starts in Review Mode...

1. Check current state → 0 findings, 0 tickets
2. Decide scope → Full review (50 features)
3. Create 50 review-agent prompts
4. Commit prompts
5. Output 50 launch commands
6. Human launches agents
7. Agents report 127 findings

--- SESSION 1: CRITICAL ONLY ---

8. PM summarizes: "Found 127 findings (3 Critical, 15 High, 60 Medium, 49 Low)"
9. PM asks: "Which priority to process? (1) Critical only, (2) Critical+High, etc."
10. Human answers: "Critical only for now"
11. PM presents 3 Critical findings with questions:
    - "Finding #1: Password fields in DOM - is this the expected masking behavior?"
    - "Finding #2: Stripe cancel issue - do you want me to verify the API call?"
    - "Finding #3: [details and question]"
12. Human answers all questions for Critical findings
13. PM creates 3 Critical tickets
14. PM marks 3 findings as 📋 TICKETED, leaves 124 as ⏳ PENDING
15. Commit

--- SESSION 2: HIGH PRIORITY (later) ---

16. Human: "Let's do High priority now"
17. PM presents 15 High findings with questions
18. Human answers questions
19. PM creates 15 High tickets
20. 109 findings still pending (Medium + Low)

--- SESSION 3: REMAINING (even later) ---

21. Human: "Process Medium, skip Low for now"
22. PM presents 60 Medium findings with questions
23. Human answers, some marked Won't Fix
24. PM creates 55 Medium tickets
25. 49 Low findings remain ⏳ PENDING for future

--- HUMAN REVIEW (async) ---

26. Human reviews TICKET_BACKLOG.md
27. Approves/rejects/reprioritizes as needed
```

---

# TROUBLESHOOTING

**Q: Dashboard shows different counts than tracker**
A: Run the Sync Check (Phase 2.5). Agents sometimes write findings to REVIEW_FINDINGS.md but fail to update REVIEW_TRACKER.md. Cross-reference both files and fix any mismatches. The source of truth is: which features have sections in REVIEW_FINDINGS.md.

**Q: PM skipped the clarification questions phase**
A: STOP. Do not create tickets. Go back to Phase 2.6 and ask questions first. This phase is mandatory.

**Q: Agent produced bad findings**
A: Re-launch that one agent, or manually edit REVIEW_FINDINGS.md

**Q: Human wants to change a decision**
A: Update REVIEW_FINDINGS.md and TICKET_BACKLOG.md accordingly

**Q: How do I know what's been reviewed?**
A: Check `REVIEW_TRACKER.md` for completion status (✅ = done, ⏳ = pending)

**Q: Can I run both modes at once?**
A: Yes, but use separate PM sessions to avoid confusion

**Q: What if human doesn't answer questions?**
A: Wait. Do not proceed to ticket creation until human responds. PM should remind human that answers are needed.

**Q: How do I continue processing remaining findings from a previous session?**
A: Check `REVIEW_FINDINGS.md` for `⏳ PENDING` status. Summarize remaining findings and ask which priority to process next.

**Q: Human only wants to process Critical right now**
A: Perfect! Present only Critical findings with questions. Create tickets for those. Mark others as `⏳ PENDING` - they stay in backlog for next session.

**Q: Human asked a question in the dashboard but I responded in chat**
A: WRONG! You must write your response to `decisions.json` so it appears in the dashboard thread. Run: `node docs/scripts/pm-respond.js F-XXX "your response"`. Human should never have to leave the dashboard to see PM responses.

**Q: How do I see what questions human asked in the dashboard?**
A: Run: `grep -B5 -A15 '"status": "in_discussion"' docs/data/decisions.json` - this shows threads with pending conversations.

**Q: I created a duplicate ticket by accident**
A: Delete the duplicate from tickets.json, update the finding to point to the correct ticket_id. Always run duplicate check (Phase 3.2) before creating tickets!

**Q: How do I check for duplicate tickets before creating?**
A: Run: `grep -i "keyword" docs/data/tickets.json` with keywords from the finding. If a similar ticket exists, link to it instead of creating a new one.
