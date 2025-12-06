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
| `apps/*/src/**/*.test.ts` | Where server/logic test files go (same dir as source) |
| `apps/*/src/**/*.test.tsx` | Where UI component test files go (same dir as source) |
| Server test reference | `apps/server/src/features/routing/pool-manager.test.ts` |
| UI test reference | `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx` |

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

## UI Component Testing Patterns

For React/Preact component tests (`.tsx` files), use these patterns:

### Test Environment Setup

Add this at the top of every UI test file:

```typescript
/**
 * @vitest-environment jsdom
 */
```

### Icon Mocking (lucide-react)

Always mock icons to avoid rendering issues and simplify assertions:

```typescript
vi.mock("lucide-react", () => ({
  Phone: () => <div data-testid="phone-icon" />,
  PhoneOff: () => <div data-testid="phone-off-icon" />,
  X: () => <div data-testid="x-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  Video: () => <div data-testid="video-icon" />,
  VideoOff: () => <div data-testid="video-off-icon" />,
  Mic: () => <div data-testid="mic-icon" />,
  MicOff: () => <div data-testid="mic-off-icon" />,
  Monitor: () => <div data-testid="monitor-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  // Add other icons as needed
}));
```

### UI Component Test Structure

```typescript
/**
 * @vitest-environment jsdom
 * 
 * [ComponentName] Tests
 * 
 * Behaviors Tested:
 * 1. [Display behavior 1]
 * 2. [Display behavior 2]
 * 3. [Action behavior 1]
 * ...
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Mock icons BEFORE importing component
vi.mock("lucide-react", () => ({ /* ... */ }));

// Mock any other dependencies
vi.mock("@/utils/someUtil", () => ({ /* ... */ }));

import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  // Default props that satisfy TypeScript and provide sensible defaults
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    // ... other required props
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DISPLAY BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Display", () => {
    it("returns null when isOpen is false", () => {
      const { container } = render(<MyComponent {...defaultProps} isOpen={false} />);
      expect(container.firstChild).toBeNull();
    });

    it("shows modal content when isOpen is true", () => {
      render(<MyComponent {...defaultProps} />);
      expect(screen.getByText("Expected Title")).toBeInTheDocument();
    });

    it("displays truncated text with ellipsis for long values", () => {
      render(<MyComponent {...defaultProps} title="Very long title that should be truncated" />);
      const element = screen.getByText(/Very long title/);
      expect(element).toHaveClass("truncate");
    });

    it("shows loading spinner when isLoading is true", () => {
      render(<MyComponent {...defaultProps} isLoading={true} />);
      expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // ACTION BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Actions", () => {
    it("calls onClose when X button clicked", () => {
      const onClose = vi.fn();
      render(<MyComponent {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByRole("button", { name: /close/i }));
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onSubmit with form data when submitted", () => {
      const onSubmit = vi.fn();
      render(<MyComponent {...defaultProps} onSubmit={onSubmit} />);
      
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "test input" } });
      fireEvent.click(screen.getByRole("button", { name: /submit/i }));
      
      expect(onSubmit).toHaveBeenCalledWith({ value: "test input" });
    });

    it("disables submit button until form is valid", () => {
      render(<MyComponent {...defaultProps} />);
      
      const submitButton = screen.getByRole("button", { name: /submit/i });
      expect(submitButton).toBeDisabled();
      
      fireEvent.change(screen.getByRole("textbox"), { target: { value: "valid" } });
      expect(submitButton).not.toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // TIMER/COUNTDOWN BEHAVIORS
  // ---------------------------------------------------------------------------
  describe("Timer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("decrements countdown every second", async () => {
      render(<MyComponent {...defaultProps} initialSeconds={30} />);
      
      expect(screen.getByText("30")).toBeInTheDocument();
      
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      
      expect(screen.getByText("29")).toBeInTheDocument();
    });

    it("calls onTimeout when countdown reaches zero", async () => {
      const onTimeout = vi.fn();
      render(<MyComponent {...defaultProps} initialSeconds={2} onTimeout={onTimeout} />);
      
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("clears timer on unmount", () => {
      const { unmount } = render(<MyComponent {...defaultProps} />);
      
      unmount();
      
      // Advancing time should not cause errors
      vi.advanceTimersByTime(5000);
    });
  });

  // ---------------------------------------------------------------------------
  // EDGE CASES
  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles undefined optional props gracefully", () => {
      render(<MyComponent {...defaultProps} optionalProp={undefined} />);
      expect(screen.getByText("Default Value")).toBeInTheDocument();
    });

    it("handles empty array props", () => {
      render(<MyComponent {...defaultProps} items={[]} />);
      expect(screen.getByText("No items")).toBeInTheDocument();
    });
  });
});
```

