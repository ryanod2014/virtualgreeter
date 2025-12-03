# 🎯 Multi-Agent Workflow Guide

> **Bookmark this file.** Reference it whenever you're unsure what to do next.

---

## TL;DR - The 7 Phases

```
📚 DOCUMENT → 💬 DISCUSS → 📋 PLAN → 🛠️ BUILD → 🔍 REVIEW → ✅ QA → 👤 APPROVE
```

| Phase | Who | What They Do | Your Role |
|-------|-----|--------------|-----------|
| 📚 Document | Doc Agents (parallel) | Research & document features, find issues | Spawn when PM says |
| 💬 Discuss | You + PM Agent | Review critical issues, answer questions | Make decisions |
| 📋 Plan | PM Agent | Create fix tickets from findings | Review priorities |
| 🛠️ Build | Dev Agents | Implement fixes on feature branches | Spawn when PM says |
| 🔍 Review | Review Agent | Code review before QA | **None - PM auto-spins** |
| ✅ QA | QA Agent | Test with browser, screenshots, API | **None - PM auto-spins** |
| 👤 Approve | You | Test WebRTC/video/UI, final sign-off | Only if UI changes |

**PM auto-progresses:** Dev → Review → QA → Merge (or alert you for UI)

---

## 🧹 Cleanup (PM Handles)

**Completed items are moved immediately. Don't clutter active sections.**

| When | PM Does |
|------|---------|
| Ticket merged | Move to "Completed This Session" |
| End of session | Move completed to Archive |
| Answer logged | Remove from "Needs Attention" |
| File lock released | Remove from lock table |

You never need to clean up. PM keeps everything tidy.

---

## 🤖 PM Auto-Progression

**PM has unlimited agents. PM doesn't wait for you.**

| Event | PM Automatically Does |
|-------|----------------------|
| Dev reports complete | Spins up Review Agent |
| Review approves | Spins up QA Agent |
| QA passes (no UI) | Merges + updates changelog |
| QA passes (has UI) | Alerts you for approval |
| Any agent fails | Routes back to previous agent |

**You only get involved for:**
- Questions requiring your decision
- UI approvals
- WebRTC/video/audio testing
- Spawning initial doc/dev agents (PM gives you one-liners)

---

## 🚀 Quick Start: The PM Session

### Starting ANY Session (The Standard Flow)

**One command to start:**
```
You are PM. Read docs/prompts/PM-AGENT.md and run the SOP.
```

**What happens:**
1. PM runs the 8-step SOP checklist
2. PM outputs a **UNIFIED BRIEFING** with:
   - 🚀 All agents ready to launch (one-liners)
   - ❓ All decisions needed (with options + recommendations)
   - 🎨 All UI reviews pending
   - 📋 All initiatives awaiting approval
3. You respond to everything at once
4. PM executes everything, gives you final one-liners
5. You launch agents in background tabs
6. PM session ends
7. Later: Start new PM session to check progress

### Your Response Format

```
Launch all
Q1: B
Q2: A
STRIPE-003: APPROVED
I1: Approve
I2: Defer
```

That's it. PM handles everything from this single response.

### Starting a Documentation Session (Legacy - Still Works)

1. [ ] Open PM Agent chat
2. [ ] Tell PM: "Start documentation session for [feature IDs]"
3. [ ] PM runs SOP and includes doc agent specs in briefing
4. [ ] Approve and launch

### Spawning an Agent (The Easy Way)

PM will say: "Spawn agent with this one-liner:"
```
Read and execute the spec in docs/prompts/active/doc-agent-1-P2.md
```

You just:
1. Open new background agent
2. Paste that one line
3. Done - agent reads spec and works

### When Doc Agent Finds Critical Issue (🔴)

1. [ ] Doc agent adds to findings file with `CRIT-XXX`
2. [ ] They STOP and wait
3. [ ] You see it in findings file
4. [ ] Discuss with PM: "Let's talk about CRIT-XXX"
5. [ ] Make decision
6. [ ] PM relays to agent via inbox OR you paste directly
7. [ ] PM creates TODO ticket for the fix

