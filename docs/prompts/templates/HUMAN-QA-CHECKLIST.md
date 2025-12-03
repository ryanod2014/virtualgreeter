# Human QA Checklist Template

> **QA Agent generates this** after automated testing.
> **Human QA team uses this** to test what automation can't verify.

---

## TEMPLATE START

---

# Human QA Checklist: [TICKET ID] - [TITLE]

**Date:** [Date]
**QA Agent:** [Which QA agent ran automated tests]
**Automated Tests:** [X/Y Passed]

---

## What This Fix Does

**Original Issue:** 
[What was broken/missing]

**The Fix:**
[What was changed]

**Desired Functionality:**
[Exactly what should happen now - from the human's original decision]

---

## Automated Testing Summary

| Test Type | Result | Notes |
|-----------|--------|-------|
| API Responses | ✅/❌ | [summary] |
| Database State | ✅/❌ | [summary] |
| UI Renders | ✅/❌ | [summary] |
| Console Errors | ✅/❌ | [summary] |

**Automated Recommendation:** [APPROVE / REJECT / CONDITIONAL]

---

## 🔴 HUMAN TESTING REQUIRED

The following could NOT be verified by automation. **You must test these.**

---

### Test HT-1: [Scenario Name]

**Category:** [ ] UI Visual | [ ] WebRTC | [ ] Video | [ ] Audio | [ ] Mobile | [ ] UX Feel

**Why Automation Can't Test:**
[Specific reason - e.g., "Can't judge if colors look correct"]

**Setup:**
1. [Exact setup step 1]
2. [Exact setup step 2]
3. [State you should be in before testing]

**Test Steps:**
1. [Action 1]
2. [Action 2]
3. [Action 3]

**Expected Result:**
[Exactly what should happen - be very specific]

**What to Look For:**
- [ ] [Specific thing to check]
- [ ] [Specific thing to check]
- [ ] [Specific thing to check]

**Screenshots/Reference:**
[QA agent attaches screenshots from automated testing as reference]

---

**Your Result:**
- [ ] ✅ PASS - Behaves as expected
- [ ] ❌ FAIL - Issue found (describe below)

**Notes/Issues Found:**
```
[Write any issues here]
```

---

### Test HT-2: [Scenario Name]

[Same format as HT-1]

---

### Test HT-3: [Scenario Name]

[Same format as HT-1]

---

## Final Verdict

After completing all human tests:

- [ ] ✅ **APPROVE** - All human tests pass, ready to merge
- [ ] ❌ **REJECT** - Issues found, back to dev

**Tested by:** _______________
**Date:** _______________

**Issues to Fix (if rejected):**
1. [Issue 1]
2. [Issue 2]

---

## TEMPLATE END

---

## QA Agent Notes

When generating this checklist:
1. Include EVERY scenario that needs human verification
2. Be very specific about expected results
3. Include screenshots as reference
4. Copy the "Desired Functionality" from original decision/ticket
5. Save to `docs/qa-checklists/[TICKET-ID]-human-qa.md`

