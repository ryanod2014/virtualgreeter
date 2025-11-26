-- ============================================================================
-- POOL-CENTRIC SCHEMA UPDATE
-- ============================================================================
-- Pools are now the primary entity containing:
-- - Routing rules (domains + paths)
-- - Assigned agents
-- - Default "All" pool catches unmatched traffic
-- ============================================================================

-- Pool routing rules (domains + paths that route to this pool)
CREATE TABLE IF NOT EXISTS public.pool_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.agent_pools(id) ON DELETE CASCADE,
    domain_pattern TEXT NOT NULL DEFAULT '*',  -- e.g., "example.com", "*.example.com", "*"
    path_pattern TEXT NOT NULL DEFAULT '*',    -- e.g., "/pricing*", "/support/*", "*"
    priority INTEGER NOT NULL DEFAULT 0,       -- Higher = checked first
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_routing_rules_pool_id ON public.pool_routing_rules(pool_id);

-- Add is_default column to agent_pools if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'agent_pools' AND column_name = 'is_catch_all') THEN
        ALTER TABLE public.agent_pools ADD COLUMN is_catch_all BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- RLS for pool_routing_rules
ALTER TABLE public.pool_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routing rules in their organization"
    ON public.pool_routing_rules FOR SELECT
    USING (
        pool_id IN (
            SELECT id FROM public.agent_pools 
            WHERE organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "Admins can manage routing rules"
    ON public.pool_routing_rules FOR ALL
    USING (
        pool_id IN (
            SELECT id FROM public.agent_pools 
            WHERE organization_id = public.get_user_organization_id()
        ) AND public.is_user_admin()
    );

-- Trigger for updated_at
CREATE TRIGGER update_pool_routing_rules_updated_at
    BEFORE UPDATE ON public.pool_routing_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- CREATE DEFAULT "ALL" POOL FOR EXISTING ORGANIZATIONS
-- ============================================================================

-- Create "All" pool for organizations that don't have one
INSERT INTO public.agent_pools (organization_id, name, description, is_default, is_catch_all)
SELECT 
    id as organization_id,
    'All' as name,
    'Default pool that catches all unmatched traffic' as description,
    true as is_default,
    true as is_catch_all
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.agent_pools ap 
    WHERE ap.organization_id = o.id AND ap.is_catch_all = true
)
ON CONFLICT DO NOTHING;

-- Add all existing agents to the "All" pool
INSERT INTO public.agent_pool_members (pool_id, agent_profile_id)
SELECT ap.id, agent.id
FROM public.agent_pools ap
CROSS JOIN public.agent_profiles agent
WHERE ap.is_catch_all = true 
  AND ap.organization_id = agent.organization_id
  AND NOT EXISTS (
      SELECT 1 FROM public.agent_pool_members apm 
      WHERE apm.pool_id = ap.id AND apm.agent_profile_id = agent.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- UPDATE TRIGGER: Auto-create "All" pool for new organizations
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_pool()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.agent_pools (organization_id, name, description, is_default, is_catch_all)
    VALUES (NEW.id, 'All', 'Default pool that catches all unmatched traffic', true, true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to use updated function
DROP TRIGGER IF EXISTS on_organization_created_create_pool ON public.organizations;
CREATE TRIGGER on_organization_created_create_pool
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.create_default_pool();

-- ============================================================================
-- UPDATE TRIGGER: Auto-add new agents to "All" pool
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_add_agent_to_all_pool()
RETURNS TRIGGER AS $$
BEGIN
    -- Add new agent to the "All" pool for their organization
    INSERT INTO public.agent_pool_members (pool_id, agent_profile_id)
    SELECT ap.id, NEW.id
    FROM public.agent_pools ap
    WHERE ap.organization_id = NEW.organization_id 
      AND ap.is_catch_all = true
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_agent_created_add_to_all_pool ON public.agent_profiles;
CREATE TRIGGER on_agent_created_add_to_all_pool
    AFTER INSERT ON public.agent_profiles
    FOR EACH ROW EXECUTE FUNCTION public.auto_add_agent_to_all_pool();