### When Doc Agent Has Question (🟡)

1. [ ] Doc agent adds question to findings file + reports what they've completed so far
2. [ ] **PM relays question to you in chat** (you don't read the file)
3. [ ] **You answer in chat** - just talk naturally
4. [ ] PM logs your decision to session file
5. [ ] **PM creates CONTINUATION SPEC** (see below)
6. [ ] PM gives you one-liner to spawn agent that picks up where it left off

---

## 🔄 Continuation Specs (Picking Up Where Agents Left Off)

**Template:** `docs/prompts/templates/CONTINUATION-SPEC.md`

When you answer a question in the session file, a new agent spec is needed so work can continue. Here's exactly how it works:

### Step-by-Step Process

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Agent asks question (Q-XXX)                                  │
│    └─► Added to docs/findings/session-*.md                      │
│                                                                 │
│ 2. PM relays question to you in chat                            │
│                                                                 │
│ 3. You answer in chat                                           │
│    └─► Example: "Option B - sync the timeouts"                  │
│                                                                 │
│ 4. PM logs decision to session file under DECISIONS LOG         │
│                                                                 │
│ 5. PM creates CONTINUATION SPEC:                                │
│    └─► File: docs/prompts/active/[agent]-CONTINUED.md           │
│                                                                 │
│ 6. PM gives you spawn command:                                  │
│    └─► "Read and execute docs/prompts/active/doc-agent-10-V4-CONTINUED.md" │
│                                                                 │
│ 7. You spawn agent with that one-liner                          │
│    └─► Agent picks up exactly where previous left off           │
└─────────────────────────────────────────────────────────────────┘
```

### What's In a Continuation Spec

| Section | Purpose |
|---------|---------|
| **Previous Agent's Progress** | What phases were completed (Research ✅, Document ✅, etc.) |
| **Files Already Created** | So new agent reads existing work, doesn't redo it |
| **Questions + Your Answers** | The blocking question AND your decision |
| **Action Required** | Specific tasks: update docs, create fix ticket, just note it |
| **Remaining Phases** | What work still needs to be done |
| **Original Context** | Key files, feature overview from original spec |

### Example Continuation Spec

See `docs/prompts/active/doc-agent-10-V4-CONTINUED.md` for a real example.

This shows Doc Agent 10 continuing after 4 questions (Q-V4-001 through Q-V4-004) were answered.

### Naming Convention

| Original Spec | Continuation Spec |
|---------------|-------------------|
| `doc-agent-10-V4.md` | `doc-agent-10-V4-CONTINUED.md` |
| `dev-agent-1-FIX001.md` | `dev-agent-1-FIX001-CONTINUED.md` |

If an agent needs to stop again (rare), use `-CONTINUED-2.md`.

### PM's Checklist for Creating Continuation Specs

- [ ] Copy template from `docs/prompts/templates/CONTINUATION-SPEC.md`
- [ ] Fill in previous agent's progress accurately
- [ ] Include the FULL original question + your EXACT answer
- [ ] Specify what action the answer requires
- [ ] List only the REMAINING phases (skip completed ones)
- [ ] Include original context for reference
- [ ] Save to `docs/prompts/active/[agent]-CONTINUED.md`
- [ ] Give you the one-liner spawn command

---

### When Documentation Complete

1. [ ] Doc agent reports completion
2. [ ] You review the doc file
3. [ ] All issues converted to TODOs
4. [ ] Update feature status in `FEATURE_DOCUMENTATION_TODO.md`

---

## 📁 Key Files & Where to Find Things

| What You Need | Where It Is |
|---------------|-------------|
| What features to document | `docs/FEATURE_DOCUMENTATION_TODO.md` |
| Today's findings | `docs/findings/session-YYYY-MM-DD.md` |
| Fix tickets & status | `docs/AGENT_TASKS.md` |
| Send message to agent | `docs/agent-inbox/[agent-name].md` |
| **Active agent specs** | `docs/prompts/active/` |
| Template prompts | `docs/prompts/templates/` |
| Completed feature docs | `docs/features/[category]/` |
| **Agent credentials** | `docs/secrets/credentials.md` (gitignored) |
| Credentials inventory | `docs/secrets/CREDENTIALS-NEEDED.md` |

---

## 🔑 Credentials for Browser Agents

When agents need to log into platforms (Vercel, Stripe, etc.):

### Files
- `docs/secrets/CREDENTIALS-NEEDED.md` - Inventory of what credentials exist (in git)
- `docs/secrets/credentials.md` - Actual passwords (GITIGNORED, never commit)

### Flow
1. Agent needs to log in to platform
2. Agent checks `docs/secrets/credentials.md`
3. **If credential exists:** Agent uses it
4. **If credential missing:** Agent adds to CREDENTIALS NEEDED in findings file
5. PM alerts you: "Agent needs Vercel login to continue"
6. You add credential to `credentials.md`
7. PM notifies agent to continue

### 2FA Platforms
Some platforms require 2FA. Agent will:
1. Report they need human help for 2FA
2. PM alerts you
3. You complete 2FA manually
4. Agent continues

---

## 🤖 Agent Types & What They Do

### Doc Agent (Documentation)
- **Job:** Research and document one feature deeply
- **Outputs:** Feature doc + findings
- **Stops when:** Finds 🔴 CRITICAL issue
- **Pauses when:** Has 🟡 QUESTION for you

### Dev Agent (Implementation)
- **Job:** Fix one ticket from AGENT_TASKS.md
- **Outputs:** Code changes + verification results
- **Stops when:** Has question about requirements
- **Reports:** "READY FOR QA" when code verified

### QA Agent (Testing)
- **Job:** Test a completed fix using browser/API/DB
- **Outputs:** QA Report with screenshots
- **Flags:** What needs HUMAN review (UI, WebRTC, video)

---

## 🔒 Conflict Prevention

**PM's job:** Before assigning any dev task, check for file conflicts.

### How It Works

1. **Each task specifies files:** "Files to Modify: X, Y, Z"
2. **Agents signal STARTED** - immediately after git setup, agents append to `completions.md` with `Status: STARTED` and list their `Files Locking`
3. **PM tracks active file locks** in AGENT_TASKS.md based on STARTED signals
4. **Before assigning new task:** Check if files overlap with active work
5. **If overlap detected:**
   - Wait for first agent to finish, OR
   - Sequence tasks (second waits), OR
   - Split work to different files if possible

### Agent Lifecycle Signals

| Status | When Agent Sends | PM Action |
|--------|------------------|-----------|
| **STARTED** | Right after git setup | Lock the files listed, track agent as active |
| **COMPLETE** | Work finished | Unlock files, move to review/QA |
| **BLOCKED** | Waiting on human | Alert human, create continuation spec |

### File Lock Table (in AGENT_TASKS.md)

| File | Locked By | Ticket | Status |
|------|-----------|--------|--------|
| Widget.tsx | Dev Agent 1 | FIX-003 | 🔒 Locked |
| pool-manager.ts | Dev Agent 2 | FIX-001 | 🔒 Locked |

### Safe to Run in Parallel?

| Scenario | Parallel? |
|----------|-----------|
| Different files | ✅ Yes |
| Same file | ❌ No - run sequential |
| Same file, different sections | ⚠️ Risky |

### Detecting Stalled Agents

If PM sees a STARTED signal but no COMPLETE/BLOCKED after reasonable time:
1. Check if agent is still running
2. If crashed, unlock files and reassign
3. Previous agent's attempt log helps new agent avoid repeating work

---

## 💬 Communication Patterns

### You → PM Agent (Main Chat)
Just talk naturally:
- "Start documentation for P2, V3, A2"
- "What's the status of all agents?"
- "Answer to Q-001 is: use 30 second timeout"
- "Create a fix ticket for CRIT-002"

### PM Agent → Worker Agent
PM writes to their inbox file. Worker checks it.

### You → Worker Agent (Urgent/Direct)
If you need to tell an agent something immediately:
1. Find their background agent tab
2. Paste message directly

### Worker Agent → You
They add to:
- `docs/findings/session-XXX.md` (issues/questions)
- Their completion report

---

## ✅ Verification Checklist

### Before Marking Documentation "Complete"
- [ ] All states documented
- [ ] All edge cases covered
- [ ] Critical issues flagged as CRIT-XXX
- [ ] Questions flagged as Q-XXX
- [ ] Code references accurate

### Before Marking Dev Work "Ready for QA"
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] Only modified allowed files

### Before You Approve (Human Review)
- [ ] QA agent report reviewed
- [ ] Screenshots look correct (no "AI slop")
- [ ] UI changes manually verified
- [ ] WebRTC tested (if applicable)
- [ ] Video/audio tested (if applicable)

---

---

## 🧪 QA Process

### Two-Part Verification

| Part | Who | What They Test |
|------|-----|----------------|
| **Automated QA** | QA Agent | API responses, DB state, UI renders, click flows, console errors |
| **Human QA** | You/Team | Visual correctness, WebRTC, video, audio, mobile, UX feel |

### QA Agent Output

QA agent produces:
1. **Automated Test Results** - PASS/FAIL for each scenario
2. **Screenshots** - Before/after for UI changes
3. **Human QA Checklist** - Exact scenarios YOU must test with expected behavior

### Human QA Checklist Format

QA agent generates this for things they can't test:

```
#### HT-1: [Scenario Name]
**Setup:** [Exact conditions]
**Steps:** [What to do]
**Expected:** [What should happen]
**Look for:** [Specific things to verify]
**Result:** ⬜ PASS / ⬜ FAIL
```

You follow the checklist, mark PASS/FAIL, done.

---

## 🎨 Human Review Queue (UI Changes)

**ALL UI changes require your approval before merge. No exceptions.**

### Where to Find Items Needing Your Review

1. **Session file:** `docs/findings/session-*.md` → **🎨 AWAITING YOUR REVIEW** section
2. **QA Checklist:** `docs/qa-checklists/[TICKET]-human-qa.md`

### What PM Shows You

When something needs your review:
```
🎨 FIX-003 needs your UI review:
- Changed: Handoff message in Widget.tsx
- Screenshot: [attached or path]
- QA Checklist: docs/qa-checklists/FIX-003-human-qa.md

Please test and reply: "FIX-003: APPROVED" or "FIX-003: REJECTED - [reason]"
```

### Your Review Process

1. Look at screenshot(s)
2. Open the QA checklist
3. Test in browser yourself (localhost or staging)
4. Reply to PM:
   - ✅ "FIX-003: APPROVED" → PM merges
   - ❌ "FIX-003: REJECTED - button too small on mobile" → Back to dev

### Review Flow

```
QA Agent completes
        ↓
Has UI changes? ──No──→ PM can merge after QA passes
        │
       Yes
        ↓
Added to "AWAITING YOUR REVIEW" in session file
        ↓
PM alerts you with screenshot + checklist link
        ↓
You test and respond
        ↓
┌─────────────┬──────────────────┐
│ APPROVED    │ REJECTED         │
├─────────────┼──────────────────┤
│ PM merges   │ Back to Dev      │
│ Updates     │ Agent with your  │
│ changelog   │ feedback         │
└─────────────┴──────────────────┘
```

---

## 🔴 Things That ALWAYS Need Human Review

No matter what the agent says, YOU must verify:

| Category | Why Agents Can't Verify | Your Test |
|----------|------------------------|-----------|
| **UI Changes** | Can't judge aesthetics | Look at screenshots, check in browser |
| **WebRTC** | Can't make real calls | Test actual call between 2 browsers |
| **Video** | Can't see playback quality | Watch the videos play |
| **Audio** | Can't hear | Listen to audio in call |
| **Mobile** | No physical device | Test on your phone |
| **"Feel"** | No UX judgment | Does it feel right? |

---

## 🚨 Common Mistakes to Avoid

| Mistake | Why It's Bad | What To Do Instead |
|---------|--------------|-------------------|
| Approving without running tests | Broken code gets merged | Always run `pnpm typecheck && pnpm lint && pnpm test && pnpm build` |
| Skipping human review on UI | "AI slop" aesthetics ship | Always look at screenshots yourself |
| Not answering questions | Agents stay blocked | Check findings file regularly |
| Letting agents modify wrong files | Scope creep, side effects | Check `git diff --stat` before approving |
| Forgetting to update task board | Lose track of status | PM agent should update after each change |

---

## 🎮 Example Session Walkthrough

### Morning: Documentation Phase

**9:00 AM - Start session**
```
You: "Start documentation session for P2 (Agent Assignment), 
      V3 (Visitor Call), and A2 (Incoming Call)"

PM: "Created session file. Here are 3 doc agent prompts..."

You: [Spawn 3 background agents with prompts]
```

**9:30 AM - Check findings**
```
[Open docs/findings/session-2024-12-02.md]

See:
🔴 CRIT-001: Duplicate call requests possible
🟡 Q-001: Should RNA timeout be 15s or 30s?
```

**9:35 AM - Handle critical**
```
You: "CRIT-001 is definitely a bug. We should debounce 
      and check for existing calls."

PM: "Got it. Adding FIX-001 to task board. Notifying Doc Agent 2."
```

**9:40 AM - Answer question**
```
You: "Q-001: Use 30 second RNA timeout."

PM: "Sending to Doc Agent 3's inbox. Logging decision."
```

### Afternoon: Fix Phase

**1:00 PM - Start fixes**
```
You: "What fix tickets are ready?"

PM: "FIX-001 (P0) and FIX-002 (P1) are ready. 
     Here are the dev agent prompts..."

You: [Spawn 2 dev agents]
```

**2:30 PM - Dev agent reports done**
```
Dev Agent 1: "FIX-001 complete. 
             typecheck ✓, lint ✓, test ✓, build ✓
             Modified: useSignaling.ts, socket-handlers.ts
             READY FOR QA"
```

**2:35 PM - Start QA**
```
You: "Start QA on FIX-001"

PM: "Here's the QA agent prompt..."

You: [Spawn QA agent]
```

**3:00 PM - QA report ready**
```
QA Agent: "QA Report for FIX-001:
          ✅ API tests pass
          ✅ DB state correct
          🔴 HUMAN REVIEW: UI shows toast notification (screenshot attached)"
```

**3:05 PM - Human review**
```
You: [Look at screenshot - toast looks good]
     [Test in browser - clicking button rapidly only makes 1 call]
     
     "FIX-001 approved. Merge it."

PM: "Marked complete. Committing..."
```

---

## 📋 Quick Reference Commands

### For PM Agent (New SOP Flow)
- `"You are PM. Read docs/prompts/PM-AGENT.md and run the SOP."` ← **Start here**
- `"Launch all"` ← Launch all ready agents
- `"Launch 1, 3"` ← Launch specific agents
- `"Q1: B"` ← Answer a decision question
- `"[TICKET]: APPROVED"` ← Approve UI for merge
- `"[TICKET]: REJECTED - [reason]"` ← Reject with feedback
- `"I1: Approve"` ← Approve initiative
- `"I1: Defer"` ← Defer to backlog

### For PM Agent (Legacy Commands - Still Work)
- "Start documentation session for [features]"
- "What's the status?"
- "Create fix ticket for [issue]"
- "Send to [agent]: [message]"
- "What needs my attention?"

### For Yourself
```bash
# Check what agents changed
git diff --stat

# Run all verification
pnpm typecheck && pnpm lint && pnpm test && pnpm build

# Start dev servers for testing
pnpm dev
```

---

## 🆘 When You're Lost

1. **Start a PM session:** `You are PM. Read docs/prompts/PM-AGENT.md and run the SOP.`
   - PM will scan everything and tell you exactly what needs attention
2. **Open this file** - You're here!
3. **Check `docs/AGENT_TASKS.md`** - See pipeline status
4. **Check `docs/findings/session-XXX.md`** - See outstanding issues

**The SOP is your friend.** When in doubt, start a PM session and let PM tell you what's happening.

---

*Last updated: 2024-12-02*

