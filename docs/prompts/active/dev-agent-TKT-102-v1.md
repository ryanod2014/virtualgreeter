# Dev Agent: TKT-102 - No Stripe Integration - Billing Continues During Pause

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-102-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-102: No Stripe Integration - Billing Continues During Pause**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-102
**Priority:** Critical
**Difficulty:** High
**Branch:** `agent/tkt-102-no-stripe-integration-billing`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/billing/actions.ts` | Implement required changes |
| `apps/dashboard/src/lib/stripe/subscriptionManagement.ts` | Implement required changes |

---

## What to Implement

1. Implement Stripe subscription.pause_collection with behavior: void
2. Add error handling for Stripe API failures
3. Update resumeAccount to unpause Stripe subscription
4. Add tests for Stripe integration

---

## Acceptance Criteria

- [ ] Pausing account pauses Stripe subscription
- [ ] Resuming account resumes Stripe subscription
- [ ] Stripe errors are handled gracefully
- [ ] F-283 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-102-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-102-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-102-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-102-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
