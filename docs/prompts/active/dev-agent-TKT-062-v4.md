# Dev Agent Continuation: TKT-062-v4

> **Type:** Continuation (QA FAILED)
> **Original Ticket:** TKT-062 - ip-api.com Rate Limit Risk at Scale
> **Branch:** `agent/tkt-062-maxmind-geolocation` (ALREADY EXISTS - do NOT create new branch)

---

## ❌ QA FAILED - Setup Script Issues

**QA Summary:**
MaxMind GeoLite2 database file not deployed - geolocation integration cannot be verified. The setup script approach from v3 did not successfully resolve the deployment issue.

**Failures Found:**

1. **External Integration Failure:**
   - **Expected:** MaxMind geolocation works with database file present at `apps/server/data/GeoLite2-City.mmdb`
   - **Actual:** Database file does not exist at expected location. Code fails back to null geolocation, allowing all blocked IPs through.
   - **Evidence:**
     - `ls -la apps/server/data/` shows directory does not exist
     - `find apps/server -name '*.mmdb'` returns no results
     - Database file is gitignored (`*.mmdb` in .gitignore), confirming it must be manually deployed

2. **Testing Verification Failure:**
   - **Expected:** Real IP geolocation lookups succeed with MaxMind database
   - **Actual:** Cannot test real geolocation without database file. Unit tests pass but use mock data.
   - **Evidence:** Code at `geolocation.ts:36-39` logs warning when database not found and returns null for all lookups, bypassing blocklist entirely.

**What You Must Fix:**

Create a working setup script to automate MaxMind database download using the stored license key from `.agent-credentials.json`. The account already exists with credentials stored - the script needs to actually work in a fresh checkout scenario.

---

## Your Task

### Prerequisites Check
1. Checkout existing branch: `git checkout agent/tkt-062-maxmind-geolocation`
2. Pull latest: `git pull origin agent/tkt-062-maxmind-geolocation`
3. Verify credentials exist: `cat docs/data/.agent-credentials.json`

### Implementation Requirements

The v3 attempt created a script but QA shows it didn't work. You need to:

1. **Review what v3 attempted** - Check if `apps/server/scripts/setup-maxmind.sh` exists
2. **Debug why it failed** - The database still isn't present, so either:
   - The script wasn't created/committed
   - The script has bugs
   - The script wasn't documented properly for humans to run
   - The script path/permissions are wrong

3. **Fix or create a working solution:**
   - Create/fix the setup script at `apps/server/scripts/setup-maxmind.sh`
   - Use the license key from `docs/data/.agent-credentials.json`
   - Handle errors gracefully (missing credentials, network issues, extraction failures)
   - Make the script executable: `chmod +x apps/server/scripts/setup-maxmind.sh`

4. **Test the script locally:**
   ```bash
   # Remove existing database if present
   rm -f apps/server/data/GeoLite2-City.mmdb

   # Run the setup script
   cd apps/server
   ./scripts/setup-maxmind.sh

   # Verify database exists and is valid
   ls -lh data/GeoLite2-City.mmdb
   file data/GeoLite2-City.mmdb
   ```

5. **Document the setup process:**
   - Update `apps/server/README.md` or create `apps/server/SETUP.md`
   - Include clear instructions for developers setting up fresh checkouts
   - Document what the script does and how to run it

6. **Verify the integration actually works:**
   - After running the setup script, verify that `geolocation.ts` can load the database
   - Test with a real IP lookup (you can add a simple test script if needed)

### Key Points

- **DO NOT create a new branch** - work in `agent/tkt-062-maxmind-geolocation`
- **DO NOT hardcode the license key** - read it from `.agent-credentials.json`
- **DO verify your solution works** - Don't just claim it works, test it!
- The database file is ~60MB and gitignored, which is correct
- The script must handle fresh checkouts where the data directory doesn't exist yet

---

## Original Acceptance Criteria

From TKT-062:
- Issue described in F-033 is resolved (rate limit risk mitigated by using MaxMind instead of ip-api.com)
- Change is tested and verified (geolocation actually works with the database file)

---

## Files in Scope

**Files to Create/Modify:**
- `apps/server/scripts/setup-maxmind.sh` (create or fix)
- `apps/server/README.md` or `apps/server/SETUP.md` (documentation)

**Files to Review:**
- `apps/server/src/geolocation.ts` (verify it handles the database correctly)
- `docs/data/.agent-credentials.json` (read the license key from here)

**Do NOT modify:**
- The core geolocation implementation (that's done)
- The credentials file
- .gitignore entries for *.mmdb

---

## Completion Report

When done, write to: `docs/agent-output/completed/TKT-062-v4-DONE-{timestamp}.md`

Include in your report:
- What was wrong with v3's approach
- How you fixed it
- Evidence that the script actually works (terminal output)
- Instructions for QA to verify

---

## Success Criteria

✅ Setup script exists and is executable
✅ Script successfully downloads GeoLite2-City.mmdb using stored credentials
✅ Database file appears at `apps/server/data/GeoLite2-City.mmdb`
✅ Database file is ~60MB and valid (not a 404 HTML page)
✅ Documentation clearly explains how to run the setup
✅ Fresh checkout scenario is handled (creates data/ directory if needed)
✅ Error messages are helpful if credentials are missing
