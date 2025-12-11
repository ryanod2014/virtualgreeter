# Dev Agent: TKT-089 - Add Confirmation Dialog for Blocklist Mode Changes

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-089-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-089: Add Confirmation Dialog for Blocklist Mode Changes**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-089
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-089-add-confirmation-dialog-for-bl`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx` | Implement required changes |
| `apps/dashboard/src/features/blocklist/ModeChangeConfirmationModal.tsx` | Implement required changes |

---

## What to Implement

1. Create confirmation modal component
2. Show modal when switching modes if current country list is non-empty
3. Modal message: "Switching modes will clear your current list of X countries. Continue?"
4. Include Cancel and Confirm buttons
5. Only clear list after explicit confirmation

---

## Acceptance Criteria

- [ ] Confirmation dialog appears when switching modes with non-empty list
- [ ] Dialog shows count of countries that will be lost
- [ ] Canceling preserves current mode and list
- [ ] Confirming switches mode and clears list
- [ ] F-038 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-089-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-089-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-089-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-089-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
