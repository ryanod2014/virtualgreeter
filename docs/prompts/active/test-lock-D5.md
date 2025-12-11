# TEST LOCK Agent: D5

> **Feature:** Widget Settings
> **Priority:** High
> **Doc:** `docs/features/admin/widget-settings.md`

---

## Your Task

Lock in current behavior for all code in the Widget Settings feature by writing behavior-level tests.

---

## Feature Overview

Widget Settings allows admins to configure the appearance and behavior of the visitor-facing widget: position, size, trigger delay, theme, device targeting, and auto-hide settings.

---

## Source Files to Test

| File | Key Exports | Priority |
|------|-------------|----------|
| `apps/dashboard/src/app/(dashboard)/widget/page.tsx` | Widget settings page | High |
| `apps/dashboard/src/app/(dashboard)/widget/actions.ts` | `updateWidgetSettings` | High |
| `apps/server/src/lib/widget-settings.ts` | `getWidgetSettings` | High |

---

## Behaviors to Capture

### actions.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `updateWidgetSettings` | 1. Updates position setting, 2. Updates size setting, 3. Updates trigger_delay, 4. Updates theme, 5. Updates devices filter, 6. Updates auto_hide_delay, 7. Updates show_minimize_button |

### widget-settings.ts

| Function | Behaviors to Test |
|----------|-------------------|
| `getWidgetSettings` | 1. Returns org's widget settings, 2. Returns defaults for missing fields |

---

## Output

- `apps/dashboard/src/app/(dashboard)/widget/actions.test.ts`
- `apps/server/src/lib/widget-settings.test.ts`
- Completion report: `docs/agent-output/test-lock/D5-[TIMESTAMP].md`




