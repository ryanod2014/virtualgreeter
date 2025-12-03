# Strategy Report: Security & RLS Audit

**Date:** 2024-12-03
**Agent:** Strategy Agent 1
**Focus:** Security & Row-Level Security

## TL;DR for PM (Pre-Triaged)

🔴 **URGENT:**
- Server API endpoints (`/api/config/*`) have NO authentication - anyone can modify org configs

🟡 **IMPORTANT:**
- Metrics endpoint has authentication bypass via `x-internal-request` header
- Invites table has overly permissive SELECT policy ("Anyone can view invite by token")
- Dev mode skips authentication when Supabase not configured

🟢 **ROUTINE:**
- CORS is permissive in production (accepts all origins) - may be intentional for widget embedding
- Videos/logos storage buckets are public read - verify this is desired

📝 **NOTED:**
- All 30+ public tables have RLS enabled ✓
- Org-level isolation uses proper SECURITY DEFINER functions to avoid recursion ✓
- Socket.io agent authentication verifies JWT + profile ownership ✓
- Widget receives only non-sensitive display data ✓

---

## Detailed Findings

### Finding 1: Server API Endpoints Lack Authentication
**Severity:** 🔴 URGENT
**Evidence:**

```300:321:apps/server/src/index.ts
// API: Update organization configuration
app.post("/api/config/org", async (req, res) => {
  const { orgId, defaultPoolId, pathRules } = req.body;
  
  if (!orgId) {
    res.status(400).json({ error: "orgId is required" });
    return;
  }
  // ... no auth check, anyone can modify configs
});

// API: Update agent pool memberships
app.post("/api/config/agent-pools", async (req, res) => {
  const { agentId, poolIds } = req.body;
  // ... no auth check, anyone can modify agent pools
});
```

**Risk:** Attackers can:
1. Modify any organization's routing configuration
2. Reassign agents to different pools
3. Disrupt service for any customer

**Recommendation:** Add authentication middleware to all `/api/*` routes:
```typescript
// Add before API routes
app.use("/api", async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env["INTERNAL_API_KEY"]) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
```

---

### Finding 2: Metrics Endpoint Authentication Bypass
**Severity:** 🟡 IMPORTANT
**Evidence:**

```233:243:apps/server/src/index.ts
app.get("/metrics", async (req, res) => {
  if (METRICS_API_KEY) {
    const providedKey = req.query["key"] || req.headers["x-metrics-api-key"];
    const internalHeader = req.headers["x-internal-request"];

    if (providedKey !== METRICS_API_KEY && internalHeader !== "true") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
```

**Risk:** Anyone who discovers the `x-internal-request: true` header can access all server metrics including connection counts, call stats, memory usage, and pool information.

**Recommendation:** Remove the `x-internal-request` bypass or restrict it to requests from trusted IPs only:
```typescript
const isLocalhost = req.ip === "127.0.0.1" || req.ip === "::1";
if (providedKey !== METRICS_API_KEY && !(internalHeader === "true" && isLocalhost)) {
```

---

### Finding 3: Invites Table Overly Permissive SELECT Policy
**Severity:** 🟡 IMPORTANT
**Evidence:**

```71:75:supabase/migrations/20251127000000_add_invites.sql
-- Allow public read access for invite acceptance (via token)
-- This allows unauthenticated users to view their invite by token
CREATE POLICY "Anyone can view invite by token"
    ON public.invites FOR SELECT
    USING (true);
```

**Risk:** Any authenticated user can query and view ALL invites from all organizations, including email addresses, names, and invite tokens. While token-based lookup is needed for invite acceptance, the policy is too broad.

**Recommendation:** Restrict SELECT to token-based lookup:
```sql
-- Restrict to viewing by specific token only
DROP POLICY IF EXISTS "Anyone can view invite by token" ON public.invites;
CREATE POLICY "View invite by token"
    ON public.invites FOR SELECT
    TO anon, authenticated
    USING (
        -- Allow lookup by token (for invite acceptance flow)
        token = current_setting('request.headers', true)::json->>'x-invite-token'
        -- Or admin viewing their org's invites
        OR (organization_id = public.get_user_organization_id() AND public.is_user_admin())
    );
```

