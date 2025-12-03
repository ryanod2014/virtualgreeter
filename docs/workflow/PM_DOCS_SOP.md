# PM Documentation Workflow

> **Purpose:** PM workflow for documentation sprints AND review sprints.
> **Dashboard:** `docs/PM_DASHBOARD.md` - Human's single view of entire pipeline (auto-generated)
> **Data Files:** `docs/data/tickets.json` and `docs/data/findings-summary.json`
> **Launch Commands:**
> - **Doc Mode:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md`
> - **Review Mode:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md - Review Mode`

---

## Data-Driven Workflow

The PM workflow now uses **structured JSON data** for accuracy:

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

**The PM workflow (questions, decisions, ticket creation) remains exactly the same.**

---

## PM Responsibilities

### Mode 1: Documentation Sprint
1. Create doc-agent prompts for undocumented features
2. Output launch commands for parallel execution
3. Handle Git automatically

### Mode 2: Review Sprint
1. Create review-agent prompts for documented features
2. Output launch commands for parallel execution
3. **🔴 SYNC CHECK: Cross-verify findings vs tracker** (agents may write findings but fail to update tracker)
4. Collect findings from `REVIEW_FINDINGS.md`
5. **⚠️ Ask which priority level to process** (Critical, High, etc.)
6. Present findings for selected priority with questions
7. Wait for human answers
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
cat docs/DOC_TRACKER.md         # What's already done
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
cat docs/DOC_TRACKER.md | head -50   # Recent completions
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
cat docs/REVIEW_FINDINGS.md     # Existing findings
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

**2.5.0 Cross-Check Findings vs Tracker**

```bash
# Count features with findings in REVIEW_FINDINGS.md
echo "Features with findings:"
grep "^## [A-Z].*- " docs/REVIEW_FINDINGS.md | grep -v "How This" | grep -v "Decision" | grep -v "^## Findings" | wc -l

# Count features marked ✅ in REVIEW_TRACKER.md  
echo "Features marked reviewed:"
grep "✅" docs/REVIEW_TRACKER.md | grep -v "Legend" | wc -l
```

**If counts don't match:**
1. List features with findings: `grep "^## [A-Z]" docs/REVIEW_FINDINGS.md`
2. Compare to tracker marks: `grep "✅" docs/REVIEW_TRACKER.md`
3. Update REVIEW_TRACKER.md for any missing ✅ marks
4. Update Quick Stats table to match
5. Update PM_DASHBOARD.md with correct counts

> ⚠️ **DO NOT PROCEED** until these counts match. This prevents the "phantom agent" problem where agents completed but weren't tracked.

---

## Phase 2.6: Clarification Questions (REQUIRED)

> ⚠️ **STOP:** Before creating any tickets, PM must ask clarifying questions.

**2.6.1 Wait for Agents to Complete**
```bash
cat docs/REVIEW_FINDINGS.md | tail -100   # Check new findings
grep -c "^#### [0-9]" docs/REVIEW_FINDINGS.md  # Count findings
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

**3.2 Create Tickets for Approved Findings**

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
| `docs/DOC_TRACKER.md` | ✅ Read/Write | ✅ Read |
| `docs/REVIEW_TRACKER.md` | - | ✅ Read/Write |
| `docs/REVIEW_FINDINGS.md` | - | ✅ Read/Write |
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
