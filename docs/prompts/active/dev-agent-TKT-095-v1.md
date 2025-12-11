# Dev Agent: TKT-095 - Add Validation for Facebook Pixel Settings

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-095-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-095: Add Validation for Facebook Pixel Settings**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-095
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-095-add-validation-for-facebook-pi`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(app)/admin/settings/organization/organization-settings-client.tsx` | Implement required changes |
| `apps/server/src/app/api/organization/update-settings/route.ts` | Implement required changes |

---

## What to Implement

1. Add validation requiring Pixel ID when Facebook events are configured
2. Show error message if trying to save mappings without Pixel ID
3. OR display warning banner indicating events won't fire without Pixel ID
4. Add helpful message explaining Pixel ID is required for event tracking

---

## Acceptance Criteria

- [ ] Cannot save Facebook event mappings without Pixel ID
- [ ] Clear error/warning message explains the requirement
- [ ] Existing configs without Pixel ID show warning in UI
- [ ] F-067 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-095-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-095-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-095-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-095-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
