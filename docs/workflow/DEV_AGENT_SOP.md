# Dev Agent SOP

> **Purpose:** Implement tickets. That's it.
> **One-liner to launch:** `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute your ticket prompt.`

---

## Your Job

```
┌─────────────────────────────────────────┐
│              DEV AGENT                  │
│                                         │
│  1. Read your ticket prompt             │
│  2. Implement it                        │
│  3. Report result:                      │
│                                         │
│         ┌───────┴───────┐               │
│         ▼               ▼               │
│   ┌──────────┐   ┌──────────────┐       │
│   │ COMPLETE │   │    BLOCK     │       │
│   └──────────┘   └──────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

Everything else is handled for you:
- Worktree setup (launcher script)
- File locks (launcher script)
- Session management (launcher script)
- What happens after (pipeline)

### ⚠️ Source of Truth + Conflict Rule

- **Source of truth**: the workflow **database** + PM dashboard API (not JSON files).
- **If your ticket prompt contradicts this SOP**, the SOP wins.
  - In particular: ignore any ticket-prompt instructions that tell you to update `docs/data/*.json` status files.

---

## Before You Start

### Credentials File

**Location:** `docs/data/.agent-credentials.json`

This file contains:
- `services.*` — Login URLs and credentials for external services
- `api_keys.*` — Pre-fetched API keys (use these first)
- `test_accounts.*` — Test user accounts

```bash
# Read it
cat docs/data/.agent-credentials.json
```

### If You Need API Keys or Service Access

**ALWAYS try to get it yourself before blocking:**

1. Check credentials file for existing keys
2. If credentials exist → Use browser to login
3. Navigate to API settings page
4. Copy the key and use it

**Only block if:**
- 2FA/MFA required
- CAPTCHA blocks you
- Account creation required
- Terms/license acceptance required

---

## For UI Work

### Style Reference

**Match the PM Dashboard styling:** `docs/pm-dashboard-ui/index.html`

```css
/* Dark blue theme */
--bg-base: #030712;
--bg-surface: rgba(15, 23, 42, 0.6);
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--accent: #3b82f6;
--border: rgba(71, 85, 105, 0.4);
```

- Use existing components from `apps/dashboard/src/components/ui/`
- Follow patterns in similar existing pages
- **DO NOT** change global styles or theme

---

## Code Quality

Write **clean, modular code**:

| Principle | Do This |
|-----------|---------|
| **DRY** | Extract repeated logic into functions/hooks |
| **Small functions** | Each function does ONE thing |
| **Descriptive names** | `calculateTotalRevenue()` not `calc()` |
| **Type everything** | No `any` unless absolutely necessary |
| **Handle errors** | Try/catch, proper error messages |
| **Guard early** | Return early for edge cases |

```typescript
// ✅ Good
function getUserDisplayName(user: User): string {
  if (!user) return 'Unknown';
  return user.name || user.email.split('@')[0];
}

// ❌ Bad
function x(u: any) {
  return u.name ? u.name : u.email ? u.email.split('@')[0] : 'Unknown';
}
```

---

## The 4-Step Process

### Step 1: BRAINSTORM (Before touching code)

Think through:
- What are the different ways to implement this?
- What edge cases might break?
- What dependencies does this touch?
- What could go wrong?

Write a quick brainstorm (doesn't need to be formal):
```markdown
## Brainstorm for TKT-XXX

Approaches considered:
- Option A: [approach] - pros/cons
- Option B: [approach] - pros/cons

Edge cases to handle:
- What if X is null/empty?
- What if user does Y unexpectedly?
- What if API returns error?

Dependencies I'm touching:
- [file/module] - need to be careful about [thing]
```

### Step 2: PLAN (Write implementation steps)

Before coding, write your plan:
```markdown
## Implementation Plan

1. [ ] First, I'll...
2. [ ] Then, I'll...
3. [ ] After that...
4. [ ] Finally, I'll verify by...
```

**This takes 2 minutes and saves 20 minutes of rework.**

### Step 3: EXECUTE (Implement the plan)

Now implement, following your plan step by step.

### Step 4: VERIFY (Run Related Tests)

Before marking complete, run tests for the files you modified to catch regressions early.

```bash
# For each file you modified, check if a test file exists and run it
# Example: You modified apps/dashboard/src/lib/stripe.ts

# Check if test exists
ls apps/dashboard/src/lib/stripe.test.ts 2>/dev/null && \
  pnpm test apps/dashboard/src/lib/stripe.test.ts

# For .tsx components
ls apps/dashboard/src/features/pools/DeletePoolModal.test.tsx 2>/dev/null && \
  pnpm test apps/dashboard/src/features/pools/DeletePoolModal.test.tsx
