# Dev Agent: TKT-053 - Handle Iframe Content in Co-Browse

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-053-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-053: Handle Iframe Content in Co-Browse**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-053
**Priority:** Medium
**Difficulty:** Medium
**Branch:** `agent/tkt-053-handle-iframe-content-in-co-br`
**Version:** v1

---

## The Problem

Embedded iframe content (payment forms, embedded apps, third-party widgets) appears as empty boxes in agent view. Cross-origin iframes cannot be captured, same-origin iframes are not being recursively captured.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/widget/src/features/cobrowse/domSerializer.ts` | Implement required changes |


**Feature Documentation:**
- `docs/features/agent/cobrowse-viewer.md`
- `docs/features/visitor/cobrowse-sender.md`



**Similar Code:**
- apps/widget/src/features/cobrowse/domSerializer.ts - existing DOM capture logic


---

## What to Implement

1. For same-origin iframes, recursively capture iframe document content
2. For cross-origin iframes, show placeholder: "Embedded content - not visible to agent"
3. Add visual indicator styling for iframe placeholders

---

## Acceptance Criteria

- [ ] Same-origin iframe content is visible in agent view
- [ ] Cross-origin iframes show clear "Embedded content - not visible" placeholder
- [ ] Placeholder is styled to be visible but non-intrusive
- [ ] No errors when encountering iframes in DOM capture

---

## Out of Scope

- ❌ Do NOT attempt to capture cross-origin iframe content (browser security prevents this)
- ❌ Do NOT modify CobrowseViewer display logic

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Recursive capture may increase payload size for iframe-heavy pages | Follow existing patterns |
| Some same-origin iframes may still fail due to CSP restrictions | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```


**Additional checks:**
- Manual: Test with page containing same-origin iframe, verify content visible

---

## QA Notes

Test with payment forms (cross-origin), embedded docs (same-origin), and YouTube embeds (cross-origin).

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-053-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-053-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-053-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-053-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
