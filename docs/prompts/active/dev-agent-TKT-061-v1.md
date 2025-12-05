# Dev Agent: TKT-061 - Missing Incident Response Runbook

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-061-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-061: Missing Incident Response Runbook**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-061
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-061-missing-incident-response-runb`
**Version:** v1

---

## The Problem

The document covers how to set up monitoring and receive alerts, but provides no guidance on what to do when an alert fires. There is no incident response runbook linking to debugging steps, rollback procedures, or escalation paths beyond "call this number". When a 3 AM alert wakes someone up, they need actionable next steps.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| (see ticket for files) | |



---

## What to Implement

1. Custom response
2. Note: sure create a simple 1 pager

---

## Acceptance Criteria

- [ ] Issue described in F-647 is resolved
- [ ] Change is tested and verified

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
- **Start:** Write to `docs/agent-output/started/TKT-061-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-061-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-061-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-061-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
