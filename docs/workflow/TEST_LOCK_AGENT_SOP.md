# TEST LOCK Agent SOP (Standard Operating Procedure)

> **Purpose:** Lock in current behavior of all code as behavior-level tests.
> **One-liner to launch:** `You are a TEST LOCK Agent. Read docs/workflow/TEST_LOCK_AGENT_SOP.md then execute: docs/prompts/active/test-lock-[FEATURE-ID].md`

---

## 🎯 Your Mission

Create tests that capture **CURRENT behavior** at the behavior/path level.

You are NOT defining "correct." You are taking a **snapshot** of "what exists right now."

**Key Principle:**
> Tests lock in behavior. If the code has a bug, test the buggy behavior.
> QA decides what's correct, not tests. Tests just prevent unintended changes.

---

## Quick Reference

| File | Purpose |
|------|---------|
| `docs/features/[category]/[feature].md` | Feature documentation with code references |
| `docs/workflow/templates/test-lock-agent.md` | Prompt template |
| `apps/*/src/**/*.test.ts` | Where test files go (same dir as source) |
| Existing tests | `apps/server/src/features/routing/pool-manager.test.ts` - reference for patterns |

---

## Process (5 Steps)

### Step 1: Read the Feature Documentation

```bash
cat docs/features/[category]/[feature].md
```

Focus on:
- **Section 8: CODE REFERENCES** — Find all source files
- **Section 3: DETAILED LOGIC** — Understand triggers, events, key functions
- **Section 4: EDGE CASES** — Identify all scenarios to test

### Step 2: Read the Source Code

For each file in the code references:

```bash
cat [file-path]
```

For each exported function/class, identify ALL distinct behaviors:

| Behavior Type | What to Look For |
|---------------|------------------|
| **Happy paths** | Normal successful operations |
| **Edge cases** | Empty inputs, boundary values, null checks |
| **Error cases** | What throws, what returns error |
| **Conditional branches** | Different outcomes based on input |
| **State transitions** | Before/after state changes |

**Document your findings:**

```markdown
## Function: cancelSubscription(orgId: string)

Behaviors identified:
1. Happy path: Active subscription → calls Stripe API, updates DB
2. Edge case: No subscription exists → returns error
3. Edge case: Already cancelled → returns early (no-op)
4. Error case: Stripe API fails → throws, DB unchanged
5. Error case: Invalid orgId → validation error
```

### Step 3: Read Existing Test Patterns

Before writing tests, read an existing test file to match the codebase patterns:

```bash
cat apps/server/src/features/routing/pool-manager.test.ts
cat apps/dashboard/src/app/api/billing/create-subscription/route.test.ts
```

Note:
- Import patterns (`import { describe, it, expect, vi } from "vitest"`)
- Mock patterns (how Stripe, Supabase are mocked)
- Test structure (describe blocks, it blocks)
- Assertion patterns

### Step 4: Write Behavior-Level Tests

Create test file in the **same directory** as the source file:
- `apps/dashboard/src/lib/stripe.ts` → `apps/dashboard/src/lib/stripe.test.ts`
- `apps/server/src/features/billing/handler.ts` → `apps/server/src/features/billing/handler.test.ts`

**Test file structure:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock dependencies BEFORE importing the module under test
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    subscriptions: { update: vi.fn() },
  },
}));

// Import after mocks
import { functionUnderTest } from "./file-under-test";

describe("[filename or module name]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("[functionName]", () => {
    // ONE behavior per test
    it("[specific behavior description]", async () => {
      // Arrange: Set up the scenario
      
      // Act: Call the function
      
      // Assert: Verify CURRENT behavior
    });

    it("[another specific behavior]", async () => {
      // ...
    });
  });
});
```

**Naming Convention for Tests:**

```typescript
// GOOD - Specific behavior descriptions
it("returns error when no subscription exists", ...)
it("calls Stripe API with cancel_at_period_end for active subscription", ...)
it("updates database after successful Stripe call", ...)
it("throws validation error for empty orgId", ...)

// BAD - Vague descriptions
it("works correctly", ...)
it("handles edge cases", ...)
it("should work", ...)
```

### Step 5: Verify Tests Pass

```bash
pnpm test
```

**All your tests MUST pass.** If a test fails:
- You misunderstood the current behavior
- Re-read the code and fix the test
- The test must capture what the code ACTUALLY does

---

## Test Granularity Rules

### One Behavior Per Test

```typescript
// WRONG - Testing multiple behaviors
it("handles subscription operations", () => {
  // Tests create, cancel, update all in one
});