```

**Quick check script:**
```bash
# Run tests for all files you changed (vs main)
git diff --name-only main | while read file; do
  testfile="${file%.ts}.test.ts"
  [ -f "$testfile" ] && pnpm test "$testfile"
  testfile="${file%.tsx}.test.tsx"
  [ -f "$testfile" ] && pnpm test "$testfile"
done
```

**If tests fail:**
| Situation | Action |
|-----------|--------|
| Failure related to YOUR changes | Fix it before marking complete |
| Pre-existing failure (also fails on main) | Note it in your report, continue |
| No test file exists | That's OK, continue |

This step catches regressions **before** QA, saving a full retry cycle.

---

## When to COMPLETE

All of these must be true:
- All acceptance criteria met
- `pnpm typecheck` passes
- `pnpm build` passes
- Related test files pass (if they exist) - see Step 4

```bash
# Mark complete
./scripts/agent-cli.sh complete

# Update ticket status (triggers pipeline)
./scripts/agent-cli.sh update-ticket $TICKET_ID --status dev_complete
```

Write a brief completion report:
```
docs/agent-output/completions/TKT-XXX.md
```

---

## When to BLOCK

Block **only if** you:
1. **Tried** to solve it yourself first
2. **Cannot proceed** without human help

### What to Try First

| If You Need | Try This First | Block Only If |
|-------------|----------------|---------------|
| API key | Browser login → API settings | 2FA, CAPTCHA |
| Service config | Browser login → change setting | Can't find it, need owner |
| Third-party choice | Research options, present tradeoffs | Need human decision |
| Architecture decision | Analyze options, present tradeoffs | Need human decision |
| Unclear requirement | Check code, check docs | Still unclear |
| Database file | Check if exists at path | Doesn't exist, needs download |
| New account | — | Block immediately (can't create accounts) |
| License agreement | — | Block immediately (can't accept TOS) |

### How to Block

```bash
./scripts/agent-cli.sh block --reason "[your detailed explanation]"
```

### Blocker Format (REQUIRED)

Your blocker reason **must include**:

```markdown
## What I Need

[Clear statement of what's blocking you]

## What I Tried

1. [What you did] → [What happened]
2. [What you did] → [What happened]
3. [What you did] → [Why it didn't work]

## Options (if this is a decision)

| Option | Pros | Cons |
|--------|------|------|
| A: [description] | [benefits] | [drawbacks] |
| B: [description] | [benefits] | [drawbacks] |
| C: [description] | [benefits] | [drawbacks] |

## My Recommendation

[Which option you'd pick and why]
OR
[Why you can't recommend - need human expertise]
```

### Example Blocker

```markdown
## What I Need

Decision on geolocation service for IP blocking feature.

## What I Tried

1. Checked ticket for guidance → None specified
2. Researched options → Found 3 viable services
3. Checked credentials file → No existing accounts

## Options

| Option | Pros | Cons |
|--------|------|------|
| A: MaxMind GeoLite2 | Most accurate, free tier | Requires account creation + 70MB database download |
| B: ip-api.com | No account needed, simple API | Rate limited (45/min), less accurate |
| C: ipinfo.io | Good accuracy, simple API | Requires API key, 50k/month free |

## My Recommendation

Option B (ip-api.com) for MVP - no setup required, can upgrade later.
But if accuracy is critical, need human to create MaxMind account.
```

---

## Quick Reference

### Commands

```bash
# Complete (success)
./scripts/agent-cli.sh complete
./scripts/agent-cli.sh update-ticket TKT-XXX --status dev_complete

# Block (need help)
./scripts/agent-cli.sh block --reason "[detailed markdown]"
```

### Key Files

| File | Purpose |
|------|---------|
| `docs/data/.agent-credentials.json` | Service logins and API keys |
| `docs/agent-output/completions/` | Where to write completion reports |
| Your ticket prompt | Everything you need to implement |

### Commit Messages

```bash
git commit -m "TKT-XXX: [what you did]"
```

---

## What You DON'T Need to Do

These are handled for you:

- ~~Session registration~~ (launcher)
- ~~Heartbeats~~ (launcher)
- ~~Worktree setup~~ (launcher)
- ~~File lock checks~~ (launcher)
- ~~Protected files validation~~ (ticket validation)
- ~~Blocker categorization~~ (Ticket Agent)
- ~~Continuation ticket creation~~ (Ticket Agent)
- ~~Findings reporting~~ (do it if you want, not required)

---

## Summary

1. **Read** your ticket prompt
2. **Brainstorm & Plan** before coding
3. **Implement** the requirements
4. **Verify** by running related tests
5. **Complete** if done, **Block** if stuck

That's it.
