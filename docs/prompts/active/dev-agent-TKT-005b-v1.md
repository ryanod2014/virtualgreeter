# Dev Agent: TKT-005b - Create Payment Failure Blocking Modal

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-005b-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-005b: Create Payment Failure Blocking Modal**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-005b
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/tkt-005b-create-payment-failure-blockin`
**Version:** v1

---

## The Problem

No UI feedback when payment fails - users don't know their account has issues.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/components/PaymentBlocker.tsx` | Implement required changes |
| `apps/dashboard/src/app/(dashboard)/layout.tsx` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/payment-failure.md`



**Similar Code:**
- apps/dashboard/src/app/(dashboard)/settings/CancelModal.tsx - modal pattern
- apps/dashboard/src/app/(dashboard)/layout.tsx - layout wrapper pattern


---

## What to Implement

1. Create PaymentBlocker component - full-screen modal that blocks dashboard
2. Show 'Update Payment Method' button for admins
3. Show 'Contact your admin' message for agents
4. Layout checks org status and renders blocker if past_due

---

## Acceptance Criteria

- [ ] Full-screen modal appears when org status is 'past_due'
- [ ] Admins see 'Update Payment Method' button
- [ ] Agents see read-only message directing them to contact admin
- [ ] Modal cannot be dismissed without resolving payment

---

## Out of Scope

- ❌ Do NOT implement webhook handlers (TKT-005c)
- ❌ Do NOT implement email notifications (TKT-005d)
- ❌ Do NOT modify agent status logic (TKT-005e)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Don't block access too aggressively for temporary issues | Follow existing patterns |
| Ensure modal is accessible and clear | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Set org to past_due, verify modal appears

---

## QA Notes

Test as admin and as agent. Verify different UI for each role. Test mobile viewport.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-005b-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-005b-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-005b-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-005b-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
