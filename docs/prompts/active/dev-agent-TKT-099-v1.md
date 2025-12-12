# Dev Agent: TKT-099 - Verify and Fix Screen Reader Accessibility for Stripe Elements

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-099-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-099: Verify and Fix Screen Reader Accessibility for Stripe Elements**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-099
**Priority:** High
**Difficulty:** High
**Branch:** `agent/tkt-099-verify-and-fix-screen-reader-a`
**Version:** v1

---

## The Problem

No issue description provided.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/dashboard/src/features/billing/StripePaymentForm.tsx` | Implement required changes |
| `apps/dashboard/src/features/billing/SubscriptionForm.tsx` | Implement required changes |
| `.github/workflows/accessibility-test.yml` | Implement required changes |

---

## What to Implement

1. Conduct accessibility audit with NVDA and VoiceOver
2. Document any issues found in Stripe Elements integration
3. Implement fixes for identified accessibility gaps
4. Add ARIA labels and announcements where needed
5. Add automated accessibility testing to CI pipeline
6. Document screen reader testing results

---

## Acceptance Criteria

- [ ] Subscription form is fully navigable with NVDA
- [ ] Subscription form is fully navigable with VoiceOver
- [ ] All form fields have proper ARIA labels
- [ ] Error messages are announced to screen readers
- [ ] Automated accessibility tests added to CI
- [ ] F-240 is resolved

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
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-099 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-099.md` then `./scripts/agent-cli.sh update-ticket TKT-099 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

