# Non-UI Ticket QA Workflow - EXECUTION-BASED TESTING GUIDE

> **Purpose:** QA agents testing non-UI tickets (APIs, backend, database, etc.) MUST follow this workflow.
>
> **Core Principle:** If you didn't EXECUTE it, you didn't TEST it.
>
> **You are replacing a HUMAN QA TEAM.** A human would:
> 1. **PLAN** what to test before testing
> 2. **EXECUTE** real requests/operations (not just read code)
> 3. **VERIFY** the actual response/state (not mock data)
> 4. **DOCUMENT** evidence of execution

---

## ⛔ UNACCEPTABLE SHORTCUTS (READ THIS FIRST)

These phrases in your report = **AUTOMATIC REJECTION**:

| ❌ If You Write This... | ❌ Why It's Wrong |
|------------------------|-------------------|
| "Unit tests pass" | Unit tests use mocks. You must test the REAL integration. |
| "Verified via code inspection" | Code inspection is DEV's job. QA EXECUTES. |
| "Code correctly implements..." | You're describing code, not testing behavior. |
| "Logic appears correct" | "Appears" means you didn't run it. RUN IT. |
| "Mocked tests verify this" | Mocks prove nothing about real behavior. |
| "Should work based on implementation" | "Should" means you didn't verify. VERIFY. |

**The Golden Rule:** If your evidence is "I read the code", your QA is INVALID.

---

## 📋 PHASE 1: MANDATORY PLANNING (Do This FIRST)

**You MUST create a test plan BEFORE executing any tests.**

### Step 1.1: Identify the Ticket Type

| Ticket Type | What You're Testing | Primary Tool |
|-------------|---------------------|--------------|
| API Endpoint | HTTP request → response | `curl` |
| Database Migration | Schema/data changes | SQL queries, API calls |
| Backend Logic | Business rules | Trigger via API or script |
| Webhook Handler | External event → action | Simulate webhook |
| Background Job | Scheduled task | Trigger manually or wait |
| CLI Tool | Command → output | Run the command |
| Configuration | Settings → behavior | Change config, verify effect |

### Step 1.2: Create Your Test Plan

```markdown
## My Test Plan for [TICKET-ID]

### TICKET TYPE: [API / Database / Backend / Webhook / CLI / Config]

### ENDPOINTS/OPERATIONS TO TEST
| Endpoint/Operation | Method | Purpose |
|--------------------|--------|---------|
| /api/example       | POST   | Creates a thing |
| /api/example/:id   | GET    | Retrieves a thing |

### TEST CASES (Minimum 5)
For EACH endpoint/operation:

| # | Test Case | Input | Expected Output | How to Verify |
|---|-----------|-------|-----------------|---------------|
| 1 | Happy path | Valid data | 200 + correct response | curl + jq |
| 2 | Missing required field | {} | 400 + error message | curl |
| 3 | Invalid data type | {seats: "abc"} | 400 + validation error | curl |
| 4 | Unauthorized | No auth header | 401 | curl |
| 5 | Not found | Invalid ID | 404 | curl |
| 6 | Edge case: boundary | {seats: 0} | 400 or 200? | curl |
| 7 | Edge case: max value | {seats: 999999} | Error or truncate? | curl |

### STATE VERIFICATION
After operations, what DB/state changes should I verify?

| After This Operation | Verify This State |
|---------------------|-------------------|
| POST /api/users     | User exists in DB |
| DELETE /api/org     | Org removed, related data cleaned |

### ARTIFACT TRACKING
| Test Case | Executed? | Response/Evidence | Pass/Fail |
|-----------|-----------|-------------------|-----------|
| Happy path | ☐ | [will record] | [pending] |
| Missing field | ☐ | [will record] | [pending] |
```

⚠️ **DO NOT proceed to Phase 2 until your test plan is complete!**

---

## 🔄 PHASE 2: ENVIRONMENT SETUP

### Step 2.1: Start Required Services

```bash
# Start the dev server
pnpm dev

# Verify services are running
curl -s http://localhost:3000/api/health || echo "Dashboard not ready"
curl -s http://localhost:3001/health || echo "Server not ready"
curl -s http://localhost:3456/api/v2/health || echo "PM Dashboard not ready"
```

### Step 2.2: Set Up Test Data (if needed)

```bash
# Create test user if API requires auth
curl -X POST http://localhost:3456/api/v2/qa/create-test-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "qa-api-[TICKET-ID]@greetnow.test",
    "password": "QATest-[TICKET-ID]!",
    "full_name": "QA API Tester"
  }'

# Get auth token if needed
AUTH_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "...", "password": "..."}' | jq -r '.token')
```

