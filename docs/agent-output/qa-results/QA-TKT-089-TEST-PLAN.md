# Test Plan for TKT-089-V2-V3: Save Blocklist Mode Data When Switching Modes

**Ticket:** TKT-089
**Type:** UI (React component - browser testing REQUIRED)
**Branch:** agent/tkt-089
**QA Agent Session:** 48e4353b-d5aa-4e3d-a82c-ebbda459ee68
**Dashboard Port:** 3189
**Created:** 2025-12-12

---

## Implementation Summary

The feature implements dual-state tracking for blocklist and allowlist country selections:
- Separate state variables: `blocklistCountries` and `allowlistCountries`
- Both initialized with `initialBlockedCountries` to support seamless mode switching
- `countryList` computed value returns the active mode's list
- `setCountryList` updates the active mode's state
- Only active mode's list is saved to database

---

## Acceptance Criteria to Verify

1. ✅ Switching from blocklist to allowlist preserves blocklist selections
2. ✅ Switching from allowlist to blocklist preserves allowlist selections
3. ✅ Can switch between modes multiple times without losing data
4. ✅ Saving updates the database with the currently active mode's list
5. ✅ F-038 is resolved

---

## Browser Tests (MANDATORY - UI Component Changed)

### Test Setup
- Navigate to: http://localhost:3189/admin/settings/blocklist
- Test user: [admin account with access to settings]
- Screenshot directory: docs/agent-output/qa-screenshots/

### Test 1: Happy Path - Blocklist to Allowlist
**Purpose:** Verify AC1 - Switching from blocklist to allowlist preserves blocklist selections

| Step | Action | Expected Result | Evidence Type |
|------|--------|----------------|---------------|
| 1.1 | Navigate to blocklist settings | Page loads in current mode | Screenshot: TKT-089-01-initial.png |
| 1.2 | Select 3-5 countries in blocklist mode | Countries appear as selected | Screenshot: TKT-089-02-blocklist-selected.png |
| 1.3 | Click "Allowlist" mode toggle | Mode switches to allowlist | Screenshot: TKT-089-03-switched-to-allowlist.png |
| 1.4 | Click "Blocklist" mode toggle | Returns to blocklist mode | Screenshot: TKT-089-04-back-to-blocklist.png |
| 1.5 | Verify original selections | All 3-5 countries still selected | Screenshot: TKT-089-05-blocklist-preserved.png |

**Pass Criteria:** Screenshots show same countries selected before and after mode switch

---

### Test 2: Happy Path - Allowlist to Blocklist
**Purpose:** Verify AC2 - Switching from allowlist to blocklist preserves allowlist selections

| Step | Action | Expected Result | Evidence Type |
|------|--------|----------------|---------------|
| 2.1 | Start in allowlist mode | Allowlist mode active | Screenshot: TKT-089-06-allowlist-mode.png |
| 2.2 | Select different 3-5 countries | Countries selected in allowlist | Screenshot: TKT-089-07-allowlist-selected.png |
| 2.3 | Switch to blocklist mode | Mode changes to blocklist | Screenshot: TKT-089-08-switched-to-blocklist.png |
| 2.4 | Switch back to allowlist | Returns to allowlist mode | Screenshot: TKT-089-09-back-to-allowlist.png |
| 2.5 | Verify selections preserved | Same countries still selected | Screenshot: TKT-089-10-allowlist-preserved.png |

**Pass Criteria:** Allowlist selections survive round-trip mode switch

---

### Test 3: Multiple Mode Switches with Different Selections
**Purpose:** Verify AC3 - Can switch between modes multiple times without losing data

| Step | Action | Expected Result | Evidence Type |
|------|--------|----------------|---------------|
| 3.1 | Blocklist: Select USA, Canada, Mexico | 3 countries selected | Screenshot: TKT-089-11-blocklist-3-countries.png |
| 3.2 | Switch to allowlist | Mode switches | Screenshot: TKT-089-12-to-allowlist.png |
| 3.3 | Allowlist: Select UK, France, Germany | 3 different countries selected | Screenshot: TKT-089-13-allowlist-3-countries.png |
| 3.4 | Switch to blocklist | Mode switches | Screenshot: TKT-089-14-to-blocklist.png |
| 3.5 | Verify USA, Canada, Mexico still there | Original blocklist preserved | Screenshot: TKT-089-15-blocklist-still-has-original.png |
| 3.6 | Switch to allowlist again | Mode switches | Screenshot: TKT-089-16-to-allowlist-again.png |
| 3.7 | Verify UK, France, Germany still there | Allowlist preserved | Screenshot: TKT-089-17-allowlist-still-has-data.png |

**Pass Criteria:** Both modes maintain separate, independent state across multiple switches

---

### Test 4: Save Behavior - Active Mode Only
**Purpose:** Verify AC4 - Saving updates the database with the currently active mode's list

| Step | Action | Expected Result | Evidence Type |
|------|--------|----------------|---------------|
| 4.1 | Blocklist: Select 3 countries | Blocklist has data | Screenshot: TKT-089-18-blocklist-before-save.png |
| 4.2 | Switch to allowlist | Mode changes | - |
| 4.3 | Allowlist: Select 2 different countries | Allowlist has different data | Screenshot: TKT-089-19-allowlist-before-save.png |
| 4.4 | Click "Save Changes" while in allowlist | Save succeeds | Screenshot: TKT-089-20-saved-in-allowlist.png |
| 4.5 | Refresh page (hard reload) | Page reloads | - |
| 4.6 | Verify mode is allowlist | Loads in allowlist mode | Screenshot: TKT-089-21-reload-shows-allowlist.png |
| 4.7 | Verify 2 countries from allowlist are shown | Only allowlist data persisted | Screenshot: TKT-089-22-allowlist-data-persisted.png |
| 4.8 | Switch to blocklist | Mode switches | - |
| 4.9 | Verify blocklist now shows the 2 countries too | Both states initialized from saved data | Screenshot: TKT-089-23-blocklist-initialized-from-saved.png |

