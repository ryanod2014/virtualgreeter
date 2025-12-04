# Dev Blocked Queue

> **Purpose:** Dev agents report blockers here. Human reviews and makes decisions.
> **Flow:** Dev Agent → Blocked Report → Human Decision → PM creates continuation ticket

---

## Decision Legend

| Status | Meaning |
|--------|---------|
| ⏳ PENDING | Awaiting human decision |
| ✅ DECIDED | Human chose an option |
| 🔄 MODIFIED | Human chose different approach |

---

## Active Blockers

<!-- Dev agents append blockers below this line -->

_No active blockers._

---

## Resolved Blockers

<!-- PM moves resolved items here for reference -->

_No resolved blockers yet._

---

## How to Use

### For Dev Agents

When blocked, append your blocker using this format:

```markdown
---

### TKT-XXX - [Ticket Title]

**Blocked:** [date]
**Branch:** `agent/TKT-XXX-description`

---

#### Progress So Far

**Commits Made:**
1. `a1b2c3d` - [message]
2. `e4f5g6h` - [message]

**Files Created:**
- `path/to/new-file.ts` — [purpose]

**Files Modified:**
- `path/to/file.ts` — [what changed, lines X-Y]

**Current State:**
- ✅ [Done item]
- ✅ [Done item]
- 🔄 [Blocked item] ← YOU ARE HERE
- ⬜ [Not started]
- ⬜ [Not started]

**Where I Stopped:**
Line 52 of `path/to/file.ts` — was about to [action] but need clarification.

**Notes for Next Agent:**
[Anything important about approach taken, decisions made]

---

#### Question
[Specific question — be precise]

#### Options
1. **[Option name]** — [Description + tradeoffs]
2. **[Option name]** — [Description + tradeoffs]
3. **[Option name]** — [Description + tradeoffs]
4. **Skip** — [If applicable]

#### Recommendation
**Option [N]** — [Why, one sentence]

#### Human Decision
⏳ PENDING

---
```

### For Human

1. Review each blocker in Active Blockers section
2. Choose an option or specify different approach
3. Tell PM: "TKT-XXX: Option 1" or "TKT-XXX: Do X instead"
4. PM will create continuation ticket and move blocker to Resolved

### For PM

1. Read Active Blockers section
2. Present each to human with options
3. After human decides:
   - Create continuation ticket (`dev-agent-TKT-XXX-v2.md`)
   - Move blocker to Resolved section with decision noted
   - Output launch command for continuation

