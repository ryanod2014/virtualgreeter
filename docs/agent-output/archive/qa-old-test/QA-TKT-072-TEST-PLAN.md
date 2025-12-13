# Test Plan for TKT-072: Fix Health Endpoint Documentation Mismatch

## Ticket Type: Documentation Fix (Non-UI)
**Note:** This ticket was labeled as "ui" type but is actually a documentation-only change. No browser testing required.

## Summary
The health endpoint implementation returns `status: "healthy"` but documentation incorrectly stated `status: "ok"`. This ticket fixes the documentation to match the actual API response.

---

## Acceptance Criteria

| AC | Description | Test Method | Evidence Type |
|----|-------------|-------------|---------------|
| AC1 | Documentation matches actual /health endpoint response | Execute curl against actual endpoint, compare with docs | API response + doc snippet |
| AC2 | Monitor configuration examples are correct | Review doc changes, verify example configs | Doc review + grep results |
| AC3 | F-655 is resolved | Verify all references to old format are updated | Grep search results |

---

## Test Strategy

### Documentation Verification Tests
Since this is a documentation-only change, I will:

1. **Verify Build Integrity** (baseline verification)
   - Run full build pipeline: `pnpm install && pnpm typecheck && pnpm lint && pnpm build && pnpm test`
   - Ensure no new errors introduced

2. **Verify Documentation Accuracy** (primary test)
   - Review all changes in `docs/features/monitoring/UPTIME_MONITORING.md`
   - Verify changed from `"status": "ok"` to `"status": "healthy"`
   - Verify status value descriptions are correct (healthy, degraded, unhealthy)

3. **Test Actual Health Endpoint** (ground truth)
   - Start PM dashboard server (provides /health endpoint)
   - Execute: `curl http://localhost:3456/health`
   - Verify response matches documentation

4. **Search for Remaining References** (exhaustive verification)
   - Search for any remaining `"status": "ok"` references in docs/
   - Search for old monitor configuration examples
   - Verify no missed instances

5. **Cross-Reference Finding F-655** (completeness check)
   - Review what F-655 reported
   - Verify all issues mentioned in F-655 are addressed

---

## Test Execution Tracking

| Test # | Test Case | Executed? | Evidence | Result |
|--------|-----------|-----------|----------|--------|
| 1 | Build verification | ☐ | Build output | Pending |
| 2 | Documentation review | ☐ | Git diff review | Pending |
| 3 | Actual /health endpoint test | ☐ | curl response | Pending |
| 4 | Search for old format references | ☐ | grep results | Pending |
| 5 | F-655 resolution verification | ☐ | Finding review | Pending |

---

## Expected Outcomes

### PASS Criteria
- ✅ Build succeeds with no new errors
- ✅ All references changed from `"ok"` to `"healthy"` in docs
- ✅ Actual /health endpoint returns `"status": "healthy"`
- ✅ Documentation matches actual API response format
- ✅ Monitor configuration examples use correct status value
- ✅ No remaining references to old `"status": "ok"` format in docs
- ✅ All 3 status values documented (healthy, degraded, unhealthy)

### FAIL Criteria
- ❌ Build introduces new errors
- ❌ Documentation still contains `"status": "ok"` references
- ❌ Documentation doesn't match actual endpoint response
- ❌ Monitor examples are incorrect

---

## Notes

- **No Browser Testing Required:** This is a documentation-only change affecting markdown files
- **No Magic Links Required:** No UI changes to demonstrate to PM
- **Ground Truth Source:** The actual health endpoint at `http://localhost:3456/health`
- **Files Changed:** Only `docs/features/monitoring/UPTIME_MONITORING.md`
