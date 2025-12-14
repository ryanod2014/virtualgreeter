# Dev Agent Prompt: TKT-009

## Ticket: Org-Level Co-Browse Disable Setting

**Priority:** high  
**Difficulty:** medium  
**Iteration:** 1

## Issue
Visitors have no control over screen sharing during calls. Co-browse is automatic with no opt-out. May violate privacy expectations or GDPR.

## Fix Required
1. Add 'Enable Co-Browse' toggle to org settings page
2. Store setting in organization settings
3. Widget checks setting before initializing cobrowse sender

## Files to Modify
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx`
- `apps/dashboard/src/app/(dashboard)/settings/actions.ts`
- `apps/widget/src/features/cobrowse/cobrowseSender.ts`

## Files to Read First
- `apps/server/src/lib/organization.ts`

## Similar Code Reference
- `apps/dashboard/src/app/(dashboard)/settings/page.tsx` - see existing toggle patterns

## Out of Scope (DO NOT TOUCH)
- Do NOT add per-visitor opt-out (different feature)
- Do NOT modify sensitive data masking (TKT-001)
- Do NOT create database migration - use existing org settings structure

## Acceptance Criteria
- [ ] Org settings shows 'Enable Co-Browse' toggle
- [ ] When disabled, co-browse does not initialize for visitors
- [ ] Existing orgs default to enabled (no breaking change)
- [ ] Setting change takes effect on next call (not mid-call)

## Risks
- Default must be enabled to maintain current behavior
- Handle mid-call disable gracefully (complete current session)

## Dev Checks Before Submitting
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Manual: Toggle setting, verify widget behavior changes

## Instructions
1. Read the files listed above to understand the current structure
2. Implement the changes following existing patterns
3. Run typecheck and build to verify
4. Create a commit with your changes

When done, the orchestration system will automatically move this to QA.

