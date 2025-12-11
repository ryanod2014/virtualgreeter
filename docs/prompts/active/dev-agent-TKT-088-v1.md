# Dev Agent: TKT-088 - Add Warning for Empty Allowlist Mode

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-088-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-088: Add Warning for Empty Allowlist Mode**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-088
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-088-add-warning-for-empty-allowlis`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Implement required changes |

---

## What to Implement

1. Add explicit warning banner when allowlist mode is active but list is empty
2. Warning text: "Your allowlist is empty. All visitors are currently allowed. Add countries to restrict access."
3. Use warning/alert styling to make it prominent
4. Show warning only in ALLOWLIST mode when country list is empty

---

## Acceptance Criteria

- [ ] Warning appears when allowlist is empty
- [ ] Warning disappears when countries are added or mode is changed
- [ ] Warning text clearly explains the current behavior
- [ ] F-034 is resolved

---

## Out of Scope

- (No explicit out-of-scope items listed)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| (Low risk) | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-088-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-088-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-088-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-088-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
