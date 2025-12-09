# QA Review Agent: TKT-001 - Co-Browse Sensitive Data Sanitization

> **Type:** QA Review
> **Ticket:** TKT-001
> **Priority:** Critical
> **Branch:** `agent/TKT-001-cobrowse-sanitization`

---

## Ticket to Review

- **Ticket ID:** TKT-001
- **Ticket Title:** Co-Browse Sensitive Data Sanitization
- **Branch:** `agent/TKT-001-cobrowse-sanitization`
- **Priority:** critical

---

## Ticket Spec Summary

### Issue

Password fields, credit card numbers, and other sensitive data are captured in DOM snapshots and transmitted to agents during co-browse sessions. This exposes plaintext passwords, violates PCI compliance, and creates privacy risks.

### Fix Required

1. Add maskSensitiveFields() function to domSerializer.ts
2. Mask password fields with ••••••••
3. Mask credit card inputs (input[autocomplete='cc-number'], input[type='tel'])
4. Mask elements with data-sensitive='true' attribute

### Files Modified

- `apps/widget/src/features/cobrowse/domSerializer.ts`

### Out of Scope

- Do NOT modify CobrowseViewer.tsx display logic
- Do NOT add org-level toggle for masking (separate ticket TKT-009)
- Do NOT change the snapshot transmission mechanism

---

## Acceptance Criteria to Verify

1. [ ] Password input values show as •••••••• in agent viewer
2. [ ] Credit card fields (autocomplete='cc-number') show as masked
3. [ ] Elements with data-sensitive='true' attribute are masked
4. [ ] Regular form fields display normally (not masked)
5. [ ] New unit test file: domSerializer.test.ts covers masking logic

---

## Dev Checks (Already Completed by Dev)

- [ ] pnpm typecheck passes
- [ ] pnpm build passes
- [ ] Manual: Create test.html with password field, type 'secret', verify serialized output shows ••••••••

---

## QA Notes

Test with React form libraries (react-hook-form), vanilla HTML forms, and dynamic forms. Verify masked fields display correctly in agent's CobrowseViewer.

---

## Testing Environment

- **Local URL:** http://localhost:3000
- **Widget Test Page:** http://localhost:5173 (vite dev server for widget)
- **Test Page:** apps/widget/public/test.html

---

## Browser Tests Required?

- [x] Yes - UI changes that need visual verification

Key flows to test:
1. Load test.html with password field, verify DOM serialization masks password value
2. Test with credit card input (autocomplete='cc-number'), verify masking
3. Test with data-sensitive='true' attribute, verify masking
4. Test regular text input is NOT masked

---

## Instructions

1. Read `docs/workflow/QA_REVIEW_AGENT_SOP.md` for full process
2. Checkout the branch: `agent/TKT-001-cobrowse-sanitization`
3. Run all build verification steps
4. Verify each acceptance criterion
5. Use Playwright MCP for browser testing if applicable
6. Make PASS/FAIL decision
7. Write appropriate report to `docs/agent-output/qa-results/`
8. If FAILED, also write blocker to `docs/agent-output/blocked/`

---

## Launch Command

```
You are a QA Review Agent. Read docs/workflow/QA_REVIEW_AGENT_SOP.md then execute: docs/prompts/active/qa-review-TKT-001.md
```

