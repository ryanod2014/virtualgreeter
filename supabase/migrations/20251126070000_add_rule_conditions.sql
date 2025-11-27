-- ============================================================================
-- ADD FLEXIBLE RULE CONDITIONS
-- ============================================================================
-- Adds conditions and condition_groups JSONB columns to pool_routing_rules
-- 
-- conditions format (legacy, AND logic only):
-- [
--   { "type": "domain" | "path" | "query_param", "matchType": "is_exactly" | "contains" | "does_not_contain" | "starts_with" | "ends_with", "value": "...", "paramName": "..." }
-- ]
--
-- condition_groups format (OR logic between groups, AND within each group):
-- [
--   { "conditions": [...] },  // Group 1
--   { "conditions": [...] }   // Group 2 (ORed with Group 1)
-- ]
-- ============================================================================

-- Add conditions column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pool_routing_rules' AND column_name = 'conditions') THEN
        ALTER TABLE public.pool_routing_rules 
        ADD COLUMN conditions JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add condition_groups column for OR logic support
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pool_routing_rules' AND column_name = 'condition_groups') THEN
        ALTER TABLE public.pool_routing_rules 
        ADD COLUMN condition_groups JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Add a name column for easier identification
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pool_routing_rules' AND column_name = 'name') THEN
        ALTER TABLE public.pool_routing_rules 
        ADD COLUMN name TEXT;
    END IF;
END $$;

-- Create index for faster JSON queries
CREATE INDEX IF NOT EXISTS idx_pool_routing_rules_conditions 
ON public.pool_routing_rules USING GIN (conditions);

CREATE INDEX IF NOT EXISTS idx_pool_routing_rules_condition_groups 
ON public.pool_routing_rules USING GIN (condition_groups);

-- Migrate existing rules to new conditions format
UPDATE public.pool_routing_rules
SET conditions = (
    CASE 
        WHEN domain_pattern != '*' AND path_pattern != '*' THEN
            jsonb_build_array(
                jsonb_build_object('type', 'domain', 'matchType', 'contains', 'value', domain_pattern),
                jsonb_build_object('type', 'path', 'matchType', 'contains', 'value', path_pattern)
            )
        WHEN domain_pattern != '*' THEN
            jsonb_build_array(
                jsonb_build_object('type', 'domain', 'matchType', 'contains', 'value', domain_pattern)
            )
        WHEN path_pattern != '*' THEN
            jsonb_build_array(
                jsonb_build_object('type', 'path', 'matchType', 'contains', 'value', path_pattern)
            )
        ELSE '[]'::jsonb
    END
)
WHERE conditions IS NULL OR conditions = '[]'::jsonb;

