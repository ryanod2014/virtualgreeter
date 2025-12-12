# Dev Agent: TKT-004a - Implement Stripe Pause API Integration

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-004a-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-004a: Implement Stripe Pause API Integration**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-004a
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/tkt-004a-implement-stripe-pause-api-int`
**Version:** v1

---

## The Problem

pauseAccount() updates DB but does NOT pause billing in Stripe - customers still charged while paused.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(dashboard)/settings/actions.ts` | Implement required changes |
| `apps/dashboard/src/lib/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/cancel-subscription.md`



**Similar Code:**
- apps/dashboard/src/lib/stripe.ts - see cancelSubscription for similar Stripe API pattern


---

## What to Implement

1. Add pauseSubscription() function to stripe.ts that calls stripe.subscriptions.update with pause_collection
2. Add resumeSubscription() function to stripe.ts
3. Update pauseAccount action to call Stripe API before DB update

---

## Acceptance Criteria

- [ ] Clicking 'Pause' calls Stripe API with pause_collection
- [ ] Stripe dashboard shows subscription as paused
- [ ] Clicking 'Resume' restarts Stripe billing
- [ ] Stripe dashboard shows subscription as active after resume

---

## Out of Scope

- ❌ Do NOT implement auto-resume scheduler (TKT-004b)
- ❌ Do NOT implement webhooks (TKT-004c)
- ❌ Do NOT modify widget/agent status (TKT-004d)

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Stripe pause behavior varies by plan type - test thoroughly | Follow existing patterns |
| If Stripe call fails but DB updates → inconsistent state | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Test with Stripe test mode: pause/resume subscription, verify Stripe dashboard state

---

## QA Notes

Use Stripe test mode. Verify pause/resume round-trip works. Check billing portal shows correct status.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-004a --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-004a.md` then `./scripts/agent-cli.sh update-ticket TKT-004a --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

