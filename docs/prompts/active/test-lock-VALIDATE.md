# TEST LOCK Agent: VALIDATE

> **Feature:** DeletePoolModal (Validation Run)
> **Priority:** Critical
> **Purpose:** Validate test-lock workflow produces quality tests

---

## Your Task

**Delete the existing test file and rewrite it from scratch** to validate our test-lock workflow.

This is a validation run to ensure the test-lock agent + SOP produces high-quality tests that:
- Don't have flaky selectors
- Use proper Testing Library queries
- Follow all patterns in the SOP

---

## Step 1: Delete Existing Test

First, delete the existing test file:
```
apps/dashboard/src/features/pools/DeletePoolModal.test.tsx
```

---

## Step 2: Read References

1. Read the SOP: `docs/workflow/TEST_LOCK_AGENT_SOP.md`
   - Pay special attention to **UI Component Testing Patterns** section
2. Read the component: `apps/dashboard/src/features/pools/DeletePoolModal.tsx`
3. Read a reference test: `apps/dashboard/src/features/workbench/incoming-call-modal.test.tsx`

---

## Step 3: Write Fresh Tests

Create a new test file following these **critical rules**:

### Query Best Practices

```typescript
// ❌ BAD - Text appears in multiple places
expect(screen.getByText("Delete Pool")).toBeInTheDocument();

// ✅ GOOD - Use role-based queries
expect(screen.getByRole("heading", { name: /delete pool/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /delete pool/i })).toBeInTheDocument();

// ❌ BAD - Pool name appears in warning AND confirmation label
expect(screen.getByText(/Enterprise/)).toBeInTheDocument();

// ✅ GOOD - Use within() to scope queries
const warningSection = screen.getByTestId("warning-section");
expect(within(warningSection).getByText(/Enterprise/)).toBeInTheDocument();

// ✅ ALSO GOOD - Check for specific element type
const confirmLabel = screen.getByLabelText(/type .* to confirm/i);
expect(confirmLabel).toBeInTheDocument();
```

### Structure Requirements

```typescript
/**
 * @vitest-environment jsdom
 * 
 * DeletePoolModal Tests
 * 
 * Behaviors Tested:
 * 1. Modal visibility (returns null when closed)
 * 2. Display elements (title, subtitle, warnings)
 * 3. Pool name display (in warning and confirmation)
 * 4. Agent count display (singular/plural)
 * 5. Routing rules count display (singular/plural)
 * 6. Confirmation input behavior
 * 7. Delete button enable/disable based on input
 * 8. Action callbacks (onConfirm, onClose)
 * 9. Loading state during deletion
 * 10. Edge cases (empty values, case sensitivity)
 */
```

---

## Behaviors to Capture

| Area | Behaviors to Test |
|------|-------------------|
| **Visibility** | 1. Returns null when isOpen=false, 2. Renders when isOpen=true |
| **Header** | 3. Shows title (use getByRole heading), 4. Shows subtitle |
| **Warnings** | 5. Shows agent count warning, 6. Singular/plural for agents, 7. Shows routing rules warning, 8. Singular/plural for rules |
| **Pool Name** | 9. Shows pool name in warnings, 10. Shows pool name in confirmation label |
| **Confirmation** | 11. Input starts empty, 12. Input has autofocus, 13. Delete button disabled initially, 14. Delete button enabled when input matches pool name, 15. Case-sensitive matching |
| **Actions** | 16. Cancel calls onClose, 17. Delete calls onConfirm, 18. Delete button shows loading state |
| **Edge Cases** | 19. Handles zero agents, 20. Handles zero routing rules, 21. Clears input on success |

---

## Output

- `apps/dashboard/src/features/pools/DeletePoolModal.test.tsx` (fresh rewrite)
- Completion report: `docs/agent-output/test-lock/VALIDATE-[TIMESTAMP].md`

---

## Quality Checklist

- [ ] `/** @vitest-environment jsdom */` at top
- [ ] Mock `lucide-react` icons with data-testid
- [ ] **NO flaky selectors** - use getByRole, within(), or specific queries
- [ ] One behavior per `it()` block
- [ ] All tests PASS on first run
- [ ] Test names describe specific behaviors

---

## Success Criteria

**The test file must pass `pnpm test` on first try without any manual fixes.**

If tests fail due to selector issues, the SOP needs updating before running more batches.




