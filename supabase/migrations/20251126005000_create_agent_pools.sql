-- ============================================================================
-- AGENT POOLS & POOL MEMBERS
-- ============================================================================
-- Creates the core pool tables that enable agent grouping and routing.
-- This migration must run BEFORE pool_centric_schema.sql
-- ============================================================================

-- Agent Pools - groups of agents that can be assigned to different domains/paths
CREATE TABLE IF NOT EXISTS public.agent_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_agent_pools_organization_id ON public.agent_pools(organization_id);

-- Agent Pool Members - which agents belong to which pools
CREATE TABLE IF NOT EXISTS public.agent_pool_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES public.agent_pools(id) ON DELETE CASCADE,
    agent_profile_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pool_id, agent_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_pool_members_pool_id ON public.agent_pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_agent_pool_members_agent_profile_id ON public.agent_pool_members(agent_profile_id);

-- Enable RLS
ALTER TABLE public.agent_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_pool_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR AGENT_POOLS
-- ============================================================================

-- Helper function to get user's organization ID (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users can view pools in their organization
CREATE POLICY "Users can view pools in their organization"
    ON public.agent_pools FOR SELECT
    USING (organization_id = public.get_user_organization_id());

-- Admins can insert pools in their organization
CREATE POLICY "Admins can insert pools"
    ON public.agent_pools FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id() 
        AND public.is_user_admin()
    );

-- Admins can update pools in their organization
CREATE POLICY "Admins can update pools"
    ON public.agent_pools FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id() 
        AND public.is_user_admin()
    );

-- Admins can delete pools in their organization
CREATE POLICY "Admins can delete pools"
    ON public.agent_pools FOR DELETE
    USING (
        organization_id = public.get_user_organization_id() 
        AND public.is_user_admin()
    );

-- ============================================================================
-- RLS POLICIES FOR AGENT_POOL_MEMBERS
-- ============================================================================

-- Users can view pool members in their organization
CREATE POLICY "Users can view pool members in their organization"
    ON public.agent_pool_members FOR SELECT
    USING (
        pool_id IN (
            SELECT id FROM public.agent_pools 
            WHERE organization_id = public.get_user_organization_id()
        )
    );

-- Admins can insert pool members
CREATE POLICY "Admins can insert pool members"
    ON public.agent_pool_members FOR INSERT
    WITH CHECK (
        pool_id IN (
            SELECT id FROM public.agent_pools 
            WHERE organization_id = public.get_user_organization_id()
        ) AND public.is_user_admin()
    );

-- Admins can update pool members
CREATE POLICY "Admins can update pool members"
    ON public.agent_pool_members FOR UPDATE
    USING (
        pool_id IN (
            SELECT id FROM public.agent_pools 
            WHERE organization_id = public.get_user_organization_id()
        ) AND public.is_user_admin()
    );

-- Admins can delete pool members
CREATE POLICY "Admins can delete pool members"
    ON public.agent_pool_members FOR DELETE
    USING (
        pool_id IN (
            SELECT id FROM public.agent_pools 
            WHERE organization_id = public.get_user_organization_id()
        ) AND public.is_user_admin()
    );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp for agent_pools
CREATE TRIGGER update_agent_pools_updated_at
    BEFORE UPDATE ON public.agent_pools
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