---

### Finding 4: Dev Mode Skips Authentication
**Severity:** 🟡 IMPORTANT
**Evidence:**

```15:23:apps/server/src/lib/auth.ts
export async function verifyAgentToken(
  token: string,
  claimedAgentId: string
): Promise<TokenVerificationResult> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn("[Auth] Supabase not configured - skipping token verification");
    // In dev without Supabase, allow all connections (trust the claimed ID)
    return { valid: true, agentProfileId: claimedAgentId };
  }
```

**Risk:** If Supabase is misconfigured or credentials are missing in production, ALL authentication is bypassed. Anyone can impersonate any agent.

**Recommendation:** Fail closed instead of open:
```typescript
if (!isSupabaseConfigured || !supabase) {
  if (process.env["NODE_ENV"] === "production") {
    console.error("[Auth] CRITICAL: Supabase not configured in production!");
    return { valid: false, error: "Auth service unavailable" };
  }
  console.warn("[Auth] Supabase not configured - dev mode, skipping verification");
  return { valid: true, agentProfileId: claimedAgentId };
}
```

---

### Finding 5: CORS Allows All Origins in Production
**Severity:** 🟢 ROUTINE (may be intentional)
**Evidence:**

```66:68:apps/server/src/index.ts
const IS_PRODUCTION = !!process.env["RAILWAY_ENVIRONMENT"] || process.env["NODE_ENV"] === "production";
const CORS_ORIGIN = ALLOWED_ORIGINS_ENV === "*" || IS_PRODUCTION
  ? true  // Allows ALL origins in production
  : ALLOWED_ORIGINS;
```

**Risk:** While this is likely intentional (widgets need to load from customer domains), it means any website can make requests to the signaling server.

**Recommendation:** If this is intentional, document it. If not, consider:
1. Validating `origin` header against known customer domains from database
2. Rate limiting by origin
3. Adding domain verification for widget connections

---

### Finding 6: Public Storage Buckets
**Severity:** 🟢 ROUTINE (by design)
**Evidence:**

```12:14:supabase/migrations/20251127400000_storage_buckets_and_pool_id.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)  -- Public
VALUES ('logos', 'logos', true)    -- Public
```

```74:77:supabase/migrations/20251127400000_storage_buckets_and_pool_id.sql
CREATE POLICY "Public video read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');  -- Anyone can read any video
```

**Risk:** All uploaded videos and logos are publicly accessible. This appears intentional for widget embedding but should be verified.

**Recommendation:** Verify this is desired behavior. Consider:
- Adding rate limiting to prevent enumeration
- Using signed URLs with expiration for videos
- Adding watermarking for video files

---

## Tables Audited

