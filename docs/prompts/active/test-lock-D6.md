# TEST LOCK Agent: D6

> **Feature:** Embed Code
> **Priority:** Medium
> **Doc:** `docs/features/admin/embed-code.md`

---

## Your Task

Lock in current behavior for all code in the Embed Code feature by writing behavior-level tests.

---

## Feature Overview

Embed Code provides admins with the JavaScript snippet to install the widget on their website. Includes the organization ID and server URL.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/widget/embed/page.tsx` | Embed code page | High |
| `apps/dashboard/src/features/embed/EmbedCodeDisplay.tsx` | Code display component | Medium |

---

## Behaviors to Capture

### EmbedCodeDisplay.tsx

| Area | Behaviors to Test |
|------|-------------------|
| **Display** | 1. Shows script tag with correct orgId, 2. Shows correct serverUrl, 3. Copy button copies to clipboard |
| **Variants** | 4. Shows async/defer options if available |

---

## Output

- `apps/dashboard/src/features/embed/EmbedCodeDisplay.test.tsx`
- Completion report: `docs/agent-output/test-lock/D6-[TIMESTAMP].md`



