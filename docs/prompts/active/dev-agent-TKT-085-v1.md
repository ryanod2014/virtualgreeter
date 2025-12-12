# Dev Agent: TKT-085 - Add Retry Mechanism for Stripe Billing Updates

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-085-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-085: Add Retry Mechanism for Stripe Billing Updates**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-085
**Priority:** Medium
**Difficulty:** Hard
**Branch:** `agent/tkt-085-add-retry-mechanism-for-stripe`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/api/agents/invite/route.ts` | Implement required changes |
| `apps/server/src/lib/billing/stripe-queue.ts` | Implement required changes |
| `packages/database/src/schema.ts` | Implement required changes |

---

## What to Implement

1. Create billing update queue system for retry logic
2. Add "billing_pending" flag to agent_invites table
3. Allow invite creation with pending billing status
4. Implement background job to sync pending billing updates when Stripe recovers
5. Add admin notifications for billing sync failures

---

## Acceptance Criteria

- [ ] Agent invites succeed even when Stripe is temporarily unavailable
- [ ] Billing updates are queued and retried automatically
- [ ] Admins are notified of billing sync issues
- [ ] F-017 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-085 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-085.md` then `./scripts/agent-cli.sh update-ticket TKT-085 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

