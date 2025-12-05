# Dev Agent: TKT-023 - Atomic Stripe-DB Updates for Seat Changes

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-023-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-023: Atomic Stripe-DB Updates for Seat Changes**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-023
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-023-atomic-stripe-db-updates-for-s`
**Version:** v1

---

## The Problem

Stripe is updated before DB for seat changes. If DB update fails after Stripe succeeds, customer is charged for seats not reflected in app. Inconsistent state.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/api/billing/seats/route.ts` | Implement required changes |
| `apps/dashboard/src/lib/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/seat-management.md`



**Similar Code:**
- apps/dashboard/src/lib/stripe.ts - Stripe helper functions


---

## What to Implement

1. Update DB first (optimistic)
2. If Stripe fails, rollback DB change
3. If Stripe succeeds but anything fails after, log for manual review
4. Add monitoring/alerting for rollback failures

---

## Acceptance Criteria

- [ ] DB failure prevents Stripe call
- [ ] Stripe failure triggers DB rollback
- [ ] Rollback failures are logged and alerted
- [ ] Successful flow unchanged

---

## Out of Scope

- ❌ Do NOT modify seat limit validation (TKT-022)
- ❌ Do NOT add distributed transactions (overkill)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Rollback window is small - Stripe change is immediate | Follow existing patterns |
| Log all operations for audit trail | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Simulate DB failure after Stripe success, verify rollback

---

## QA Notes

Test failure scenarios. Verify logs capture all seat change attempts.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-023-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-023-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-023-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-023-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
