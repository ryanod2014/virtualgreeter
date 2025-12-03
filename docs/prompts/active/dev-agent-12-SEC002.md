# Dev Agent 12: SEC-002

You are a Dev Agent. Your job is to implement fix **SEC-002: Sanitize Sensitive Fields in Co-Browse Snapshots**.

## Your Assignment

**Ticket:** SEC-002
**Priority:** P0 (Ship Blocker - CRITICAL SECURITY)
**Source:** CRIT-A5-001 - Doc Agent 15

**Problem:**
When co-browse captures the DOM via `captureSnapshot()`, it does NOT sanitize sensitive input fields:
- Password inputs (`<input type="password">`) have their values captured
- Credit card fields and other sensitive inputs are also captured
- Agents can see everything visitors type into forms

This is a **privacy violation and security risk**.

**Solution:**
Before capturing the DOM snapshot, sanitize/mask all sensitive input fields:
1. Mask password fields (replace value with asterisks or clear it)
2. Mask inputs with `autocomplete="cc-*"` (credit card)
3. Mask inputs with sensitive patterns (ssn, cvv, etc.)
4. Consider masking ALL input values and only showing them on request

**Files to Modify:**
- `apps/widget/src/features/cobrowse/useCobrowse.ts` - Add sanitization in captureSnapshot()

**Acceptance Criteria:**
- [ ] Password input values are NOT captured (masked or cleared)
- [ ] Credit card fields are NOT captured
- [ ] Other sensitive fields (ssn, cvv) are masked
- [ ] Co-browse still works for non-sensitive content
- [ ] All verification checks pass

## Implementation Approach

In `captureSnapshot()`, before capturing the HTML:

```typescript
const docClone = document.cloneNode(true) as Document;

// Sanitize sensitive inputs
const sensitiveInputs = docClone.querySelectorAll(
  'input[type="password"], ' +
  'input[autocomplete*="cc-"], ' +
  'input[autocomplete="current-password"], ' +
  'input[autocomplete="new-password"], ' +
  'input[name*="password"], ' +
  'input[name*="ssn"], ' +
  'input[name*="cvv"]'
);

sensitiveInputs.forEach(input => {
  (input as HTMLInputElement).value = '••••••••';
});

// Also mask any input with actual content for privacy
const allInputs = docClone.querySelectorAll('input, textarea');
allInputs.forEach(input => {
  const el = input as HTMLInputElement | HTMLTextAreaElement;
  if (el.type === 'password' || el.type === 'hidden') {
    el.value = '';
  }
  // Optionally mask all values
});
```

## Your SOP

### Phase 0: Git Setup
```bash
git checkout main
git pull origin main
git checkout -b fix/SEC-002-cobrowse-sanitization
```

### Phase 1: Understand
1. Read `apps/widget/src/features/cobrowse/useCobrowse.ts` completely
2. Find `captureSnapshot()` function
3. Understand how DOM is cloned and serialized

### Phase 2: Implement
Add sensitive field sanitization before DOM serialization.

### Phase 3: Self-Verification
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

### Phase 4: Git Commit
```bash
git add .
git commit -m "fix(SEC-002): sanitize sensitive fields in co-browse snapshots

- Mask password inputs before DOM capture
- Mask credit card and other sensitive fields
- Prevents privacy violation in co-browse

SECURITY FIX - Closes SEC-002"
git push origin fix/SEC-002-cobrowse-sanitization
```

### Phase 5: Report completion

