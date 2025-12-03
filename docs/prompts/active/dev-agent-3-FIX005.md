# Dev Agent 3: FIX-005 (Investigation)

You are a Dev Agent. Your job is to **investigate** (NOT fix yet) **FIX-005: Widget State After Call Ends**.

## Your Assignment

**Ticket:** FIX-005
**Priority:** P2 (Medium)
**Source:** Q4 Decision (verification needed)
**Type:** 🔍 INVESTIGATION ONLY

**Question to Answer:**
What widget state shows after a call ends? We need to verify the current behavior before deciding if changes are needed.

**Investigate:**
1. What widget state shows after **agent clicks End**?
2. What widget state shows after **visitor clicks End**?
3. Is it currently a minimized circle, hidden, or something else?
4. What SHOULD it be? (Make a recommendation)

**Files to READ (not modify):**
- `apps/widget/src/Widget.tsx` - Main widget component

**Files NOT to Modify:**
- ALL files - this is investigation only!

**Expected Output:**
A detailed investigation report (not code changes).

## Your SOP (Follow This Exactly)

### Phase 0: Git Setup

**This is investigation only - no branch needed, but verify you're on main:**

```bash
git checkout main
git pull origin main
```

### Phase 1: Read & Trace (15-20 min)

1. **Read** `apps/widget/src/Widget.tsx`
2. **Find** the call end handlers - search for:
   - `CALL_ENDED` event handler
   - `handleEndCall` or similar function
   - State changes after call ends
3. **Trace** what happens to widget state when:
   - Agent ends call (server sends CALL_ENDED with reason)
   - Visitor clicks end button
4. **Document** the exact state transitions

### Phase 2: Analyze Widget States

Find and document:
- What are all possible widget states? (hidden, minimized, open, fullscreen, etc.)
- What state does widget go to after call ends?
- Is there different behavior for different end reasons?

### Phase 3: Investigation Report

**Create your report in this format:**

```markdown
## Investigation Report: FIX-005 - Widget State After Call Ends

### Current Behavior

**Widget States Found:**
| State | Description | When It Occurs |
|-------|-------------|----------------|
| [state1] | [description] | [trigger] |
| [state2] | [description] | [trigger] |

**After Agent Ends Call:**
- Event received: [what event]
- State transition: [from] → [to]
- What visitor sees: [description]
- Code location: `Widget.tsx` lines [X-Y]

**After Visitor Ends Call:**
- Button clicked: [what button/action]
- State transition: [from] → [to]
- What visitor sees: [description]
- Code location: `Widget.tsx` lines [X-Y]

### Key Code References

```typescript
// Paste relevant code snippets with line numbers
```

### Analysis

**Is current behavior correct?**
- [ ] Yes, works as expected
- [ ] No, there's a bug
- [ ] Unclear, needs product decision

**If there's an issue:**
[Describe what's wrong]

### Recommendation

**What SHOULD happen:**
- After agent ends: [recommendation]
- After visitor ends: [recommendation]
- After disconnect/error: [recommendation]

**Suggested changes (if any):**
[High-level description of what would need to change]

**Effort estimate:** [if changes needed]

### Questions for Human

1. [Any clarifying questions about expected behavior]

### Status: INVESTIGATION COMPLETE
```

## Rules

1. **DO NOT MODIFY ANY CODE** - This is investigation only
2. **Be thorough** - Read all relevant code paths
3. **Document with line numbers** - So we can reference later
4. **Make a clear recommendation** - What should the behavior be?

## Deliverable

Your investigation report. No code changes, no branch, just findings.

Post your report as your completion message.