### Step 2.3: Document Your Test Environment

```markdown
## Test Environment
- Server: http://localhost:3001 (running ✓)
- Dashboard: http://localhost:3000 (running ✓)
- Database: Supabase (connected ✓)
- Test User: qa-api-[TICKET-ID]@greetnow.test
- Auth Token: [obtained ✓]
```

---

## 🧪 PHASE 3: EXECUTE TESTS (One at a Time)

**Execute each test case systematically. Record evidence for EVERY test.**

### The Testing Loop

```
┌─────────────────────────────────────────────────────────────┐
│ FOR EACH test case in your plan:                            │
│                                                             │
│ 1. EXECUTE the request/operation                            │
│ 2. CAPTURE the full response                                │
│ 3. VERIFY response matches expected                         │
│ 4. VERIFY side effects (DB state, logs, etc.)               │
│ 5. RECORD in your artifact table                            │
│                                                             │
│ DO NOT proceed to next test until current is documented!    │
└─────────────────────────────────────────────────────────────┘
```

### Test Execution Patterns

#### Pattern A: API Endpoint Testing

```bash
# Test 1: Happy path
echo "=== Test 1: Happy Path ==="
RESPONSE=$(curl -s -X POST http://localhost:3001/api/billing/seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{"seats": 10}')
echo "Response: $RESPONSE"
echo "Status: $(echo $RESPONSE | jq -r '.status // .error')"

# VERIFY: Check if response matches expected
# Expected: {"success": true, "seats": 10}
# Actual: [paste actual response]
# PASS/FAIL: [decision]

# Test 2: Missing required field
echo "=== Test 2: Missing Required Field ==="
RESPONSE=$(curl -s -X POST http://localhost:3001/api/billing/seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{}')
echo "Response: $RESPONSE"
# Expected: 400 error with "seats is required"
# Actual: [paste]
# PASS/FAIL: [decision]

# Test 3: Invalid data type
echo "=== Test 3: Invalid Data Type ==="
RESPONSE=$(curl -s -X POST http://localhost:3001/api/billing/seats \
  -H "Content-Type: application/json" \
  -d '{"seats": "not-a-number"}')
echo "Response: $RESPONSE"
# Expected: 400 error with validation message
# Actual: [paste]
# PASS/FAIL: [decision]
```

#### Pattern B: Database Operation Testing

```bash
# Test: Migration creates correct schema
echo "=== Test: Migration Applied ==="

# Run migration
pnpm db:migrate

# Verify table exists (via API that queries it)
RESPONSE=$(curl -s http://localhost:3001/api/admin/schema-check?table=new_table)
echo "Schema check: $RESPONSE"
# Expected: {"exists": true, "columns": [...]}

# Verify data integrity
RESPONSE=$(curl -s http://localhost:3001/api/data-check)
echo "Data integrity: $RESPONSE"
# Expected: No orphaned records, constraints valid
```

#### Pattern C: Webhook Handler Testing

```bash
# Test: Webhook processes correctly
echo "=== Test: Webhook Handler ==="

# Simulate incoming webhook
RESPONSE=$(curl -s -X POST http://localhost:3001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test_signature" \
  -d '{
    "type": "invoice.payment_failed",
    "data": {"object": {"customer": "cus_123"}}
  }')
echo "Webhook response: $RESPONSE"

# Verify side effect: org status updated
ORG_STATUS=$(curl -s http://localhost:3456/api/v2/qa/org-by-email/affected-user@example.com | jq -r '.organization.subscription_status')
echo "Org status after webhook: $ORG_STATUS"
# Expected: "past_due"
# Actual: [value]
```

#### Pattern D: Background Job Testing

```bash
# Test: Scheduled job runs correctly
echo "=== Test: Background Job ==="

# Trigger the job manually (if possible)
curl -X POST http://localhost:3001/api/admin/trigger-job?job=cleanup

# Or check logs for scheduled execution
tail -50 /tmp/server.log | grep "cleanup job"

# Verify expected outcome
RESPONSE=$(curl -s http://localhost:3001/api/admin/job-status?job=cleanup)
echo "Job status: $RESPONSE"
# Expected: {"lastRun": "...", "success": true, "recordsProcessed": N}
```

### Recording Evidence

For EACH test, record in your artifact table:

```markdown
| Test | Command | Response (truncated) | Expected | Actual | Pass? |
|------|---------|---------------------|----------|--------|-------|
| Happy path | curl -X POST .../seats -d '{"seats":10}' | {"success":true} | 200 + success | 200 + success | ✅ |
| Missing field | curl -X POST .../seats -d '{}' | {"error":"seats required"} | 400 | 400 | ✅ |
| Invalid type | curl -X POST .../seats -d '{"seats":"abc"}' | {"error":"must be number"} | 400 | 500 | ❌ |
```

