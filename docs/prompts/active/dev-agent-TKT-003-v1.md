# Dev Agent: TKT-003 - Update Cancellation Data Deletion Copy

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-003-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-003: Update Cancellation Data Deletion Copy**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-003
**Priority:** Critical
**Difficulty:** Easy
**Branch:** `agent/TKT-003-cancel-copy`
**Version:** v1

---

## The Problem

Cancel modal warns that data will be "permanently deleted" but actual behavior just downgrades to free - no data is deleted. This is misleading to users.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx` | Update the modal copy |

**Feature Documentation:**
- `docs/features/billing/cancel-subscription.md`

**Similar Code:**
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx` - see other modal implementations

---

## What to Implement

Update the modal copy to:

> "Your data will be retained for 30 days after cancellation, then may be permanently deleted."

**Remove any mentions of:**
- "immediate" deletion
- "permanent" deletion (without the 30-day retention context)

---

## Acceptance Criteria

- [ ] Cancel modal shows updated retention language
- [ ] No mention of "immediate" or "permanent" deletion without context
- [ ] Modal text matches exact copy: "Your data will be retained for 30 days after cancellation, then may be permanently deleted."

---

## Out of Scope

- ❌ Do NOT change cancel flow logic (handled by TKT-002)
- ❌ Do NOT add actual data deletion functionality
- ❌ Do NOT modify other settings page components

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Copy change only | Low risk - just text update |
| Terms of service mismatch | Use exact copy provided |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

**Visual Test:**
1. Open cancel modal in settings
2. Verify new copy displays correctly

---

## QA Notes

Verify modal displays correctly on desktop and mobile viewports.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-003-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-003-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-003-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-003-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.

