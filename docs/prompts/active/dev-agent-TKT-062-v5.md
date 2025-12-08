# Dev Agent Continuation: TKT-062-v5

> **Type:** Continuation (QA FAILED - Setup Script Bug)
> **Original Ticket:** TKT-062 - ip-api.com Rate Limit Risk at Scale
> **Branch:** `agent/tkt-062-maxmind-geolocation` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Setup Script Breaks in Git Worktrees

**QA Summary:**
MaxMind setup script exists but has a critical bug that prevents it from working in git worktrees (which QA agent uses). The script fails because it uses relative path traversal that assumes a specific directory structure, breaking when run from a worktree.

**Failures Found:**

1. **Git Worktree Path Bug:**
   - **Expected:** Setup script works in all deployment scenarios: (1) main repo, (2) git worktrees, (3) CI/CD, (4) production
   - **Actual:** Script only works when run from main repo. It calculates PROJECT_ROOT using relative path traversal which breaks in worktrees.
   - **Evidence:**
     - Line 20 of setup script: `PROJECT_ROOT=$(dirname $(dirname $SERVER_DIR))` assumes specific directory structure
     - Script execution from worktree fails at line 31 credential check
     - The credentials file exists at `/Users/ryanodonnell/projects/Digital_greeter/docs/data/.agent-credentials.json` but script looks for it at `/Users/ryanodonnell/projects/agent-worktrees/qa-TKT-062/docs/data/.agent-credentials.json`

2. **Database Deployment Failed:**
   - **Expected:** MaxMind database file exists at `apps/server/data/GeoLite2-City.mmdb`
   - **Actual:** Database file does not exist in worktree. Setup script fails with "Credentials file not found"
   - **Evidence:** `ls apps/server/data/GeoLite2-City.mmdb` → No such file or directory

3. **Security Fail-Open Issue:**
   - **Expected:** Geolocation works without rate limits at scale (original F-033 issue resolution)
   - **Actual:** Without MaxMind database, `getLocationFromIP()` returns null for all IPs. This causes `isCountryBlocked()` to receive null country code, allowing ALL visitors through (same fail-open behavior as the original rate limit issue)
   - **Evidence:** Code at `socket-handlers.ts:124` calls `getLocationFromIP()`, which returns null when database is missing. Line 133 passes null to `isCountryBlocked()`, bypassing the blocklist entirely.

**QA Recommendation:**
Fix setup script to support git worktrees and ensure database can be deployed in all environments. Consider: (1) Environment variable for credentials path, (2) Search multiple locations (worktree, main repo, env var), (3) CI/CD documentation for database deployment.

---

## Your Task

### Prerequisites Check
1. Checkout existing branch: `git checkout agent/tkt-062-maxmind-geolocation`
2. Pull latest: `git pull origin agent/tkt-062-maxmind-geolocation`

### Root Cause Analysis

The setup script at `apps/server/scripts/setup-maxmind.sh` has path calculation logic that breaks in git worktrees:

```bash
# Line 20 - THIS IS THE BUG
PROJECT_ROOT=$(dirname $(dirname $SERVER_DIR))
```

This assumes the script is always run from `<PROJECT_ROOT>/apps/server/scripts/` but in a git worktree, the directory structure is different.

### Implementation Requirements

**Fix the path resolution logic:**

1. **Use git to find the real project root:**
   ```bash
   # Find the main worktree (where .git directory lives)
   PROJECT_ROOT=$(git rev-parse --show-toplevel)

   # Or find the main repo even from a worktree
   MAIN_REPO=$(git rev-parse --git-common-dir | sed 's/\.git$//')
   ```

2. **Support multiple credential file locations (in priority order):**
   - Environment variable: `$AGENT_CREDENTIALS_PATH`
   - Main repo: `$MAIN_REPO/docs/data/.agent-credentials.json`
   - Current worktree: `$PROJECT_ROOT/docs/data/.agent-credentials.json`
   - Relative path: `../../docs/data/.agent-credentials.json`

3. **Add clear error messages:**
   - If credentials not found in ANY location, print helpful error:
     ```
     Error: Could not find .agent-credentials.json

     Searched locations:
       - $AGENT_CREDENTIALS_PATH (not set)
       - /path/to/main/repo/docs/data/.agent-credentials.json (not found)
       - /path/to/worktree/docs/data/.agent-credentials.json (not found)

     Please ensure credentials are set up in the main repository.
     ```

4. **Test in multiple scenarios:**
   ```bash
   # Test from main repo
   cd /Users/ryanodonnell/projects/Digital_greeter/apps/server
   ./scripts/setup-maxmind.sh

   # Test from a git worktree (simulate QA environment)
   cd /tmp
   git worktree add /tmp/test-worktree
   cd /tmp/test-worktree/apps/server
   ./scripts/setup-maxmind.sh

   # Test with environment variable override
   export AGENT_CREDENTIALS_PATH=/custom/path/to/.agent-credentials.json
   ./scripts/setup-maxmind.sh
   ```

5. **Update documentation:**
   - Document the credential search order in script comments
   - Add worktree testing instructions to README
   - Note that CI/CD may need `AGENT_CREDENTIALS_PATH` environment variable

### Key Points

- **DO NOT create a new branch** - work in `agent/tkt-062-maxmind-geolocation`
- **DO test in a real worktree** - Don't just assume your fix works!
- **DO preserve backward compatibility** - Script should still work when run from main repo
- The credentials file should NEVER be copied to worktrees (it's sensitive)
- Use `git rev-parse` commands to reliably find paths in all git scenarios

---

## Original Acceptance Criteria

From TKT-062:
- Issue described in F-033 is resolved (rate limit risk mitigated by using MaxMind instead of ip-api.com)
- Change is tested and verified (geolocation actually works with the database file in ALL environments)

---

## Files in Scope

**Files to Modify:**
- `apps/server/scripts/setup-maxmind.sh` (fix path resolution logic)

**Files to Update (documentation):**
- `apps/server/README.md` or `apps/server/SETUP.md` (document worktree support)

**Do NOT modify:**
- The core geolocation implementation
- The credentials file location
- Git worktree configuration

---

## Testing Checklist

Before pushing:

- [ ] Script runs successfully from main repo
- [ ] Script runs successfully from a git worktree
- [ ] Script finds credentials in main repo when run from worktree
- [ ] Clear error message when credentials not found anywhere
- [ ] Database file is downloaded to correct location
- [ ] Database file is ~60MB and valid (not HTML error page)
- [ ] Script is executable (`chmod +x`)
- [ ] Documentation updated with worktree testing steps

---

## Completion Report

When done, write to: `docs/agent-output/completed/TKT-062-v5-DONE-{timestamp}.md`

Include in your report:
- Explanation of the worktree path bug
- How you fixed the path resolution logic
- Evidence that script works in BOTH main repo AND worktree (terminal output from both)
- The credential search order implemented
- Instructions for QA to test from a worktree

---

## Success Criteria

✅ Script uses git commands to find project root (not relative paths)
✅ Script searches multiple locations for credentials file
✅ Script works when run from main repository
✅ Script works when run from git worktree
✅ Clear error messages when credentials not found
✅ Database downloads to correct location in all scenarios
✅ Documentation explains worktree support and credential search order
