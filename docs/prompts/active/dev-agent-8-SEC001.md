# Dev Agent 8: SEC-001

You are a Dev Agent. Your job is to implement fix **SEC-001: Add Authentication to Server API Endpoints**.

## Your Assignment

**Ticket:** SEC-001
**Priority:** P0 (Ship Blocker)
**Source:** Security Audit - URGENT

**Problem:**
Server API endpoints (`/api/config/*`) have NO authentication. Anyone can:
- Modify any organization's routing configuration
- Reassign agents to different pools
- Disrupt service for any customer

**Solution:**
Add authentication middleware to all `/api/*` routes. Verify requests have valid API key or authenticated session.

**Files to Modify:**
- `apps/server/src/index.ts` - Add auth middleware before API routes

**Files NOT to Modify:**
- Everything else (stay in scope!)

**Acceptance Criteria:**
- [ ] All `/api/*` routes require authentication
- [ ] Invalid/missing auth returns 401 Unauthorized
- [ ] Existing authenticated callers still work
- [ ] All verification checks pass

## Implementation Approach

From the security audit, add middleware like:
```typescript
app.use("/api", async (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  if (!apiKey || apiKey !== process.env["INTERNAL_API_KEY"]) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
```

Or verify session/JWT if these are meant for dashboard calls.

## Your SOP

### Phase 0: Git Setup
```bash
git checkout main
git pull origin main
git checkout -b fix/SEC-001-api-auth
```

### Phase 1: Understand
1. Read `apps/server/src/index.ts` lines 300-350 (API routes)
2. Find how other routes handle auth (socket auth, etc.)
3. Determine if these are internal-only or dashboard-called

### Phase 2: Implement
Add authentication middleware before the API routes.

### Phase 3: Self-Verification
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit
```bash
git add .
git commit -m "fix(SEC-001): add authentication to server API endpoints

- Added auth middleware to /api/* routes
- Unauthenticated requests now return 401

Closes SEC-001"
git push origin fix/SEC-001-api-auth
```

### Phase 5: Report completion with branch, commit, verification results.

