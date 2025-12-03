# Strategy Report: Database & Scalability Audit
**Date:** 2024-12-03
**Agent:** Strategy Agent 3
**Focus:** Database Indexes & Scalability

## TL;DR for PM (Pre-Triaged)

🟡 **IMPORTANT:**
- `reconnect_token` column in `call_logs` lacks an index (used for call recovery lookups)
- `invites.expires_at` lacks index for cleanup job efficiency
- Coverage calculation algorithm is O(sessions × days) - may slow down at scale

🟢 **ROUTINE:**
- Consider time-based partitioning for `widget_pageviews` at 10M+ rows
- `users.email` could benefit from index for login performance

📝 **NOTED:**
- Overall index coverage is **excellent** - recent `20251204100000_add_performance_indexes.sql` migration added comprehensive analytics indexes
- No N+1 query patterns detected - Supabase JOINs used correctly
- Connection pooling handled by Supabase (not application concern)

---

## Index Analysis

### High-Volume Tables (Audit Results)

| Table | Column(s) | Has Index? | Status |
|-------|-----------|------------|--------|
| call_logs | organization_id, created_at | ✅ idx_call_logs_org_created | Good - covers primary analytics |
| call_logs | organization_id, status, created_at | ✅ idx_call_logs_org_status_created | Good - status filtering |
| call_logs | pool_id, created_at | ✅ idx_call_logs_pool_created (partial) | Good - pool analytics |
| call_logs | reconnect_token | ❌ **MISSING** | 🟡 IMPORTANT - Used by getCallByReconnectToken() |
| call_logs | visitor_country_code | ✅ idx_call_logs_org_country (partial) | Good |
| widget_pageviews | organization_id, created_at | ✅ idx_widget_pageviews_org_date | Good |
| widget_pageviews | pool_id, created_at | ✅ idx_widget_pageviews_pool_date (partial) | Good |
| widget_pageviews | visitor_country_code | ✅ idx_widget_pageviews_org_country (partial) | Good |
| agent_sessions | agent_id, started_at | ✅ idx_agent_sessions_agent_date | Good |
| agent_sessions | organization_id, started_at | ✅ idx_agent_sessions_org_date | Good |
| agent_sessions | agent_id WHERE ended_at IS NULL | ✅ idx_agent_sessions_active (partial) | Good |
| agent_status_changes | agent_id, to_status, changed_at | ✅ idx_status_changes_agent_status | Good |
| users | organization_id | ✅ idx_users_organization_id | Good |
| users | email | ❌ Missing | 🟢 ROUTINE - Login lookups |
| invites | token | ✅ idx_invites_token | Good |
| invites | expires_at | ❌ **MISSING** | 🟡 IMPORTANT - Cleanup jobs |

### Foreign Key Index Coverage

| Table | FK Column | Has Index? | Notes |
|-------|-----------|------------|-------|
| users | organization_id | ✅ | Via idx_users_organization_id |
| sites | organization_id | ✅ | Via idx_sites_organization_id |
| agent_profiles | organization_id | ✅ | Via idx_agent_profiles_organization_id |
| agent_profiles | user_id | ✅ | Via UNIQUE constraint |
| call_logs | organization_id | ✅ | Via idx_call_logs_organization_id |
| call_logs | agent_id | ✅ | Via idx_call_logs_agent_id |
| call_logs | site_id | ❌ | FK exists but no dedicated index (rarely queried) |
| call_logs | pool_id | ✅ | Via idx_call_logs_pool_id |
| call_logs | disposition_id | ✅ | Via idx_call_logs_disposition_id |
| agent_pool_members | pool_id | ✅ | Via idx_agent_pool_members_pool_id |
| agent_pool_members | agent_profile_id | ✅ | Via idx_agent_pool_members_agent_profile_id |
| pool_routing_rules | pool_id | ✅ | Via idx_pool_routing_rules_pool_id |

---

## Query Pattern Analysis

### N+1 Query Assessment: ✅ PASS

No N+1 patterns detected. The codebase correctly uses:

1. **Supabase JOINs** - Dashboard queries use embedded relations:
```typescript
// Example from calls/page.tsx - single query with JOINs
.select(`
  id, status, page_url, ...
  agent:agent_profiles(id, display_name),
  site:sites(id, name, domain),
  disposition:dispositions(id, name, color)
`)
```

2. **Event-driven server queries** - Server-side database operations are per-event (not batch), which is appropriate for real-time operations.

### Expensive Query Patterns Identified

| Location | Query Pattern | Risk Level | Notes |
|----------|---------------|------------|-------|
| admin/calls/page.tsx | 500-row limit with JOINs | 🟢 Low | Limit prevents runaway |
| admin/calls/page.tsx | Full pageview scan for coverage | 🟡 Medium | O(n) scan for date range |
| coverage-stats.ts | O(sessions × days × 24) iteration | 🟡 Medium | Scales poorly for large date ranges |