### Common UI Assertions

```typescript
// Presence
expect(screen.getByText("Label")).toBeInTheDocument();
expect(screen.queryByText("Hidden")).not.toBeInTheDocument();

// Button states
expect(button).toBeDisabled();
expect(button).not.toBeDisabled();

// CSS classes (for conditional styling)
expect(element).toHaveClass("bg-green-500");
expect(element).toHaveClass("opacity-50");

// Styles (when needed)
expect(element).toHaveStyle({ width: "100%" });

// Focus
expect(input).toHaveFocus();

// Form values
expect(input).toHaveValue("expected value");

// Callbacks with arguments
expect(mockFn).toHaveBeenCalledWith("arg1", { key: "value" });
expect(mockFn).toHaveBeenCalledTimes(1);

// Icons (when mocked with data-testid)
expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
expect(screen.queryByTestId("phone-off-icon")).not.toBeInTheDocument();
```

### MediaStream Mocking (for video components)

```typescript
function createMockMediaStream(hasVideo = true, hasAudio = true): MediaStream {
  const tracks: MediaStreamTrack[] = [];
  
  if (hasVideo) {
    tracks.push({
      kind: "video",
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack);
  }
  
  if (hasAudio) {
    tracks.push({
      kind: "audio",
      enabled: true,
      stop: vi.fn(),
    } as unknown as MediaStreamTrack);
  }
  
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter(t => t.kind === "video"),
    getAudioTracks: () => tracks.filter(t => t.kind === "audio"),
  } as unknown as MediaStream;
}
```

### Testing Conditional Rendering

```typescript
// Test that component renders nothing under certain conditions
it("returns null when visitor is not connected", () => {
  const { container } = render(<CallControls connected={false} />);
  expect(container.firstChild).toBeNull();
});

// Test conditional elements
it("shows 'Recording' badge only when isRecording is true", () => {
  const { rerender } = render(<CallStage isRecording={false} />);
  expect(screen.queryByText("Recording")).not.toBeInTheDocument();
  
  rerender(<CallStage isRecording={true} />);
  expect(screen.getByText("Recording")).toBeInTheDocument();
});
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

**Q: UI component test says "document is not defined" or similar DOM errors**
A: Add `/** @vitest-environment jsdom */` at the very top of the test file (before imports).

**Q: Icons from lucide-react cause rendering issues**
A: Mock lucide-react icons at the top of your test file. See the "UI Component Testing Patterns" section.

**Q: Timer-based tests are flaky or slow**
A: Use `vi.useFakeTimers()` in `beforeEach` and `vi.useRealTimers()` in `afterEach`. Use `act()` when advancing timers.

**Q: How do I test a component that uses MediaStream?**
A: Create a mock MediaStream object. See the "MediaStream Mocking" section for the pattern.

---

## Reference: Existing Tests

### Server-Side / API Tests

| Test File | Good Example Of |
|-----------|-----------------|
| `apps/server/src/features/routing/pool-manager.test.ts` | Complex state machine, multiple scenarios |
| `apps/dashboard/src/app/api/billing/create-subscription/route.test.ts` | API route testing, Stripe mocking |
| `apps/server/src/features/signaling/socket-handlers.test.ts` | Event-based testing |

### UI Component Tests

| Test File | Good Example Of |
|-----------|-----------------|
| `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx` | Modal visibility, form validation, confirmation input, loading states |
| `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx` | Timer/countdown testing, conditional badges, progress bar, icon switching |
| `apps/dashboard/src/features/webrtc/active-call-stage.test.tsx` | MediaStream mocking, video controls, mute/unmute toggling, complex UI state |
| `apps/dashboard/src/features/workbench/hooks/useIdleTimer.test.ts` | Custom hook testing, fake timers, Web Worker mocking, event listeners |

