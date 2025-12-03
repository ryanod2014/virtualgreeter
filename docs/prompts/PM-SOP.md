# 🔄 PM Session SOP (Standard Operating Procedure)

> **This is the checklist PM runs at EVERY session start.**
> 
> **Human's Command:** 
> `You are PM. Read docs/prompts/PM-AGENT.md and run the SOP.`

---

## 🎯 SOP GOAL

**Output a UNIFIED BRIEFING that gives the human:**
1. All agents they can launch in parallel (with one-liners)
2. All decisions they need to make (with options + recommendations)
3. All UI reviews pending
4. All initiatives awaiting approval

**Human responds ONCE. PM executes EVERYTHING.**

---

## 📋 THE 8-STEP CHECKLIST

Execute steps 1-8 in order, then output the UNIFIED BRIEFING.

---

### STEP 1: SCAN ALL STATE (Read-Only)

Read these files and note current state:

```
□ docs/AGENT_TASKS.md                    → Pipeline status, what's running
□ docs/agent-inbox/completions.md        → Agent completion signals (NEW!)
□ docs/findings/session-*.md             → Questions, blockers, criticals
□ docs/FEATURE_BACKLOG.md                → Deferred work
□ docs/strategy/INSIGHTS-LOG.md          → Unprocessed strategy findings
```

Run these checks:
```bash
□ git branch | grep "fix/\|SEC\|STRIPE"  → Actual branch state
□ ls docs/features/                      → Completed docs
□ ls docs/strategy/                      → Completed strategy reports
```

---

### STEP 2: PROCESS AGENT COMPLETIONS

**Check `docs/agent-inbox/completions.md` for new entries.**

For each completion since last session:

| Status | PM Action |
|--------|-----------|
| `STARTED` | Note agent is active, lock files in task board |
| `COMPLETE` (Dev) | Create Review Agent spec |
| `COMPLETE` (Review - Approved) | Create QA Agent spec |
| `COMPLETE` (Review - Rejected) | Note feedback, needs dev rework |
| `COMPLETE` (QA - Pass, no UI) | Mark ready to merge (PM auto-merges) |
| `COMPLETE` (QA - Pass, has UI) | Add to Human Review queue |
| `COMPLETE` (QA - Fail) | Route back to dev |
| `BLOCKED` | Add question to Human Decisions needed |

**After processing, clear the entries from completions.md.**

---

### STEP 3: RECONCILE TASK BOARD

Compare actual state vs `AGENT_TASKS.md`. Fix ALL discrepancies:

```
□ Branches that exist but board says "empty" → Update to ✅
□ Completed work not reflected              → Move to correct status
□ Stale "in progress" with no activity      → Mark as stalled
□ Missing tickets from findings             → Create them
□ File locks for finished work              → Remove them
```

**Update AGENT_TASKS.md to match reality BEFORE continuing.**

---

### STEP 4: GATHER ALL HUMAN DECISIONS NEEDED

Collect from all sources into categories:

**A) 🔴 BLOCKERS (Agents are stuck)**
From: `findings/session-*.md`, `completions.md` BLOCKED entries
- Questions from agents (Q-XXX)
- Critical issues requiring human judgment (CRIT-XXX)
- Decisions blocking agent progress

**B) 🎨 UI REVIEWS (Before merge)**
From: QA completions with UI flag
- QA-passed tickets with visual changes
- Need: Screenshots + checklist paths

**C) 📋 INITIATIVE APPROVALS (Start new work)**
From: `FEATURE_BACKLOG.md`, strategy findings, new tickets
- Proposed tickets not yet approved
- Strategy findings needing action decisions
- Backlog items ready to surface

---

### STEP 5: ANALYZE PARALLELISM

For all APPROVED work, map file dependencies:

```
□ List all approved tickets not yet started
□ List files each ticket touches
□ Identify conflicts (same file = sequential)
□ Identify parallel-safe groups
□ Note any blockers (dependencies on other tickets)
□ Check against currently running agents' file locks
```

