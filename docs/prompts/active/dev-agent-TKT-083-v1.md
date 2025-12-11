# Dev Agent: TKT-083 - Enable Re-invitation of Previously Removed Users

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-083-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-083: Enable Re-invitation of Previously Removed Users**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-083
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-083-enable-re-invitation-of-previo`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/api/agents/invite/route.ts` | Implement required changes |
| `apps/dashboard/src/app/(app)/admin/agents/agents-client.tsx` | Implement required changes |
| `apps/dashboard/src/features/admin/components/InviteAgentModal.tsx` | Implement required changes |

---

## What to Implement

1. Modify invite logic to check is_active status before rejecting existing users
2. Add "Reactivate" button for inactive agents in agents list UI
3. Handle billing seat addition during reactivation
4. Send reactivation email instead of new invite email for returning users

---

## Acceptance Criteria

- [ ] Admins can re-invite users with inactive agent_profile records
- [ ] UI shows reactivation option for inactive agents
- [ ] Billing seats are correctly updated on reactivation
- [ ] F-414 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-083-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-083-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-083-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-083-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
