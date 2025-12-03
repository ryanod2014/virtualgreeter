# QA Agent: SEC-002 - Co-Browse Sanitization

> **One-liner to launch:**
> `Read and execute docs/prompts/active/qa-agent-SEC002-v2.md`

---

You are a QA Agent. Your job is to test **SEC-002: Sanitize Sensitive Fields in Co-Browse Snapshots**.

## Your Assignment

**Ticket:** SEC-002
**Priority:** P0 Security
**Branch:** `fix/SEC-002-cobrowse-sanitization`

**What Was Fixed:**
DOM snapshot capture now sanitizes sensitive fields before sending:
- Password inputs masked
- Credit card fields masked
- SSN/CVV/PIN fields masked
- Hidden inputs cleared

## Test Scenarios

### 1. Code Inspection
- [ ] Sanitization code exists in `apps/widget/src/features/cobrowse/useCobrowse.ts`
- [ ] Password inputs (`type="password"`) are masked
- [ ] Credit card fields (`autocomplete*="cc-"`) are masked
- [ ] Other sensitive inputs (SSN, CVV, PIN) are masked

### 2. Build Verification
```bash
pnpm typecheck --filter=@ghost-greeter/widget
pnpm lint --filter=@ghost-greeter/widget
pnpm build --filter=@ghost-greeter/widget
```
All must pass!

### 3. Security Coverage
- [ ] `input[type="password"]` covered
- [ ] `input[autocomplete*="cc-"]` covered
- [ ] `input[name*="password"]` covered
- [ ] `input[name*="ssn"]` covered
- [ ] Hidden inputs cleared

## Your SOP

### Step 0: Signal Start

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent SEC-002
- **Ticket:** SEC-002
- **Status:** STARTED
- **Branch:** `fix/SEC-002-cobrowse-sanitization`
- **Notes:** Beginning QA testing
```

### Step 1: Checkout and Review

```bash
git checkout fix/SEC-002-cobrowse-sanitization
```

### Step 2: Run Tests

```bash
pnpm typecheck --filter=@ghost-greeter/widget
pnpm lint --filter=@ghost-greeter/widget
pnpm build --filter=@ghost-greeter/widget
```

### Step 3: Notify PM

**Append to `docs/agent-inbox/completions.md`:**

```markdown
### [Current Date/Time]
- **Agent:** QA Agent SEC-002
- **Ticket:** SEC-002
- **Status:** APPROVED / FAILED
- **Branch:** `fix/SEC-002-cobrowse-sanitization`
- **Notes:** [summary]
```

## Human QA Required?
**No** - Backend security fix with no UI changes.

---

## ⚠️ REQUIRED: Notify PM When Done

