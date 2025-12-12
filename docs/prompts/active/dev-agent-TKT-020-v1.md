# Dev Agent: TKT-020 - Price ID Missing Should Error Not Fallback

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-020-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-020: Price ID Missing Should Error Not Fallback**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-020
**Priority:** Medium
**Difficulty:** Easy
**Branch:** `agent/tkt-020-price-id-missing-should-error`
**Version:** v1

---

## The Problem

When annual or 6-month price IDs aren't configured in environment, system silently falls back to monthly pricing. User selects annual, gets charged monthly rates - billing dispute risk.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/app/(auth)/paywall/page.tsx` | Implement required changes |
| `apps/dashboard/src/lib/stripe.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/billing/subscription-creation.md`



**Similar Code:**
- apps/dashboard/src/lib/stripe.ts - see price ID lookup


---

## What to Implement

1. Check if selected price ID exists in environment
2. If missing, throw error and show user-friendly message
3. Don't show billing options that don't have configured price IDs

---

## Acceptance Criteria

- [ ] Missing price ID throws visible error (not console warning)
- [ ] Billing options not shown if price ID missing
- [ ] Clear error message for admin to fix configuration

---

## Out of Scope

- ❌ Do NOT add new pricing tiers
- ❌ Do NOT modify Stripe product configuration

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| This should never happen in production if deployment is correct | Follow existing patterns |
| Consider startup-time validation of required env vars | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Remove annual price ID from env, verify error shown

---

## QA Notes

Test with missing price IDs for each billing period option.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-020 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-020.md` then `./scripts/agent-cli.sh update-ticket TKT-020 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