**Pass Criteria:**
- Only active mode's data is saved to database
- After reload, both states initialize with saved data
- Saved mode is the active mode after reload

---

### Test 5: Edge Case - Empty State Switching
**Purpose:** Test switching modes when no countries are selected

| Step | Action | Expected Result | Evidence Type |
|------|--------|----------------|---------------|
| 5.1 | Clear all selections in blocklist | No countries selected | Screenshot: TKT-089-24-empty-blocklist.png |
| 5.2 | Switch to allowlist | Empty allowlist shown | Screenshot: TKT-089-25-empty-allowlist.png |
| 5.3 | Switch back to blocklist | Still empty | Screenshot: TKT-089-26-still-empty.png |
| 5.4 | Add 1 country to blocklist | 1 country selected | Screenshot: TKT-089-27-one-country.png |
| 5.5 | Switch to allowlist | Empty (different state) | Screenshot: TKT-089-28-allowlist-empty-different-state.png |
| 5.6 | Switch back | 1 country still there | Screenshot: TKT-089-29-one-country-preserved.png |

**Pass Criteria:** Empty and non-empty states are preserved independently

---

### Test 6: Edge Case - Rapid Mode Switching
**Purpose:** Test UI stability with rapid clicking

| Step | Action | Expected Result | Evidence Type |
|------|--------|----------------|---------------|
| 6.1 | Select 2 countries in blocklist | 2 selected | Screenshot: TKT-089-30-rapid-initial.png |
| 6.2 | Rapidly click blocklist/allowlist 5 times | No crashes or errors | Console log check |
| 6.3 | Verify final state is consistent | Shows correct mode | Screenshot: TKT-089-31-rapid-final.png |
| 6.4 | Verify data not corrupted | Original selections intact | Screenshot: TKT-089-32-data-intact.png |

**Pass Criteria:** No console errors, data remains consistent

---

## Edge Cases to Test

| # | Edge Case | Expected Behavior | How to Verify |
|---|-----------|-------------------|---------------|
| 1 | Empty blocklist → switch → empty allowlist | Both empty, switching works | Browser test |
| 2 | 50+ countries selected → switch | All preserved | Browser test |
| 3 | Rapid mode toggling | No race conditions | Console errors, visual test |
| 4 | Special groups selected → switch | Selections preserved | Browser test |
| 5 | Regions selected → switch | Selections preserved | Browser test |

---

## State Verification

After browser testing, verify:

| Check | Method | Expected |
|-------|--------|----------|
| No React warnings in console | Browser DevTools console | Clean console |
| State updates are synchronous | Visual inspection during testing | Immediate UI updates |
| No memory leaks | Multiple switches, check performance | No slowdown |

---

## Build Verification

Before browser testing:

```bash
pnpm install
pnpm typecheck  # Note: Pre-existing merge conflicts in OTHER files
pnpm lint
pnpm build
pnpm test
```

**Expected:**
- Pre-existing errors in other files (not related to TKT-089) are acceptable
- New errors in blocklist-settings-client.tsx would be a FAIL

---

## ARTIFACT TRACKING

| Test | Type | Executed? | Evidence | Pass/Fail |
|------|------|-----------|----------|-----------|
| Build verification | Build | ☐ | Terminal output | [pending] |
| Test 1: Blocklist→Allowlist preservation | Browser | ☐ | Screenshots 01-05 | [pending] |
| Test 2: Allowlist→Blocklist preservation | Browser | ☐ | Screenshots 06-10 | [pending] |
| Test 3: Multiple switches | Browser | ☐ | Screenshots 11-17 | [pending] |
| Test 4: Save behavior | Browser | ☐ | Screenshots 18-23 | [pending] |
| Test 5: Empty state | Browser | ☐ | Screenshots 24-29 | [pending] |
| Test 6: Rapid switching | Browser | ☐ | Screenshots 30-32 | [pending] |

---

## Self-Audit Checklist (To Complete Before Marking PASS)

### Execution Evidence
- [ ] Total browser tests executed: ___ (should be ≥6)
- [ ] Total screenshots captured: ___ (should be ≥32)
- [ ] No "verified via code inspection" phrases in report
- [ ] Every test has execution evidence (screenshots)

### Browser Testing
- [ ] Dashboard started on correct port (3189)
- [ ] Actually clicked through all test scenarios
- [ ] Screenshots show REAL browser, not code
- [ ] Tested mode switching in BOTH directions
- [ ] Verified save behavior with page reload

### Coverage
- [ ] All 5 acceptance criteria tested
- [ ] Edge cases tested (empty, rapid switching)
- [ ] State preservation verified visually
- [ ] Console checked for errors

---

## FORBIDDEN SHORTCUTS - REMINDER

❌ "Verified via code inspection" → USE THE BROWSER
❌ "Logic appears correct" → PROVE IT WITH SCREENSHOTS
❌ "Unit tests pass" → TEST IN REAL BROWSER
❌ Testing one scenario and inferring others work → TEST EACH SCENARIO

**THE RULE:** If you didn't open the browser and click it, you didn't test it.
