# Dev Agent: TKT-062 - ip-api.com Rate Limit Risk at Scale

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-062-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-062: ip-api.com Rate Limit Risk at Scale**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-062
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-062-ip-api.com-rate-limit-risk-at`
**Version:** v1

---

## The Problem

The geolocation service uses ip-api.com free tier which has a 45 requests/minute limit. Documentation flags this as a concern but no mitigation plan is documented. At scale (45+ unique visitors per minute), geolocation will fail and all visitors will be allowed through (fail-safe), bypassing blocklist entirely.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| (see ticket for files) | |



---

## What to Implement

1. Custom response
2. Note: lets use maxmind. but also make sure we are ONLY running IP checking on pages were widget is present (agent available) so we arent wasting money

---

## Acceptance Criteria

- [ ] Issue described in F-033 is resolved
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
- **Start:** Write to `docs/agent-output/started/TKT-062-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-062-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-062-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-062-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