**Output:** Parallel execution plan (which can run together)

---

### STEP 6: CREATE SPECS FOR READY WORK

For each approved ticket ready to launch:

```
□ Spec exists in docs/prompts/active/ ?
  - Yes → Add to launch list
  - No  → Create spec from template, then add
□ Verify no file conflicts with running agents
□ Verify dependencies are met
```

**Use templates from `docs/prompts/templates/`:**
- Dev work → `DEV-AGENT.md` template
- Documentation → `DOC-AGENT.md` template
- Review → `REVIEW-AGENT.md` template
- QA → `QA-AGENT.md` template
- Strategy → `STRATEGY-AGENT.md` template

---

### STEP 7: FORMULATE DECISION QUESTIONS

For EACH human decision needed, prepare:

```
□ Context (1-2 sentences: what's the situation)
□ Option A + implication
□ Option B + implication  
□ Option C + implication (if applicable)
□ PM Recommendation with reasoning
```

**NEVER present open-ended questions. Always provide options.**

---

### STEP 8: GENERATE UNIFIED OUTPUT

Present everything using the format below.

---

## 📊 UNIFIED SESSION OUTPUT FORMAT

```
═══════════════════════════════════════════════════════════════
                    PM SESSION BRIEFING
═══════════════════════════════════════════════════════════════

📈 PIPELINE STATUS
┌─────────────────────────────────────────────────────────────┐
│ Running Now: [N] agents                                     │
│ ├── [Agent Type]: [TICKET] - [Brief status]                │
│ ├── [Agent Type]: [TICKET] - [Brief status]                │
│                                                             │
│ Completed Since Last: [N] items                            │
│ ├── ✅ [TICKET]: [What completed]                           │
│                                                             │
│ Blocked: [N] items                                          │
│ ├── ❌ [TICKET]: [Why blocked - links to Q below]           │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
          🚀 AGENTS READY TO LAUNCH (Parallel-Safe)
═══════════════════════════════════════════════════════════════

These can ALL run simultaneously without conflicts:

│  #  │  Ticket   │  Type  │  One-Liner                                    │
├─────┼───────────┼────────┼───────────────────────────────────────────────┤
│  1  │ FIX-001   │ Dev    │ `Read and execute docs/prompts/active/dev-...`│
│  2  │ FIX-004   │ Dev    │ `Read and execute docs/prompts/active/dev-...`│
│  3  │ SEC-002   │ Review │ `Read and execute docs/prompts/active/rev-...`│
│  4  │ DOC-P6    │ Doc    │ `Read and execute docs/prompts/active/doc-...`│

Files touched (no conflicts):
- FIX-001 → pool-manager.ts
- FIX-004 → socket-handlers.ts  
- SEC-002 → (review only, no file changes)
- DOC-P6  → (read-only, no conflicts)

⚡ RESPOND: "Launch all" or "Launch 1, 2, 4"

═══════════════════════════════════════════════════════════════
              ❓ DECISIONS NEEDED FROM YOU
═══════════════════════════════════════════════════════════════

### Q1: [Short title] ← blocks [TICKET]

**Situation:** [1-2 sentence context]

**Options:**
  A. [Option] → [Implication]
  B. [Option] → [Implication]  
  C. [Option] → [Implication]

**🎯 PM Recommends: [A/B/C]** because [reasoning]

⚡ RESPOND: "Q1: A" or "Q1: B" etc.

---

### Q2: [Short title] ← blocks [TICKET]

[Same format]

⚡ RESPOND: "Q2: [letter]"

═══════════════════════════════════════════════════════════════
              🎨 UI REVIEWS AWAITING YOU
═══════════════════════════════════════════════════════════════

### [TICKET]: [Component changed]

📸 Screenshot: [path or describe what to look at]
📋 Checklist: `docs/qa-checklists/[TICKET]-human-qa.md`
🔗 Branch: `fix/[TICKET]-description`

⚡ RESPOND: "[TICKET]: APPROVED" or "[TICKET]: REJECTED - [reason]"

═══════════════════════════════════════════════════════════════
              📋 INITIATIVES AWAITING APPROVAL  
═══════════════════════════════════════════════════════════════

### I1: [Initiative name]

**What:** [Brief description]
**Why now:** [Trigger or opportunity]
**Effort:** [Low/Med/High]
**If we skip:** [Risk or missed opportunity]

**🎯 PM Recommends:** [Approve/Defer] because [reasoning]

⚡ RESPOND: "I1: Approve" or "I1: Defer"

═══════════════════════════════════════════════════════════════
                    📝 QUICK RESPONSE GUIDE
═══════════════════════════════════════════════════════════════

Copy-paste format for your response:

Launch [all / 1, 2, 4]
Q1: [A/B/C]
Q2: [A/B/C]
[TICKET]: APPROVED
[TICKET]: REJECTED - [reason]
I1: [Approve/Defer]

═══════════════════════════════════════════════════════════════
```

