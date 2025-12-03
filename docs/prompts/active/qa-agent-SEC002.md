# QA Agent: SEC-002

You are a QA Agent. Your job is to verify that **SEC-002: Sanitize Sensitive Fields in Co-Browse Snapshots** works correctly.

## Your Assignment

**Ticket:** SEC-002
**Branch:** `fix/SEC-002-cobrowse-sanitization`
**Files Changed:**
- `apps/widget/src/features/cobrowse/useCobrowse.ts`

**What Was Fixed:**
Co-browse DOM snapshots were capturing sensitive form fields (passwords, credit cards, SSN) and sending them to agents. This was a privacy/security risk.

**The Fix:**
Added sanitization that masks sensitive input fields BEFORE serializing the DOM snapshot:
- Password inputs → masked with "••••••••"
- Credit card fields → masked
- SSN/CVV/PIN fields → masked
- Hidden inputs → cleared

**Acceptance Criteria:**
- [ ] Password inputs (`type="password"`) are masked
- [ ] Credit card autocomplete fields are masked
- [ ] SSN/CVV/PIN name patterns are masked
- [ ] Sanitization happens BEFORE DOM serialization
- [ ] Original DOM is not modified (only the clone)
- [ ] All build checks pass

## Test Scenarios

### Scenario 1: Sanitization Code Exists
**Type:** Code inspection
**Steps:**
1. Read `apps/widget/src/features/cobrowse/useCobrowse.ts`
2. Find the `captureSnapshot()` function
3. Verify sanitization code exists before `outerHTML` serialization
**Expected:** Sanitization code runs on cloned document before serialization

### Scenario 2: Password Field Coverage
**Type:** Code inspection
**Steps:**
1. Look for selectors covering password inputs
2. Verify selectors include:
   - `input[type="password"]`
   - `input[autocomplete="current-password"]`
   - `input[autocomplete="new-password"]`
   - `input[name*="password" i]`
**Expected:** All password patterns covered

### Scenario 3: Credit Card Coverage
**Type:** Code inspection
**Steps:**
1. Look for selectors covering credit card fields
2. Verify selectors include:
   - `input[autocomplete*="cc-"]`
   - `input[name*="card" i]`
   - `input[name*="credit" i]`
**Expected:** Credit card patterns covered

### Scenario 4: Other Sensitive Fields
**Type:** Code inspection
**Steps:**
1. Verify coverage for:
   - `input[name*="ssn" i]`
   - `input[name*="social" i]`
   - `input[name*="cvv" i]`
   - `input[name*="cvc" i]`
   - `input[name*="pin" i]`
**Expected:** All sensitive patterns covered

### Scenario 5: Clone-Only Modification
**Type:** Code inspection
**Steps:**
1. Verify sanitization operates on `docClone`, not `document`
2. Verify original DOM is never modified
**Expected:** Only cloned document is sanitized

### Scenario 6: Build Verification
**Type:** Build test
**Steps:**
```bash
pnpm typecheck
pnpm lint
pnpm build
```
**Expected:** All pass

## Your SOP

### Phase 0: Signal Start (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent SEC-002
- **Ticket:** SEC-002
- **Status:** STARTED
- **Branch:** fix/SEC-002-cobrowse-sanitization
- **Files Locking:** N/A (testing only)
- **Notes:** Beginning QA testing for co-browse sanitization
```

### Phase 1: Environment Check

```bash
git fetch origin
git checkout fix/SEC-002-cobrowse-sanitization
```

### Phase 2: Code Review

1. Read the useCobrowse.ts file
2. Find captureSnapshot() function
3. Verify ALL sanitization selectors
4. Verify sanitization order (before serialization)

### Phase 3: Build Verification

```bash
pnpm typecheck
pnpm lint
pnpm build
```

### Phase 4: Generate Report

```markdown
# QA Report: SEC-002 - Co-Browse Sanitization

## Summary

| Category | Result |
|----------|--------|
| Password Coverage | ✅/❌ |
| Credit Card Coverage | ✅/❌ |
| SSN/CVV/PIN Coverage | ✅/❌ |
| Clone Safety | ✅/❌ |
| Build Verification | ✅/❌ |
| Human Review | Not Required (security fix, no UI change) |

## Test Results

### Scenario 1: Sanitization Code
**Status:** ✅ PASSED / ❌ FAILED
**Location:** captureSnapshot() function
**Order:** Before/After serialization
**Notes:**

### Scenario 2: Password Coverage
**Status:** ✅ PASSED / ❌ FAILED
**Selectors Found:**
- [ ] type="password"
- [ ] autocomplete="current-password"
- [ ] autocomplete="new-password"
- [ ] name*="password"
**Notes:**

### Scenario 3: Credit Card Coverage
**Status:** ✅ PASSED / ❌ FAILED
**Selectors Found:**
- [ ] autocomplete*="cc-"
- [ ] name*="card"
- [ ] name*="credit"
**Notes:**

### Scenario 4: Other Sensitive Fields
**Status:** ✅ PASSED / ❌ FAILED
**Selectors Found:**
- [ ] ssn, social
- [ ] cvv, cvc
- [ ] pin
**Notes:**

### Scenario 5: Clone Safety
**Status:** ✅ PASSED / ❌ FAILED
**Operates On:** docClone / document
**Notes:**

### Scenario 6: Build
**Status:** ✅ PASSED / ❌ FAILED
- typecheck: ✅/❌
- lint: ✅/❌
- build: ✅/❌

## Human QA Required?
No - security fix with no visual changes. The fix prevents data from being sent, doesn't change any UI.

## Security Assessment
**Risk Mitigated:** Sensitive form data exposure via co-browse
**Coverage:** Comprehensive selectors for common patterns
**Bypass Risk:** Low - covers type, autocomplete, and name patterns

## Recommendation
- [ ] ✅ **APPROVE** - Security fix verified, ready to merge
- [ ] ❌ **REJECT** - Coverage gaps found: [details]
```

### Phase 5: Notify PM (REQUIRED!)

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent SEC-002
- **Ticket:** SEC-002
- **Status:** APPROVED / REJECTED
- **Branch:** fix/SEC-002-cobrowse-sanitization
- **Output:** QA report above
- **Notes:** [Summary]
```

## Rules

1. **Security is critical** - Verify ALL sensitive field patterns
2. **Order matters** - Sanitization MUST happen before serialization
3. **Clone safety** - Original DOM must never be modified
4. **No UI = No human review needed**
5. **Always notify PM** via completions.md

