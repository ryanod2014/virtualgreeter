-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
-- These indexes optimize the most common query patterns in the dashboard:
-- 1. Call analytics dashboard (date ranges + filters)
-- 2. Agent activity reports
-- 3. Widget pageview analytics
-- 4. Platform admin overview
--
-- NOTE: CONCURRENTLY cannot be used within migrations (requires running outside
-- a transaction). For very large production tables, consider running these
-- indexes directly via the Supabase SQL Editor with CONCURRENTLY added.
-- Partial indexes used where appropriate to reduce storage and improve performance.
-- ============================================================================


-- ============================================================================
-- CALL_LOGS INDEXES (Highest Priority)
-- ============================================================================
-- Primary table for call analytics - these indexes support:
-- - Admin calls page (org + date range queries)
-- - Status filtering within organizations
-- - Pool-based analytics
-- - Orphaned call recovery

-- Primary analytics index: org + date range queries
-- Supports: SELECT * FROM call_logs WHERE organization_id = $1 AND created_at >= $2 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_call_logs_org_created 
ON call_logs(organization_id, created_at DESC);

-- Status filtering within org
-- Supports: SELECT * FROM call_logs WHERE organization_id = $1 AND status IN (...) AND created_at >= $2
CREATE INDEX IF NOT EXISTS idx_call_logs_org_status_created 
ON call_logs(organization_id, status, created_at DESC);

-- Pool-based analytics (partial index for non-null pool_id)
-- Supports: SELECT * FROM call_logs WHERE pool_id = $1 AND created_at >= $2
CREATE INDEX IF NOT EXISTS idx_call_logs_pool_created 
ON call_logs(pool_id, created_at DESC) 
WHERE pool_id IS NOT NULL;

-- Orphaned call recovery (partial index for efficiency)
-- Supports: SELECT * FROM call_logs WHERE status = 'accepted' AND reconnect_eligible = true 
--           AND ended_at IS NULL AND last_heartbeat_at >= $1
CREATE INDEX IF NOT EXISTS idx_call_logs_orphaned 
ON call_logs(last_heartbeat_at DESC) 
WHERE status = 'accepted' 
  AND reconnect_eligible = true 
  AND ended_at IS NULL;

-- Country-based analytics (partial index for non-null country codes)
-- Supports: Filtering calls by visitor country within an organization
CREATE INDEX IF NOT EXISTS idx_call_logs_org_country 
ON call_logs(organization_id, visitor_country_code, created_at DESC)
WHERE visitor_country_code IS NOT NULL;


-- ============================================================================
-- WIDGET_PAGEVIEWS INDEXES (High Priority)
-- ============================================================================
-- Supports pageview analytics for coverage calculation and pool metrics

-- Pool + date for pool analytics (partial index for non-null pool_id)
-- Supports: SELECT COUNT(*) FROM widget_pageviews WHERE pool_id = $1 AND created_at >= $2
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_pool_date 
ON widget_pageviews(pool_id, created_at DESC) 
WHERE pool_id IS NOT NULL;

-- Country filtering (partial index for non-null country codes)
-- Supports: Filtering pageviews by visitor country within an organization
CREATE INDEX IF NOT EXISTS idx_widget_pageviews_org_country 
ON widget_pageviews(organization_id, visitor_country_code, created_at DESC)
WHERE visitor_country_code IS NOT NULL;


-- ============================================================================
-- AGENT_STATUS_CHANGES INDEXES (Medium Priority)
-- ============================================================================
-- Supports filtering agent status changes by status type

-- Filter by status type
-- Supports: SELECT * FROM agent_status_changes WHERE agent_id = $1 AND to_status = $2
CREATE INDEX IF NOT EXISTS idx_status_changes_agent_status 
ON agent_status_changes(agent_id, to_status, changed_at DESC);


-- ============================================================================
-- POOL_ROUTING_RULES INDEXES (Low Priority)
-- ============================================================================
-- Supports JOIN performance when fetching pools with routing rules

-- Routing rules by pool (for JOIN performance, partial index for active rules only)
-- Supports: SELECT pools.*, rules.* FROM agent_pools pools 
--           LEFT JOIN pool_routing_rules rules ON rules.pool_id = pools.id WHERE pools.organization_id = $1
CREATE INDEX IF NOT EXISTS idx_pool_routing_rules_pool_active 
ON pool_routing_rules(pool_id) 
WHERE is_active = true;


-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON INDEX idx_call_logs_org_created IS 'Optimizes org + date range queries on call_logs (admin calls page)';
COMMENT ON INDEX idx_call_logs_org_status_created IS 'Optimizes status filtering within org on call_logs';
COMMENT ON INDEX idx_call_logs_pool_created IS 'Optimizes pool-based analytics on call_logs';
COMMENT ON INDEX idx_call_logs_orphaned IS 'Optimizes orphaned call recovery queries';
COMMENT ON INDEX idx_call_logs_org_country IS 'Optimizes country-based analytics on call_logs';
COMMENT ON INDEX idx_widget_pageviews_pool_date IS 'Optimizes pool analytics on widget_pageviews';
COMMENT ON INDEX idx_widget_pageviews_org_country IS 'Optimizes country filtering on widget_pageviews';
COMMENT ON INDEX idx_status_changes_agent_status IS 'Optimizes status type filtering on agent_status_changes';
COMMENT ON INDEX idx_pool_routing_rules_pool_active IS 'Optimizes JOIN performance for active routing rules';

