# Test Plan for TKT-089-V2

## TICKET TYPE: UI (Blocklist Settings)

## Ticket Information
- **ID**: TKT-089-V2
- **Title**: Save Blocklist Mode Data When Switching Modes (Retry 2)
- **Branch**: agent/tkt-089
- **Priority**: Medium
- **Difficulty**: Easy

## Problem Statement
Currently, switching between Blocklist and Allowlist modes clears the entire country list. This ticket implements separate state tracking for blocklist and allowlist countries, so users can switch between modes without losing their selections.

## Code Changes Summary
The dev agent modified `apps/dashboard/src/app/(app)/admin/settings/blocklist/blocklist-settings-client.tsx`:
- Added separate state variables: `blocklistCountries` and `allowlistCountries`
- Changed `countryList` from state to a computed value based on current mode
- Modified `handleModeChange` to NOT clear the list when switching
- Preserved initialization logic to populate the correct state based on initial mode

## ACCEPTANCE CRITERIA TO TEST

| AC # | Criteria | How I'll Test | Expected Result |
|------|----------|---------------|-----------------|
| AC1 | Switching from blocklist to allowlist preserves blocklist selections | 1. Add countries to blocklist<br>2. Switch to allowlist<br>3. Switch back to blocklist | Original blocklist countries reappear |
| AC2 | Switching from allowlist to blocklist preserves allowlist selections | 1. Start in allowlist mode<br>2. Add countries<br>3. Switch to blocklist<br>4. Switch back | Original allowlist countries reappear |
| AC3 | Can switch between modes multiple times without losing data | Switch back and forth 5+ times with different countries in each mode | Both lists remain intact through all switches |
| AC4 | Saving updates the database with the currently active mode's list | 1. Add countries in blocklist<br>2. Save<br>3. Switch to allowlist, add different countries<br>4. Save<br>5. Reload page | DB has correct data for each mode |
| AC5 | F-038 is resolved | Verify the original issue (losing data on mode switch) is fixed | Data is preserved |

## DETAILED TEST CASES

### Test Category 1: Basic Mode Switching (AC1, AC2)

| # | Test | Actions | Expected | Evidence Type |
|---|------|---------|----------|---------------|
| 1.1 | Blocklist → Allowlist → Blocklist | 1. Select US, UK, CA in blocklist<br>2. Switch to allowlist<br>3. Switch back to blocklist | US, UK, CA reappear in blocklist | Screenshot |
| 1.2 | Allowlist → Blocklist → Allowlist | 1. Start in allowlist, select FR, DE<br>2. Switch to blocklist<br>3. Switch back to allowlist | FR, DE reappear in allowlist | Screenshot |
| 1.3 | Empty list preservation | 1. Clear all countries in blocklist<br>2. Switch to allowlist<br>3. Switch back | Blocklist remains empty | Screenshot |

### Test Category 2: Multiple Mode Switches (AC3)

| # | Test | Actions | Expected | Evidence Type |
|---|------|---------|----------|---------------|
| 2.1 | Rapid switching | 1. Add US, UK to blocklist<br>2. Switch to allowlist, add FR, DE<br>3. Switch back and forth 5 times | Both lists intact after all switches | Screenshot |
| 2.2 | Incremental additions | 1. Add 2 countries to blocklist<br>2. Switch to allowlist, add 3 countries<br>3. Switch back, add 2 more to blocklist<br>4. Switch to allowlist, add 1 more | Final counts: blocklist=4, allowlist=4 | Screenshot |

### Test Category 3: Saving and Persistence (AC4)

| # | Test | Actions | Expected | Evidence Type |
|---|------|---------|----------|---------------|
| 3.1 | Save blocklist mode | 1. Add countries to blocklist<br>2. Click Save<br>3. Reload page | Page loads with saved blocklist countries | Screenshot |
| 3.2 | Save allowlist mode | 1. Switch to allowlist<br>2. Add countries<br>3. Save<br>4. Reload | Page loads in allowlist mode with saved countries | Screenshot |
| 3.3 | Switch before save | 1. Add countries to blocklist<br>2. Switch to allowlist WITHOUT saving<br>3. Add countries<br>4. Save<br>5. Reload | Only allowlist data persists (last saved mode) | Screenshot |

### Test Category 4: Edge Cases

