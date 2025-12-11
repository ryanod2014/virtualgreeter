# Dev Agent: TKT-100 - Add Grace Period for 6-Month Billing Offer Loss

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-100-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-100: Add Grace Period for 6-Month Billing Offer Loss**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-100
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-100-add-grace-period-for-6-month-b`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/api/billing/update-settings/route.ts` | Implement required changes |
| `apps/dashboard/src/features/billing/BillingFrequencySelector.tsx` | Implement required changes |
| `apps/server/src/lib/billing/offerGracePeriod.ts` | Implement required changes |

---

## What to Implement

1. Implement 24-48 hour grace period for offer reversion
2. Add confirmation modal with clear warning about offer loss
3. Store offer removal timestamp for grace period tracking
4. Add UI to restore offer within grace period
5. Send email notification about offer change and grace period
6. Add background job to finalize offer removal after grace period

---

## Acceptance Criteria

- [ ] Customer sees warning before losing 6-month offer
- [ ] Offer can be restored within 24-48 hours
- [ ] Email sent with grace period information
- [ ] UI clearly shows grace period status
- [ ] Offer permanently removed only after grace period expires
- [ ] F-261 is resolved

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
- **Start:** Write to `docs/agent-output/started/TKT-100-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-100-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-100-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-100-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
