# Review Agent 11: SEC-002

You are a Review Agent. Review **SEC-002: Sanitize Sensitive Fields in Co-Browse Snapshots**.

**Branch:** `fix/SEC-002-cobrowse-sanitization`

## Review Checklist

### 1. Security (CRITICAL)
- [ ] Password inputs masked/cleared
- [ ] Credit card fields masked
- [ ] Other sensitive inputs (SSN, CVV) handled
- [ ] No way to bypass sanitization

### 2. Implementation
- [ ] Sanitization happens BEFORE DOM serialization
- [ ] Uses appropriate selectors (type, autocomplete, name patterns)
- [ ] Masked value is consistent (asterisks or empty)

### 3. Functionality
- [ ] Co-browse still works for non-sensitive content
- [ ] No performance impact from sanitization
- [ ] Edge cases handled (dynamically added inputs)

### 4. Coverage
- [ ] `<input type="password">`
- [ ] `<input autocomplete="cc-*">`
- [ ] `<input name="*password*">`
- [ ] `<input name="*ssn*">`
- [ ] `<input name="*cvv*">`

## How to Review
```bash
git checkout fix/SEC-002-cobrowse-sanitization
git diff main...fix/SEC-002-cobrowse-sanitization
```

## Output
Report: APPROVED / CHANGES REQUESTED / BLOCKED with details.

## ⚠️ REQUIRED: Notify PM When Done

**After completing your review, append this to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** Review Agent 11
- **Ticket:** SEC-002
- **Status:** APPROVED / CHANGES_REQUESTED / BLOCKED
- **Branch:** fix/SEC-002-cobrowse-sanitization
- **Output:** Review report above
- **Notes:** [One line summary]
```

**This is mandatory. PM checks this file to update the task board.**