---

## 🔍 PHASE 4: STATE VERIFICATION

After running tests, verify the system state is correct.

### Step 4.1: Database State Checks

```bash
# Check database via API endpoints
curl -s http://localhost:3456/api/v2/qa/org-by-email/test@example.com | jq '.'

# Verify counts
curl -s http://localhost:3001/api/admin/stats | jq '.userCount, .orgCount'

# Check for orphaned data
curl -s http://localhost:3001/api/admin/integrity-check | jq '.'
```

### Step 4.2: Log Verification

```bash
# Check for errors in logs
tail -100 /tmp/server.log | grep -i error

# Check for expected log entries
tail -100 /tmp/server.log | grep "seats updated"
```

### Step 4.3: Side Effect Verification

For each operation that should cause side effects:

| Operation | Expected Side Effect | How to Verify | Verified? |
|-----------|---------------------|---------------|-----------|
| Create user | Email sent | Check email log/queue | ☐ |
| Update billing | Stripe API called | Check Stripe dashboard | ☐ |
| Delete org | Related data cleaned | Query related tables | ☐ |

---

## 📝 PHASE 5: CREATE DELIVERABLES

### Step 5.1: Write QA Report

```markdown
# QA Report: [TICKET-ID] - PASSED ✅

**Ticket:** [TICKET-ID] - [Title]
**Type:** Non-UI (API/Backend/Database)
**Branch:** [branch]
**Tested At:** [timestamp]

---

## Test Environment
- Server: localhost:3001 ✓
- Database: Supabase ✓
- Test User: qa-api-[TICKET-ID]@greetnow.test

---

## Test Plan Execution

### Endpoint: POST /api/example

| # | Test Case | Input | Expected | Actual | Result |
|---|-----------|-------|----------|--------|--------|
| 1 | Happy path | {"data": "valid"} | 200 | 200 | ✅ PASS |
| 2 | Missing field | {} | 400 | 400 | ✅ PASS |
| 3 | Invalid type | {"data": 123} | 400 | 400 | ✅ PASS |
| 4 | Unauthorized | No token | 401 | 401 | ✅ PASS |
| 5 | Not found | /api/example/999 | 404 | 404 | ✅ PASS |

### Evidence (Request/Response Logs)

#### Test 1: Happy Path
```
$ curl -X POST http://localhost:3001/api/example \
    -H "Content-Type: application/json" \
    -d '{"data": "valid"}'

Response: {"success": true, "id": "abc123"}
Status: 200
```

#### Test 2: Missing Field
```
$ curl -X POST http://localhost:3001/api/example \
    -H "Content-Type: application/json" \
    -d '{}'

Response: {"error": "data is required"}
Status: 400
```

[... more test evidence ...]

---

## State Verification

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Record created in DB | Yes | Yes | ✅ |
| No orphaned data | True | True | ✅ |
| Logs show operation | Yes | Yes | ✅ |

---

## Edge Cases Tested

| Edge Case | Result |
|-----------|--------|
| Empty string input | Properly rejected with 400 |
| Very long string (10000 chars) | Truncated to 255, saved successfully |
| Special characters | Escaped properly, no injection |
| Concurrent requests | Handled correctly, no race condition |

---

## Conclusion

All acceptance criteria verified through EXECUTION, not code inspection.
Ready for merge.
```

### Step 5.2: Update Ticket Status

```bash
# Update ticket to qa_approved (non-UI can auto-merge)
curl -X PUT http://localhost:3456/api/v2/tickets/[TICKET-ID] \
  -H "Content-Type: application/json" \
  -d '{"status": "merged"}'

# Mark session complete
curl -X POST http://localhost:3456/api/v2/agents/[SESSION_ID]/complete \
  -H "Content-Type: application/json" \
  -d '{"completion_file": "docs/agent-output/qa-results/QA-[TICKET-ID]-PASSED.md"}'
```

---

## ✅ PHASE 6: MANDATORY SELF-AUDIT

**Before marking complete, answer these questions HONESTLY:**

### Execution Verification

