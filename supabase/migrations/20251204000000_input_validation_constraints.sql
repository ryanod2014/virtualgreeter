-- P2-005: Input Validation - Database Constraints
-- Add CHECK constraints to enforce valid ranges on numeric fields

-- ============================================================================
-- Widget Settings Validation (in agent_pools.widget_settings JSONB)
-- ============================================================================
-- Note: JSONB fields are validated at application level since PostgreSQL
-- doesn't support CHECK constraints on JSONB field values directly.
-- The application-level validation is implemented in:
-- - apps/dashboard/src/lib/utils/validation.ts
-- - apps/dashboard/src/app/(app)/admin/pools/pools-client.tsx

-- ============================================================================
-- Priority Rank Validation
-- ============================================================================
-- Add CHECK constraint to ensure priority_rank is within valid range (1-99)
ALTER TABLE agent_pool_members
  DROP CONSTRAINT IF EXISTS agent_pool_members_priority_rank_check;

ALTER TABLE agent_pool_members
  ADD CONSTRAINT agent_pool_members_priority_rank_check
  CHECK (priority_rank >= 1 AND priority_rank <= 99);

-- ============================================================================
-- Max Simultaneous Simulations Validation  
-- ============================================================================
-- Add CHECK constraint to ensure max_simultaneous_simulations is within valid range (1-100)
ALTER TABLE agent_profiles
  DROP CONSTRAINT IF EXISTS agent_profiles_max_simulations_check;

ALTER TABLE agent_profiles
  ADD CONSTRAINT agent_profiles_max_simulations_check
  CHECK (max_simultaneous_simulations >= 1 AND max_simultaneous_simulations <= 100);

-- ============================================================================
-- Organization-Level Widget Settings Validation
-- ============================================================================
-- For future: When widget_settings columns are added to organizations table,
-- add similar constraints. Currently these are pool-specific in JSONB format.

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON CONSTRAINT agent_pool_members_priority_rank_check ON agent_pool_members IS 
  'Ensures priority_rank is between 1 (highest priority) and 99 (lowest priority)';

COMMENT ON CONSTRAINT agent_profiles_max_simulations_check ON agent_profiles IS 
  'Ensures max_simultaneous_simulations is between 1 and 100 visitors';