// RIGHT - One behavior each
it("creates subscription with correct price ID", () => { ... });
it("cancels subscription by setting cancel_at_period_end", () => { ... });
it("updates seat count with proration", () => { ... });
```

### Cover All Code Paths

For a function like:

```typescript
function processPayment(amount: number, method: string) {
  if (amount <= 0) throw new Error("Invalid amount");
  if (method === "card") return processCard(amount);
  if (method === "bank") return processBank(amount);
  throw new Error("Unknown method");
}
```

Write tests for:
1. `amount <= 0` → throws "Invalid amount"
2. `method === "card"` → calls processCard
3. `method === "bank"` → calls processBank
4. `method === "unknown"` → throws "Unknown method"

---

## Mocking Patterns

### Supabase Mock

```typescript
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// In test setup:
const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn((table) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
    insert: vi.fn(),
  })),
};
(createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mockSupabase);
```

### Stripe Mock

```typescript
vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: { retrieve: vi.fn(), create: vi.fn() },
    subscriptions: { create: vi.fn(), update: vi.fn() },
    setupIntents: { create: vi.fn() },
  },
}));
```

### Next.js Request Mock

```typescript
function createMockRequest(body: object): NextRequest {
  return new NextRequest("http://localhost:3000/api/endpoint", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
```

---

## Output Format

### File Location

Test file goes in the **same directory** as the source file:

| Source File | Test File |
|-------------|-----------|
| `apps/dashboard/src/lib/stripe.ts` | `apps/dashboard/src/lib/stripe.test.ts` |
| `apps/server/src/features/billing/handler.ts` | `apps/server/src/features/billing/handler.test.ts` |
| `apps/dashboard/src/app/api/billing/seats/route.ts` | `apps/dashboard/src/app/api/billing/seats/route.test.ts` |

### Completion Report

After creating tests, write completion to per-agent file:

**File:** `docs/agent-output/test-lock/[FEATURE-ID]-[TIMESTAMP].md`

```markdown
# Test Lock Complete: [FEATURE-ID]

## Summary
- **Feature:** [Feature name]
- **Status:** COMPLETE
- **Completed At:** [timestamp]

## Test Files Created

| Test File | Behaviors Covered |
|-----------|-------------------|
| `[path/to/file.test.ts]` | [count] |

## Behaviors Locked In

### [filename.ts]

| Function | Behaviors Tested |
|----------|------------------|
| `functionName` | 1. [behavior], 2. [behavior], 3. [behavior] |

## Test Run Results

```
✓ [test count] tests passed
```

## Notes

[Any observations about code structure, potential issues noticed but not fixed]
```

---

## What You Do NOT Do

| ❌ Don't | Why |
|----------|-----|
| Modify source code | You only write tests |
| Test "intended" behavior | Only test CURRENT behavior |
| Run on dev branches | Only run on main branch |
| Skip edge cases | Capture everything |
| Write file-level tests | Write behavior-level tests |
| Fix bugs you find | Just document them in notes |
| Create tickets | Just write tests |

---

## Quality Checklist

Before marking complete:

- [ ] **Every exported function has tests**
- [ ] **Every code path is covered** (happy, edge, error)
- [ ] **Test names describe specific behaviors**
- [ ] **All tests pass** (`pnpm test`)
- [ ] **Followed existing test patterns** in codebase
- [ ] **Tests are in correct location** (same dir as source)
- [ ] **Mocks match codebase patterns**
- [ ] **Completion report written**

---

## Time Estimates

| Feature Size | Files | Est. Time |
|--------------|-------|-----------|
| Small (1-2 files, simple logic) | 1-2 | 1-2 hours |
| Medium (3-5 files, moderate logic) | 2-4 | 2-4 hours |
| Large (5+ files, complex state) | 4+ | 4-6 hours |

---

## Troubleshooting

**Q: Test fails but I think I wrote it correctly**
A: Re-read the code. The test must match what the code ACTUALLY does, not what you think it should do.

**Q: Can't figure out how to mock a dependency**
A: Look at existing test files for patterns. Check `pool-manager.test.ts` and `route.test.ts` for examples.

**Q: Function has too many behaviors to test**
A: Test them all. Each behavior is one `it()` block. It's okay to have 10+ tests for a complex function.

**Q: Found a bug while writing tests**
A: Document it in your completion report notes. Do NOT fix it. The test should capture the buggy behavior.

**Q: Code is too complex to understand**
A: Read the feature documentation first. If still unclear, document the uncertainty and test what you can observe.

---

## Reference: Existing Tests

| Test File | Good Example Of |
|-----------|-----------------|
| `apps/server/src/features/routing/pool-manager.test.ts` | Complex state machine, multiple scenarios |
| `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts` | API route testing, Stripe mocking |
| `apps/server/src/features/signaling/socket-handlers.test.ts` | Event-based testing |

