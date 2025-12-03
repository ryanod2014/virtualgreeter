# PM Documentation Workflow

> **Purpose:** PM workflow for documentation sprints AND review sprints.
> **Launch Commands:**
> - **Doc Mode:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md`
> - **Review Mode:** `You are the PM. Read and execute docs/workflow/PM_DOCS_SOP.md - Review Mode`

---

## PM Responsibilities

### Mode 1: Documentation Sprint
1. Create doc-agent prompts for undocumented features
2. Output launch commands for parallel execution
3. Handle Git automatically

### Mode 2: Review Sprint
1. Create review-agent prompts for documented features
2. Output launch commands for parallel execution
3. Collect findings from `REVIEW_FINDINGS.md`
4. **Present ALL findings to Human for decisions**
5. Create tickets in `TICKET_BACKLOG.md` for approved items

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

## Phase 3: Collect & Present Findings

**3.1 Wait for Agents to Complete**
```bash
cat docs/REVIEW_FINDINGS.md | tail -100   # Check new findings
```

**3.2 Present to Human**

⚠️ **CRITICAL: Human makes ALL decisions. PM presents, does not decide.**

For each finding, present to Human:

```markdown
## Finding Review - [FEATURE-ID]

**Issue:** [description]
**Category:** [type]
**Severity:** [level]
**Agent Suggestion:** [what agent recommended]

**Options:**
1. ✅ Approve as-is → Create ticket
2. 🔄 Modify → Create ticket with changes
3. ❌ Reject → Not a real issue
4. ⏸️ Defer → Revisit later

**Your decision?**
```

**3.3 Record Decisions**

Update `REVIEW_FINDINGS.md` with Human's decision:
- Change `⏳ PENDING` to `✅ APPROVED`, `❌ REJECTED`, or `🔄 MODIFIED`
- Add any notes from Human

---

## Phase 4: Create Tickets

**4.1 For Each Approved Finding**

Add to `docs/TICKET_BACKLOG.md`:

```markdown
| TKT-[NNN] | [Feature] | [Issue summary] | [Finding ref] | 📋 Ready |
```

**4.2 Assign Priority**

Ask Human for priority on each ticket:
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Low

**4.3 Commit Updates**
```bash
git add docs/REVIEW_FINDINGS.md docs/TICKET_BACKLOG.md
git commit -m "docs: review findings processed, [N] tickets created"
git push
```

---

## Phase 5: Archive & Cleanup

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
git add docs/REVIEW_FINDINGS.md docs/TICKET_BACKLOG.md
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
| `docs/FEATURE_INVENTORY.md` | ✅ Read | ✅ Read |
| `docs/DOC_TRACKER.md` | ✅ Read/Write | ✅ Read |
| `docs/REVIEW_TRACKER.md` | - | ✅ Read/Write |
| `docs/REVIEW_FINDINGS.md` | - | ✅ Read/Write |
| `docs/TICKET_BACKLOG.md` | - | ✅ Write |
| `docs/workflow/templates/doc-agent.md` | ✅ Use | - |
| `docs/workflow/templates/review-agent.md` | - | ✅ Use |
| `docs/prompts/active/` | ✅ Write | ✅ Write |
| `docs/features/` | ✅ Output | ✅ Read |

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

## Review Mode Example
```
PM starts in Review Mode...

1. Check current state → 0 findings, 0 tickets
2. Decide scope → Full review (50 features)
3. Create 50 review-agent prompts
4. Commit prompts
5. Output 50 launch commands
6. Human launches agents
7. Agents report 127 findings
8. PM presents each finding to Human
9. Human approves 45, rejects 70, modifies 12
10. PM creates 57 tickets in backlog
11. Commit and archive
```

---

# TROUBLESHOOTING

**Q: Agent produced bad findings**
A: Re-launch that one agent, or manually edit REVIEW_FINDINGS.md

**Q: Human wants to change a decision**
A: Update REVIEW_FINDINGS.md and TICKET_BACKLOG.md accordingly

**Q: How do I know what's been reviewed?**
A: Check `REVIEW_TRACKER.md` for completion status (✅ = done, ⏳ = pending)

**Q: Can I run both modes at once?**
A: Yes, but use separate PM sessions to avoid confusion
