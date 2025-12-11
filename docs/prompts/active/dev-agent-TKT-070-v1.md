# Dev Agent: TKT-070 - Add Configuration for Trusted Proxy Headers

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-TKT-070-v1.md`

---

You are a Dev Agent. Your job is to implement **TKT-070: Add Configuration for Trusted Proxy Headers**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** TKT-070
**Priority:** High
**Difficulty:** Medium
**Branch:** `agent/tkt-070-add-configuration-for-trusted`
**Version:** v1

---

## The Problem

The server trusts x-forwarded-for header without validation, allowing IP spoofing to bypass geo-blocking if not behind a trusted proxy. Security section notes: 'Trusts x-forwarded-for (assumes trusted proxy)'. If the server receives direct connections, attackers can spoof headers to bypass geo-restrictions.

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/features/geolocation/get-client-ip.ts` | Implement required changes |
| `apps/server/src/config/environment.ts` | Implement required changes |
| `.env.example` | Implement required changes |

**Feature Documentation:**
- `docs/features/platform/geolocation-service.md`

---

## What to Implement

1. Add TRUST_PROXY environment variable (default: 'true' for backwards compatibility)
2. When TRUST_PROXY=false, use socket.remoteAddress only (ignore all headers)
3. When TRUST_PROXY=true, use current x-forwarded-for logic
4. Add deployment documentation explaining security implications
5. Log warning on startup if TRUST_PROXY=true to remind admins

---

## Acceptance Criteria

- [ ] TRUST_PROXY env var controls header trust behavior
- [ ] When false, x-forwarded-for header is ignored
- [ ] When true, current behavior is preserved
- [ ] Default is true (no breaking changes)
- [ ] Documentation explains when to use each setting
- [ ] Warning logged at startup when TRUST_PROXY=true

---

## Out of Scope

- ❌ Do NOT change geolocation API integration
- ❌ Do NOT modify blocklist logic - only IP extraction

---

## Risks to Avoid

| Risk | How to Avoid |
|------|--------------|
| Breaking change if default is wrong - must default to true | Follow existing patterns |
| Need clear documentation for deployment scenarios | Follow existing patterns |

---

## Dev Checks

```bash
pnpm typecheck  # Must pass
pnpm build      # Must pass
```

---

## QA Notes

Test both settings with spoofed x-forwarded-for header. With false, it should be ignored. With true, it should be honored.

---

## ⚠️ REQUIRED: Follow Dev Agent SOP

**All reporting is handled per the SOP:**
- **Start:** Write to `docs/agent-output/started/TKT-070-[TIMESTAMP].json`
- **Complete:** Write to `docs/agent-output/completions/TKT-070-[TIMESTAMP].md`
- **Update:** Add to `docs/data/dev-status.json` completed array
- **Blocked:** Write to `docs/agent-output/blocked/BLOCKED-TKT-070-[TIMESTAMP].json`
- **Findings:** Write to `docs/agent-output/findings/F-DEV-TKT-070-[TIMESTAMP].json`

See `docs/workflow/DEV_AGENT_SOP.md` for exact formats.
