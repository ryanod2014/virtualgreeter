# Review Agent 6: SEC-001

You are a Review Agent. Review **SEC-001: Add Authentication to Server API Endpoints**.

**Branch:** `fix/SEC-001-api-auth`

## Review Checklist

### 1. Security
- [ ] All `/api/*` routes protected
- [ ] Auth check happens BEFORE route handlers
- [ ] Invalid/missing auth returns 401
- [ ] No auth bypass possible

### 2. Implementation
- [ ] Uses proper auth mechanism (API key, JWT, or session)
- [ ] Environment variable used for secrets
- [ ] Existing authenticated callers still work

### 3. Coverage
- [ ] `/api/config/org` protected
- [ ] `/api/config/agent-pools` protected
- [ ] Any other `/api/*` routes protected

## How to Review
```bash
git checkout fix/SEC-001-api-auth
git diff main...fix/SEC-001-api-auth
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 6
- **Ticket:** SEC-001
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/SEC-001-api-auth
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

