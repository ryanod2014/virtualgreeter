# Dev Agent: SEC-001 - API Authentication Enforcement

> **One-liner to launch:**
> `You are a Dev Agent. Read docs/workflow/DEV_AGENT_SOP.md then execute: docs/prompts/active/dev-agent-SEC001-v1.md`

---

You are a Dev Agent. Your job is to implement **SEC-001: Enforce API Authentication on Server Routes**.

**First, read the Dev Agent SOP:** `docs/workflow/DEV_AGENT_SOP.md`

---

## Your Assignment

**Ticket:** SEC-001
**Priority:** P0 (Security)
**Type:** Security Fix
**Branch:** `fix/SEC-001-api-auth`
**Version:** v1

---

## What Needs to Be Done

The signaling server (`apps/server`) has routes and socket handlers that need proper authentication verification. Currently:
- `/metrics` endpoint has optional API key protection
- Socket handlers verify agent tokens but some code paths may skip verification in certain conditions
- Need to audit and ensure all sensitive operations require authentication

### Background

From Security Audit (see `docs/strategy/INSIGHTS-LOG.md`):
> SEC-001: API routes missing authentication checks

The server uses:
- `verifyAgentToken()` in `apps/server/src/lib/auth.ts` for agent auth
- `METRICS_API_KEY` for metrics endpoint protection
- Supabase JWT tokens for user verification

### Requirements

1. **Audit all HTTP routes in `apps/server/src/index.ts`:**
   - `/health` - Public (OK)
   - `/metrics` - Should require API key in production
   - `/stripe/webhook` - Uses Stripe signature verification (OK)
   - Any other routes should be documented/protected

2. **Audit socket handlers in `apps/server/src/features/signaling/socket-handlers.ts`:**
   - `AGENT_LOGIN` - Currently verifies token ✅
   - Ensure all agent operations verify the socket is authenticated
   - Visitors don't have auth (expected) but should be rate-limited

3. **Enforce METRICS_API_KEY in production:**
   - If `METRICS_API_KEY` is not set in production, log a warning
   - Optionally: deny access entirely if key not configured

4. **Add authentication middleware for future API routes:**
   - Create a reusable auth middleware pattern

---

## Files to Modify

| File | What to Change |
|------|----------------|
| `apps/server/src/index.ts` | Enforce metrics auth in production, add warnings |
| `apps/server/src/lib/auth.ts` | Add helper for checking authenticated socket (if needed) |
| `apps/server/src/features/signaling/socket-handlers.ts` | Audit agent operations use verified auth |

**⚠️ Only modify these files. Check FILE LOCKS in AGENT_TASKS.md before starting.**

---

## Implementation Guide

### Step 1: Audit Current State

First, read and understand the current authentication:

```bash
# Check what routes exist
grep -n "app\.\(get\|post\|put\|delete\)" apps/server/src/index.ts

# Check socket handler auth
grep -n "verifyAgentToken" apps/server/src/features/signaling/socket-handlers.ts
```

### Step 2: Strengthen Metrics Endpoint

In `apps/server/src/index.ts`, update the `/metrics` route:

```typescript
app.get("/metrics", async (req, res) => {
  // In production, REQUIRE API key
  if (IS_PRODUCTION) {
    if (!METRICS_API_KEY) {
      console.warn("[Security] METRICS_API_KEY not configured in production!");
      // Still allow with internal header for Railway/monitoring systems
    }
    
    const providedKey = req.query["key"] || req.headers["x-metrics-api-key"];
    const internalHeader = req.headers["x-internal-request"];
    
    if (!providedKey && !internalHeader) {
      res.status(401).json({ error: "API key required" });
      return;
    }
    
    if (providedKey && providedKey !== METRICS_API_KEY) {
      res.status(403).json({ error: "Invalid API key" });
      return;
    }
  }
  
  // ... rest of handler
});
```

### Step 3: Audit Socket Handlers

Review `socket-handlers.ts` for these patterns:

1. **Agent Operations:** Verify they check `socket.data.agentId` is set:
   - `AGENT_BACK` - Should check agent is logged in
   - `AGENT_AWAY` - Should check agent is logged in
   - `AGENT_LOGOUT` - Should check agent is logged in
   - `CALL_ACCEPT` - Should check agent is authenticated
   - `CALL_REJECT` - Should check agent is authenticated

2. **Add guard helper if needed:**
```typescript
function requireAgentAuth(socket: Socket): string | null {
  const agentId = socket.data.agentId;
  if (!agentId) {
    socket.emit("error", { message: "Not authenticated as agent" });
    return null;
  }
  return agentId;
}
```

### Step 4: Document Security Model

Add a comment block at the top of socket-handlers.ts documenting the auth model:

```typescript
/**
 * AUTHENTICATION MODEL:
 * 
 * Agents:
 * - Must call AGENT_LOGIN first with valid Supabase JWT
 * - Token is verified via verifyAgentToken()
 * - socket.data.agentId is set on successful auth
 * - All subsequent agent operations check socket.data.agentId
 * 
 * Visitors:
 * - No authentication (public widget)
 * - Identified by socket.data.visitorId (ephemeral UUID)
 * - Rate limiting should be applied (see rate-limit middleware)
 */
```

### Step 5: Verify Build

```bash
cd apps/server
pnpm typecheck
pnpm lint
pnpm build
```

---

## Acceptance Criteria

- [ ] `/metrics` requires API key in production (401 without, 403 with wrong key)
- [ ] Warning logged if `METRICS_API_KEY` not set in production
- [ ] All agent socket operations verify `socket.data.agentId` is set
- [ ] Security model documented in socket-handlers.ts
- [ ] No breaking changes to existing functionality
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Build passes

---

## Related Documentation

- Auth implementation: `apps/server/src/lib/auth.ts`
- Strategy report: `docs/strategy/INSIGHTS-LOG.md`

---

## ⚠️ REQUIRED: Notify PM When Done

**Append to `docs/agent-inbox/completions.md` when you start AND when you finish.**

See `docs/workflow/DEV_AGENT_SOP.md` for the exact format.