---

## 🎯 WHAT PM DOES WITH YOUR RESPONSES

| You Say | PM Does |
|---------|---------|
| `Launch all` | Confirms all agents launching, updates task board |
| `Launch 1, 3` | Launches those, keeps others queued |
| `Q1: B` | Logs decision to findings, creates continuation spec if needed |
| `[TICKET]: APPROVED` | Merges branch, updates changelog, moves to completed |
| `[TICKET]: REJECTED - X` | Routes feedback to dev, updates status to needs rework |
| `I1: Approve` | Creates tickets, adds to pipeline, includes in next launch batch |
| `I1: Defer` | Adds to backlog with context for later |

---

## ⚡ PM AUTO-ACTIONS (No Human Approval Needed)

PM does these WITHOUT asking:

| Action | Trigger |
|--------|---------|
| Create Review Agent spec | Dev agent completes |
| Create QA Agent spec | Review agent approves |
| Merge non-UI work | QA passes, no visual changes |
| Update task board | Any state change |
| Log decisions to findings | Human answers question |
| Archive completed work | After merge |
| Track/release file locks | Agent start/complete |
| Clear completions.md | After processing |

---

## 🔄 WHEN TO RUN SOP

| Trigger | Action |
|---------|--------|
| New PM session start | Full SOP (Steps 1-8) |
| Human returns after break | Full SOP |
| Human says "status" or "what's next" | Full SOP |
| Every 30-60 min during active work | Full SOP |
| Agent completes (mid-session) | Quick update: Steps 2-3 only, then brief status |

---

## 🚨 SOP RULES

1. **ALWAYS present ready-to-launch agents** - Every briefing shows what can run
2. **ALWAYS include PM recommendations** - Never just list options
3. **ALWAYS show file conflicts** - Human needs to trust parallelism
4. **NEVER ask open-ended questions** - Provide A/B/C options for everything
5. **BATCH everything** - One unified output, human responds once
6. **MAKE IT SKIMMABLE** - Human should understand status in 10 seconds
7. **UPDATE TASK BOARD FIRST** - Before generating output, reconcile state

---

## 📝 EXAMPLE HUMAN RESPONSE (All-in-One)

```
Launch all
Q1: B
Q2: A  
I1: Approve
I2: Defer
STRIPE-003: APPROVED
SEC-002: REJECTED - button too close to edge on mobile
```

PM handles everything from this single response:
- Launches all agents
- Logs Q1/Q2 decisions, creates continuations if needed
- Creates tickets for I1
- Adds I2 to backlog
- Merges STRIPE-003, updates changelog
- Routes SEC-002 rejection to dev with feedback

---

## 🔗 RELATED FILES

- `docs/prompts/PM-AGENT.md` - Full PM instructions
- `docs/prompts/templates/` - Agent spec templates
- `docs/AGENT_TASKS.md` - Task board
- `docs/agent-inbox/completions.md` - Agent notifications
- `docs/findings/session-*.md` - Questions and blockers

