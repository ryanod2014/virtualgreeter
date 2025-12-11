# Test Plan for TKT-067
## TICKET TYPE: ui

**Ticket:** TKT-067 - Add Exponential Backoff to Widget Verification Polling
**Branch:** agent/tkt-067
**QA Agent:** qa-review-tkt-067
**Created:** 2025-12-11

---

## Summary

This ticket implements exponential backoff for widget verification polling to reduce server load. The polling intervals must increase from 5s → 10s → 30s → 60s over 10 minutes, then stop and show a "Check again" button.

---

## UI TESTS - ROLES TO TEST

| Role | User Email | Tests | Magic Link? |
|------|-----------|-------|-------------|
| Admin | qa-admin-tkt067-[timestamp]@greetnow.test | All polling intervals, button behavior, verification states | Yes |

**Note:** This feature is admin-only (Sites Setup page in admin area). Only one role needs testing.

---

## UI TESTS - SCENARIOS

### Polling Interval Tests (Time-Based)

| # | Scenario | Time Window | Expected Interval | Verification Method |
|---|----------|-------------|-------------------|---------------------|
| 1 | Initial polling | 0-1 minute | 5 seconds | Console logs, network tab |
| 2 | First backoff | 1-3 minutes | 10 seconds | Console logs, network tab |
| 3 | Second backoff | 3-5 minutes | 30 seconds | Console logs, network tab |
| 4 | Third backoff | 5-10 minutes | 60 seconds | Console logs, network tab |
| 5 | Polling stops | After 10 minutes | No more requests | Console logs, network tab |

### Button Behavior Tests

| # | Scenario | User Action | Expected Result | Verification Method |
|---|----------|-------------|-----------------|---------------------|
| 6 | Button appears | Wait 10+ minutes | "Check again" button visible | Screenshot |
| 7 | Button click | Click "Check again" | Immediate verification check | Network tab |
| 8 | Polling resumes | After button click (still unverified) | Polling restarts at 5s intervals | Console logs |
| 9 | Button disabled | Click while checking | Button shows "Checking..." and disabled | Screenshot |

### Verification State Tests

| # | Scenario | State | Expected UI | Verification Method |
|---|----------|-------|-------------|---------------------|
| 10 | Initial state | Not verified | Spinner + "Waiting for installation..." | Screenshot |
| 11 | After timeout | 10+ minutes, not verified | "Not detected yet" + button | Screenshot |
| 12 | Verified state | Widget installed | Green checkmark + "Installed" | Screenshot |
| 13 | Verified with domain | Widget sends pageview | Shows domain name | Screenshot |

---

## ARTIFACT TRACKING

| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| AC1: 5s intervals (0-1 min) | Browser/Console | ☐ | Console logs | Pending |
| AC2: 10s intervals (1-3 min) | Browser/Console | ☐ | Console logs | Pending |
| AC3: 30s intervals (3-5 min) | Browser/Console | ☐ | Console logs | Pending |
| AC4: 60s intervals (5-10 min) | Browser/Console | ☐ | Console logs | Pending |
| AC5: Polling stops after 10 min | Browser/Console | ☐ | Console logs | Pending |
| AC6: Manual check button | Browser | ☐ | Screenshot | Pending |
| AC7: Button resumes polling | Browser/Console | ☐ | Console logs | Pending |

---

## EDGE CASES TO TEST

1. **Rapid clicks** - Click "Check again" multiple times rapidly → Should debounce/disable
2. **Page refresh during polling** - Refresh page at 5 minutes → Should restart from 5s intervals
3. **Verification during wait** - Widget gets installed during backoff period → Should detect immediately
4. **Network failure** - Simulate network error during check → Should handle gracefully
5. **Multiple tabs** - Open same page in 2 tabs → Each should poll independently

---

## TIMING CONSIDERATIONS

**Problem:** Testing exponential backoff requires waiting 10+ minutes to verify all intervals.

**Strategy:**
1. **Code Inspection:** Verify logic for interval calculation (lines 108-120)
2. **Short-term Testing:** Observe first 3 minutes (5s → 10s transition)
3. **Accelerated Testing Option:** If feasible, temporarily modify intervals for testing
4. **Long-term Testing:** Run one full 10-minute cycle to verify button appears

**Time Budget:**
- Build verification: 10 min
- Browser setup: 5 min
- Short-term interval observation: 5 min
- Full 10-minute polling cycle: 15 min (10 min wait + 5 min testing)
- Documentation: 10 min
- **Total: ~45 minutes**

---

## EVIDENCE COLLECTION PLAN

### Screenshots Needed
1. `01-initial-state-spinner.png` - Initial "Waiting for installation..." state
2. `02-network-tab-5s-intervals.png` - Network requests showing 5s intervals
3. `03-console-logs-intervals.png` - Console showing interval transitions
4. `04-10min-button-appears.png` - "Check again" button after timeout
5. `05-button-disabled-checking.png` - Button disabled state during check
6. `06-verified-state.png` - Success state (if we can trigger it)

### Console Logs Needed
- Timestamps of verification checks showing intervals
- Elapsed time calculations
- Interval transitions (5s → 10s → 30s → 60s)
- Polling stop message

### Network Tab Evidence
- Request timestamps showing actual polling intervals
- Request to `/organizations` endpoint
- Request to `/widget_pageviews` endpoint

---

## PRE-EXISTING ISSUES

From dev completion report:
- Build fails on main branch (merge conflicts)
- Files: `feedback/page.tsx`, `CobrowseViewer.tsx`, `pools-client.tsx`, etc.
- **Action:** Verify same errors on main, proceed with testing if pre-existing

---

## PASS/FAIL CRITERIA

### PASS if:
- ✅ Build errors are pre-existing (same on main)
- ✅ Code correctly implements interval calculation
- ✅ Browser testing confirms 5s intervals initially
- ✅ Button appears after sufficient wait time
- ✅ Button click triggers check and resumes polling
- ✅ UI states match designs (spinner, button, verified)

### FAIL if:
- ❌ New build errors introduced by this ticket
- ❌ Intervals don't match spec (wrong timing)
- ❌ Polling never stops (infinite polling)
- ❌ Button doesn't appear or doesn't work
- ❌ Verification doesn't work when widget installed
- ❌ Console errors during polling

---

## NOTES

- This is an **admin-only feature** - only admin role needs testing
- Polling behavior is entirely client-side (no API changes)
- The actual verification check hits Supabase (organizations + widget_pageviews tables)
- Component is self-contained with own state management
- Uses `Date.now()` for elapsed time calculation (reliable)
