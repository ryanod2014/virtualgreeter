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

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-102 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-102.md` then `./scripts/agent-cli.sh update-ticket TKT-102 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