---

## Scaling Projections

### Table Growth Estimates

| Table | Growth Driver | Current Size (est.) | At 1K Users | At 10K Users |
|-------|---------------|---------------------|-------------|--------------|
| widget_pageviews | Widget popups shown | 10K rows | 1M rows | 100M+ rows |
| call_logs | Call attempts | 1K rows | 100K rows | 10M+ rows |
| agent_status_changes | Status transitions | 5K rows | 500K rows | 50M+ rows |
| agent_sessions | Agent logins | 500 rows | 50K rows | 5M+ rows |
| feedback_items | User submissions | 100 rows | 10K rows | 100K rows |
| mrr_snapshots | Daily snapshots | 30/org | 30K rows | 300K rows |

### Critical Thresholds

| Threshold | Table | Impact | Mitigation |
|-----------|-------|--------|------------|
| 10M rows | widget_pageviews | Query slowdown | Time-based partitioning |
| 10M rows | call_logs | Analytics slowdown | Time-based partitioning |
| 50M rows | agent_status_changes | Storage costs | Archive old data |

---

## Detailed Findings

### 1. Missing Index: call_logs.reconnect_token

**Severity:** 🟡 IMPORTANT

**Location:** `apps/server/src/lib/call-logger.ts`

```typescript
// Line 413-420 - getCallByReconnectToken()
const { data, error } = await supabase
  .from("call_logs")
  .select("...")
  .eq("reconnect_token", token)  // <-- No index on this column
  .eq("status", "accepted")
  .eq("reconnect_eligible", true)
  .is("ended_at", null)
  .single();
```

**Impact:** Full table scan for call recovery lookups. Currently low-impact due to small data size, but will degrade as call_logs grows.

**Recommended Fix:**
```sql
CREATE INDEX IF NOT EXISTS idx_call_logs_reconnect_token 
ON call_logs(reconnect_token) 
WHERE reconnect_token IS NOT NULL 
  AND status = 'accepted' 
  AND reconnect_eligible = true;
```

### 2. Missing Index: invites.expires_at

**Severity:** 🟡 IMPORTANT

**Impact:** Invite cleanup jobs (if implemented) would require full table scan.

**Recommended Fix:**
```sql
CREATE INDEX IF NOT EXISTS idx_invites_expires_at 
ON invites(expires_at) 
WHERE accepted_at IS NULL;
```

### 3. Coverage Calculation Algorithm

**Severity:** 🟡 MEDIUM (at scale)

**Location:** `apps/dashboard/src/lib/stats/coverage-stats.ts`

The `calculateHourlyCoverage()` function iterates through all sessions for every day in the date range:

```typescript
// O(sessions × days × 24) complexity
while (currentDay <= endDay) {
  // For each hour 0-23
  // Check overlap with each session
}
```

For a 30-day range with 100 sessions, this is 72,000 iterations. At 10K sessions, it's 7.2M iterations.

**Recommended Fix:** Pre-aggregate session data by hour in the database, or limit date ranges for this calculation.

### 4. Positive Findings

The following areas have **excellent** index coverage:

1. **Call Analytics** - Comprehensive indexes via `20251204100000_add_performance_indexes.sql`:
   - org + date range queries optimized
   - Status filtering optimized
   - Pool-based queries optimized
   - Orphaned call recovery optimized (partial index)

2. **Agent Sessions** - Well-indexed for both individual and team analytics

3. **Feedback System** - Complete index coverage for filtering and sorting

4. **MRR Tracking** - Appropriate indexes for SaaS metrics queries

---

## Recommended Actions

### Immediate (Before 1K Users)

1. **Add reconnect_token index** - Low effort, prevents future degradation
2. **Add expires_at index on invites** - Good hygiene

### Medium-Term (Before 10K Users)

3. **Refactor coverage calculation** - Move to database-side aggregation
4. **Implement data archival strategy** - For agent_status_changes and widget_pageviews

### Long-Term (10K+ Users)

5. **Evaluate time-based partitioning** for:
   - widget_pageviews
   - call_logs
   - agent_status_changes

---

## Appendix: Existing Index Summary

Total indexes identified in migrations: **109**

**By Table (top 10):**
- call_logs: 15 indexes
- widget_pageviews: 7 indexes
- feedback_items: 8 indexes
- agent_sessions: 3 indexes
- agent_status_changes: 3 indexes
- mrr_snapshots: 3 indexes
- mrr_changes: 4 indexes
- funnel_events: 5 indexes
- pmf_surveys: 4 indexes
- organizations: 5 indexes