| Table | Has RLS? | Key Policies | Assessment |
|-------|----------|--------------|------------|
| `organizations` | ✅ | Users view own, admins update own, platform admins view all | ✅ Good |
| `users` | ✅ | View org members, update own, admin insert/delete | ✅ Good |
| `sites` | ✅ | View in org, admin manage | ✅ Good |
| `agent_profiles` | ✅ | View in org, self/admin update | ✅ Good |
| `call_logs` | ✅ | Admins view all, agents view own, users insert | ✅ Good |
| `agent_pools` | ✅ | View in org, admin manage | ✅ Good |
| `agent_pool_members` | ✅ | View/manage via pool membership | ✅ Good |
| `pool_routing_rules` | ✅ | View/manage via pool membership | ✅ Good |
| `invites` | ✅ | **⚠️ SELECT allows all** | 🟡 Needs fix |
| `dispositions` | ✅ | View in org, admin manage | ✅ Good |
| `feedback_items` | ✅ | Feature reqs public, bugs org-only | ✅ Good |
| `feedback_votes` | ✅ | Vote on features, view own | ✅ Good |
| `feedback_comments` | ✅ | Comment on features/org bugs | ✅ Good |
| `pmf_surveys` | ✅ | Submit own, platform admin view all | ✅ Good |
| `survey_cooldowns` | ✅ | Manage own | ✅ Good |
| `cancellation_feedback` | ✅ | Admins view org, users submit | ✅ Good |
| `agent_sessions` | ✅ | Admins view org, agents view own | ✅ Good |
| `agent_status_changes` | ✅ | Admins view org, agents view own | ✅ Good |
| `widget_pageviews` | ✅ | Admins view org | ✅ Good |
| `usage_records` | ✅ | Admins view org | ✅ Good |
| `mrr_snapshots` | ✅ | Platform admins only | ✅ Good |
| `mrr_changes` | ✅ | Platform admins only | ✅ Good |
| `organization_health` | ✅ | Platform admins + org admins view own | ✅ Good |
| `monthly_metrics` | ✅ | Platform admins only | ✅ Good |
| `cohort_retention` | ✅ | Platform admins only | ✅ Good |
| `funnel_events` | ✅ | Anon can insert, platform admin read | ✅ By design |
| `platform_settings` | ✅ | Platform admins only (CRUD) | ✅ Good |
| **storage.objects** | ✅ | Videos/logos public read, recordings org-scoped | 🟢 By design |

---

## Security Helper Functions Audit

| Function | Purpose | Assessment |
|----------|---------|------------|
| `get_user_organization_id()` | Bypass RLS to get user's org | ✅ SECURITY DEFINER, STABLE |
| `is_user_admin()` | Check if user is org admin | ✅ SECURITY DEFINER, STABLE |
| `is_platform_admin()` | Check if user is platform admin | ✅ SECURITY DEFINER, STABLE |
| `handle_new_user()` | Create org/user on signup | ✅ SECURITY DEFINER, proper checks |
| `increment_session_time()` | Atomic session time update | ✅ SECURITY DEFINER, validated input |
| `delete_expired_recordings()` | Cleanup cron function | ✅ SECURITY DEFINER |

---

## Questions Generated

1. **Is CORS `origin: true` intentional for production?** - Widgets load from customer domains, but this allows any domain to connect.

2. **Should videos be publicly accessible?** - Currently any video URL is accessible without auth. Is this desired?

3. **Is funnel_events anonymous INSERT intentional?** - Allows anonymous tracking which may be desired but should be confirmed.

4. **Are there any rate limits on widget connections per IP?** - Could prevent abuse of free tier.

5. **Is there SQL injection protection in pool routing rule patterns?** - The `path_pattern` and `domain_pattern` fields are used in matching logic.

---

## Areas NOT Explored (Out of Scope)

1. **Daily.co integration security** - Need to verify API key handling and room security
2. **Stripe webhook signature verification** - Need to check webhook handlers
3. **Rate limiting configuration** - Partially explored, but production values need review
4. **Environment variable handling** - Need to audit for secrets in logs
5. **XSS vectors in widget** - Widget uses React/Preact which handles escaping, but custom HTML needs review
6. **SQL injection in application code** - Supabase client uses parameterized queries but custom SQL should be audited
7. **CSRF protection** - Next.js Server Actions have built-in CSRF, but API routes need review
8. **Session fixation/hijacking** - Supabase handles sessions, but token storage should be reviewed

---

## Recommendations Summary

### Immediate (before launch):
1. ✅ Add authentication to `/api/config/*` endpoints
2. ✅ Fix metrics endpoint bypass vulnerability
3. ✅ Restrict invites table SELECT policy
4. ✅ Make auth fail closed in production

### Short-term (post-launch):
1. Audit Daily.co and Stripe integrations
2. Review rate limiting configuration
3. Add origin validation for widget connections
4. Document intentional public access patterns

### Long-term:
1. Regular security audits
2. Penetration testing
3. Bug bounty program