| # | Test | Actions | Expected | Evidence Type |
|---|------|---------|----------|---------------|
| 4.1 | Region selection | 1. Select entire "Americas" region in blocklist<br>2. Switch to allowlist<br>3. Switch back | All Americas countries reappear | Screenshot |
| 4.2 | Special group | 1. Select "Developing Countries" in allowlist<br>2. Switch to blocklist<br>3. Switch back | All developing countries reappear | Screenshot |
| 4.3 | Mixed selection | 1. Add individual countries + region in blocklist<br>2. Switch modes<br>3. Switch back | All selections (individual + region) preserved | Screenshot |
| 4.4 | Maximum countries | 1. Select all 240+ countries in blocklist<br>2. Switch to allowlist<br>3. Switch back | All countries reappear (performance test) | Screenshot |

### Test Category 5: Regression Testing

| # | Test | Actions | Expected | Evidence Type |
|---|------|---------|----------|---------------|
| 5.1 | Search functionality | Search for "united" in dropdown | Filters to United States, United Kingdom, etc. | Screenshot |
| 5.2 | Country removal | Click X on a country chip | Country is removed from list | Screenshot |
| 5.3 | Clear all button | Click "Clear all" | All countries removed from current mode | Screenshot |
| 5.4 | Geo-failure handling | Change geo-failure setting | Setting persists after mode switch | Screenshot |

## ARTIFACT TRACKING

| Test ID | Executed? | Screenshot/Evidence | Pass/Fail | Notes |
|---------|-----------|---------------------|-----------|-------|
| 1.1 | ☐ | [pending] | [pending] | Core AC1 test |
| 1.2 | ☐ | [pending] | [pending] | Core AC2 test |
| 1.3 | ☐ | [pending] | [pending] | Edge case |
| 2.1 | ☐ | [pending] | [pending] | Core AC3 test |
| 2.2 | ☐ | [pending] | [pending] | Complex scenario |
| 3.1 | ☐ | [pending] | [pending] | Core AC4 test |
| 3.2 | ☐ | [pending] | [pending] | Core AC4 test |
| 3.3 | ☐ | [pending] | [pending] | Important save behavior |
| 4.1 | ☐ | [pending] | [pending] | Region handling |
| 4.2 | ☐ | [pending] | [pending] | Special group handling |
| 4.3 | ☐ | [pending] | [pending] | Mixed selection |
| 4.4 | ☐ | [pending] | [pending] | Performance/stress test |
| 5.1 | ☐ | [pending] | [pending] | Regression |
| 5.2 | ☐ | [pending] | [pending] | Regression |
| 5.3 | ☐ | [pending] | [pending] | Regression |
| 5.4 | ☐ | [pending] | [pending] | Regression |

## SCREENSHOTS PLANNED

Minimum screenshots required (all will be saved to `docs/agent-output/qa-screenshots/`):

1. `TKT-089-V2-01-initial-state.png` - Initial blocklist page
2. `TKT-089-V2-02-blocklist-with-countries.png` - After adding US, UK, CA to blocklist
3. `TKT-089-V2-03-switched-to-allowlist.png` - After switching to allowlist (shows empty)
4. `TKT-089-V2-04-allowlist-with-countries.png` - After adding FR, DE to allowlist
5. `TKT-089-V2-05-back-to-blocklist.png` - After switching back to blocklist (US, UK, CA should reappear)
6. `TKT-089-V2-06-back-to-allowlist.png` - After switching back to allowlist (FR, DE should reappear)
7. `TKT-089-V2-07-after-save-reload.png` - After saving and reloading page
8. `TKT-089-V2-08-edge-case-region.png` - Region selection test
9. `TKT-089-V2-09-multiple-switches.png` - After multiple switches (final state)

## TEST ENVIRONMENT

- **Dashboard URL**: http://localhost:3189
- **Test Organization**: Will use existing test org or create new one
- **Test User**: Admin user with blocklist permissions
- **Browser**: Default browser for Playwright MCP

## SUCCESS CRITERIA

This QA will PASS if:
- ✅ All 5 acceptance criteria are verified through BROWSER TESTING
- ✅ All 16 test cases execute successfully
- ✅ Minimum 9 screenshots captured as evidence
- ✅ No new build errors introduced
- ✅ No regressions in existing blocklist functionality
- ✅ Code changes match the implementation described in dev completion report

This QA will FAIL if:
- ❌ Any acceptance criterion is not met
- ❌ Data is lost when switching modes
- ❌ Saving doesn't work correctly for either mode
- ❌ Build errors are introduced
- ❌ Existing functionality breaks

## NOTES

- This is a V2 attempt (previous attempt failed QA)
- Original issue: Users lose their entire country list when switching modes
- Solution: Separate state for each mode, preserved across switches
- Risk: Low - purely client-side state management
- Must verify: Only the active mode's data is saved to database

---

**Test Plan Created**: 2025-12-13
**QA Agent**: Claude Sonnet 4.5
**Status**: Ready to Execute