```markdown
## Self-Audit Checklist

### Did I Actually Execute?
1. How many curl/API calls did I make? _____
2. How many actual responses did I capture? _____
3. Did I verify DB state via queries? Yes/No
4. Did I check logs for expected entries? Yes/No

VALIDATION: If any answer is 0 or No, I took a shortcut. GO BACK.

### Shortcut Check
- [ ] I did NOT say "unit tests pass" as my only evidence
- [ ] I did NOT say "verified via code inspection" 
- [ ] I did NOT say "logic appears correct"
- [ ] Every test has an actual curl command and response
- [ ] Every test has Expected vs Actual comparison

### Coverage Check
- [ ] I tested the happy path
- [ ] I tested at least 3 error cases
- [ ] I tested at least 2 edge cases
- [ ] I verified state changes after operations
- [ ] I checked for regressions in related endpoints
```

---

## 🚨 SPECIAL CASES

### If the Endpoint Requires Auth

```bash
# Option 1: Get a real token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -d '{"email":"test@example.com","password":"..."}' | jq -r '.token')

# Option 2: Use API key if available
curl -H "X-API-Key: $API_KEY" http://localhost:3001/api/endpoint

# Option 3: Create test user with known credentials
curl -X POST http://localhost:3456/api/v2/qa/create-test-user -d '...'
```

### If Testing External Integrations (Stripe, SendGrid, etc.)

1. **Check if test mode is available**
2. **Use test credentials** (never production!)
3. **Verify in the external dashboard** (e.g., Stripe dashboard shows test event)
4. **If no test mode**, document: "Integration verified in code, cannot test live without production credentials"

### If Database Migration

```bash
# Test migration forward
pnpm db:migrate

# Verify schema
curl http://localhost:3001/api/admin/schema | jq '.tables'

# Test migration rollback (if applicable)
pnpm db:rollback

# Verify rollback worked
curl http://localhost:3001/api/admin/schema | jq '.tables'

# Re-apply migration
pnpm db:migrate
```

### If Webhook Handler

```bash
# Simulate webhook with correct signature (if required)
# Many services have test modes that send real webhooks

# Or use webhook testing tools
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: whsec_test..." \
  -d @test-webhook-payload.json
```

---

## 📊 EXAMPLE: API Endpoint Test (Complete)

### Ticket: TKT-099 - Add Seat Limit Validation

**AC:** API should reject seat counts > 50 with 400 error

### My Test Plan

```markdown
| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | Valid seats | {"seats": 10} | 200 |
| 2 | At limit | {"seats": 50} | 200 |
| 3 | Over limit | {"seats": 51} | 400 + error |
| 4 | Way over | {"seats": 9999} | 400 + error |
| 5 | Zero | {"seats": 0} | 400 + error |
| 6 | Negative | {"seats": -5} | 400 + error |
```

### Execution

```bash
# Test 1: Valid
$ curl -X POST http://localhost:3001/api/billing/seats -d '{"seats":10}'
{"success": true, "seats": 10}
# ✅ PASS

# Test 2: At limit
$ curl -X POST http://localhost:3001/api/billing/seats -d '{"seats":50}'
{"success": true, "seats": 50}
# ✅ PASS

# Test 3: Over limit
$ curl -X POST http://localhost:3001/api/billing/seats -d '{"seats":51}'
{"error": "Maximum seat limit is 50"}
# ✅ PASS - Returns 400 with correct message

# Test 4: Way over
$ curl -X POST http://localhost:3001/api/billing/seats -d '{"seats":9999}'
{"error": "Maximum seat limit is 50"}
# ✅ PASS

# Test 5: Zero
$ curl -X POST http://localhost:3001/api/billing/seats -d '{"seats":0}'
{"error": "Seats must be at least 1"}
# ✅ PASS

# Test 6: Negative
$ curl -X POST http://localhost:3001/api/billing/seats -d '{"seats":-5}'
{"error": "Seats must be at least 1"}
# ✅ PASS
```

### Self-Audit

```
Curl calls made: 6 ✓
Responses captured: 6 ✓
All have Expected vs Actual: ✓
No "code inspection" phrases: ✓
```

**RESULT: PASSED** - All tests executed and verified.

---

## Summary: The Foolproof Process

```
1. PLAN FIRST
   - Identify ticket type
   - List all endpoints/operations
   - Create test case table (minimum 5 tests)
   - Include happy path + errors + edge cases

2. EXECUTE SYSTEMATICALLY
   - One test at a time
   - Capture full request and response
   - Verify state changes
   - Record in artifact table

3. VERIFY STATE
   - Check database after operations
   - Check logs for expected entries
   - Verify no unintended side effects

4. SELF-AUDIT
   - Count your curl calls (should be ≥5)
   - Check for shortcut phrases
   - Ensure every test has evidence

5. ONLY THEN mark as PASSED
```

**Remember: If your evidence is "I read the code", your QA is INVALID.**
