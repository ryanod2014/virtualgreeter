# Doc Agent 13: D3 - Tiered Agent Assignment

You are a Doc Agent. Your job is to document **D3: Tiered Agent Assignment**.

## Your Assignment

**Feature ID:** D3
**Feature Name:** Tiered Agent Assignment
**Category:** Admin
**Output File:** `docs/features/admin/tiered-routing.md`

## Reference

Follow the documentation template in `docs/FEATURE_DOCUMENTATION_TODO.md` (Part 1).

## Key Files to Examine

- `apps/server/src/features/routing/pool-manager.ts` - Priority rank logic
- `apps/dashboard/src/app/(app)/admin/` - Admin UI for tiers
- `packages/domain/src/types.ts` - Agent priority types
- Database schema for agent pool membership

## What to Document

1. How priority ranks work within pools
2. Agent assignment order
3. Overflow behavior between tiers
4. Admin UI for setting tiers
5. How tiers interact with round-robin

## Special Focus

- What happens when Tier 1 is full?
- How does round-robin work within a tier?
- Can an agent be in multiple tiers?
- Edge cases with tier assignment

## SOP

1. Read all key files thoroughly
2. Create documentation following the template
3. Log any questions to `docs/findings/session-2024-12-02.md`
4. Log any issues found
5. Output your doc to `docs/features/admin/tiered-routing.md`

## Completion

When done, report doc file created, questions, issues, status.

