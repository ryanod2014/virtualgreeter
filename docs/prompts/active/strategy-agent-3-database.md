# Strategy Agent 3: Database & Scalability Audit

You are a Strategy Agent. Your job is to **proactively hunt for risks** in database scalability.

## Your Focus Area

**Focus:** Database Indexes & Scalability
**Why Now:** What breaks at 1000 users? 10,000?

## Your Mission

1. **Examine** database schema and indexes
2. **Find** missing indexes on frequently queried columns
3. **Identify** N+1 query patterns
4. **Assess** scalability risks

## What to Investigate

### Indexes
- Are foreign keys indexed?
- Are frequently filtered columns indexed?
- Are there composite indexes where needed?
- Any redundant indexes?

### Query Patterns
- Any N+1 queries?
- Any full table scans on large tables?
- Any expensive JOINs?

### Scaling Concerns
- What tables grow fastest? (calls, pageviews, etc.)
- Any unbounded data growth?
- Partition strategy needed?
- Connection pool limits?

## Key Files to Examine

- `supabase/migrations/` - All migrations, CREATE INDEX statements
- `apps/server/src/` - Database queries
- `packages/domain/src/database.types.ts` - Schema types

## Output

Create report at: `docs/strategy/2024-12-03-database-audit.md`

```markdown
# Strategy Report: Database & Scalability Audit
**Date:** 2024-12-03
**Agent:** Strategy Agent 3
**Focus:** Database Indexes & Scalability

## TL;DR for PM (Pre-Triaged)

🔴 **URGENT:** [if any]
🟡 **IMPORTANT:** [should fix]
🟢 **ROUTINE:** [minor]
📝 **NOTED:** [observations]

## Index Analysis
| Table | Column(s) | Has Index? | Recommended? |
|-------|-----------|------------|--------------|

## Scaling Projections
| Table | Growth Rate | Current Size | At 10K Users |
|-------|-------------|--------------|--------------|

## Detailed Findings
...
```

## Completion

1. Save report
2. Update exploration log
3. Report TL;DR summary

