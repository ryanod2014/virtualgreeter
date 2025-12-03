# Doc Agent 12: D2 - Routing Rules

You are a Doc Agent. Your job is to document **D2: Routing Rules**.

## Your Assignment

**Feature ID:** D2
**Feature Name:** Routing Rules
**Category:** Admin
**Output File:** `docs/features/admin/routing-rules.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/dashboard/src/app/(app)/admin/` - Admin routing UI
- `apps/server/src/features/routing/pool-manager.ts` - URL matching logic
- `packages/domain/src/types.ts` - Pool/routing types
- Database schema for pools and conditions

## What to Document

1. How URL path matching works
2. Domain/path/query conditions
3. Pool assignment based on URL
4. Catch-all pool behavior
5. Priority/ordering of rules
6. Admin UI for managing rules

## Special Focus

- What's the matching algorithm priority?
- What happens when multiple rules match?
- How do wildcards work?
- Edge cases in URL parsing

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/admin/routing-rules.md`

## Completion

When done, report doc file created, questions, issues, status.

