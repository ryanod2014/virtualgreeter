# Dev Agent: TKT-001 - Co-Browse Sensitive Data Sanitization

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-001-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-001: Co-Browse Sensitive Data Sanitization**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-001
**Priority:** Critical
**Difficulty:** Medium
**Branch:** `agent/TKT-001-cobrowse-sanitization`
**Version:** v1

---

## The Problem

Password fields, credit card numbers, and other sensitive data are captured in DOM snapshots and transmitted to agents during co-browse sessions. This exposes plaintext passwords, violates PCI compliance, and creates privacy risks.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/widget/src/features/cobrowse/domSerializer.ts` | Add maskSensitiveFields() function |

**Files to Read (for context):**
- `apps/widget/src/features/cobrowse/cobrowseSender.ts`
- `apps/dashboard/src/features/cobrowse/CobrowseViewer.tsx`

**Feature Documentation:**
- `docs/features/agent/cobrowse-viewer.md`
- `docs/features/visitor/cobrowse-sender.md`

---

## What to Implement

1. **Add `maskSensitiveFields()` function** to domSerializer.ts
2. **Mask password fields** - Replace values with `••••••••`
3. **Mask credit card inputs** - Detect via `autocomplete='cc-number'` or `input[type='tel']`
4. **Mask custom sensitive fields** - Elements with `data-sensitive='true'` attribute
5. **Create unit tests** - New file `domSerializer.test.ts`

---

## Acceptance Criteria

- [ ] Password input values show as `••••••••` in agent viewer
- [ ] Credit card fields (`autocomplete='cc-number'`) show as masked
- [ ] Elements with `data-sensitive='true'` attribute are masked
- [ ] Regular form fields display normally (not masked)
- [ ] New unit test file: `domSerializer.test.ts` covers masking logic

---

## Out of Scope

- ❌ Do NOT modify CobrowseViewer.tsx display logic
- ❌ Do NOT add org-level toggle for masking (separate ticket TKT-009)
- ❌ Do NOT change the snapshot transmission mechanism

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Regex too aggressive → masks non-sensitive content | Test with various form types |
| Sanitization bypassed → sensitive data leaks | Ensure masking runs on ALL snapshots |
| React forms behave differently | Test with react-hook-form |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

**Manual Test:**
1. Create test.html with password field
2. Type 'secret' in the password field  
3. Verify serialized output shows `••••••••`

---

## QA Notes

Test with React form libraries (react-hook-form), vanilla HTML forms, and dynamic forms. Verify masked fields display correctly in agent's CobrowseViewer.

---

## REQUIRED: Workflow Reporting (DB/CLI)

Follow `docs/workflow/DEV_AGENT_SOP.md`. This workflow is **DB/CLI-driven**; use the CLI for status/reporting.

Use CLI (or let the launcher handle session start/heartbeats):
- **Start (if needed)**: `./scripts/agent-cli.sh start --ticket TKT-001 --type dev`
- **Complete**: `./scripts/agent-cli.sh complete --report docs/agent-output/completions/TKT-001.md` then `./scripts/agent-cli.sh update-ticket TKT-001 --status dev_complete`
- **Block**: `./scripts/agent-cli.sh block --reason "..." --type clarification`
- **Findings (optional)**: `./scripts/agent-cli.sh add-finding --title "..." --severity high --description "..." --file path/to/file`

