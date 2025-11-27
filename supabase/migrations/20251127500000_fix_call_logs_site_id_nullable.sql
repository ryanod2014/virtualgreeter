-- ============================================================================
-- FIX CALL_LOGS SITE_ID - MAKE NULLABLE
-- ============================================================================
-- The site_id column was originally NOT NULL but we no longer route by site,
-- we route by orgId. This migration makes site_id nullable to fix insert errors.
-- ============================================================================

-- Make site_id nullable
ALTER TABLE public.call_logs ALTER COLUMN site_id DROP NOT NULL;

-- Add a comment explaining why it's nullable
COMMENT ON COLUMN public.call_logs.site_id IS 'Legacy field - routing is now done by organization_id and pool_id. Can be null for new calls.';

