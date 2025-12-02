-- ============================================================================
-- GHOST-GREETER DATABASE SCHEMA
-- ============================================================================
-- Run this migration in your Supabase SQL editor or via CLI
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================
-- B2B customers who use Ghost-Greeter

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
    max_agents INTEGER NOT NULL DEFAULT 1,
    max_sites INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Links auth.users to organizations with roles

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster org lookups
CREATE INDEX idx_users_organization_id ON public.users(organization_id);

-- ============================================================================
-- SITES TABLE
-- ============================================================================
-- Websites where the widget is embedded

CREATE TABLE public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    widget_config JSONB NOT NULL DEFAULT '{
        "position": "bottom-right",
        "trigger_delay": 500,
        "primary_color": "#6366f1",
        "accent_color": "#22c55e",
        "border_radius": 16,
        "show_agent_name": true
    }'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, domain)
);

-- Index for faster org lookups
CREATE INDEX idx_sites_organization_id ON public.sites(organization_id);

-- ============================================================================
-- AGENT PROFILES TABLE
-- ============================================================================
-- Agent-specific settings and video URLs

CREATE TABLE public.agent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    intro_video_url TEXT,
    loop_video_url TEXT,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('offline', 'idle', 'in_simulation', 'in_call')),
    max_simultaneous_simulations INTEGER NOT NULL DEFAULT 25,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_agent_profiles_organization_id ON public.agent_profiles(organization_id);
CREATE INDEX idx_agent_profiles_status ON public.agent_profiles(status);

-- ============================================================================
-- CALL LOGS TABLE
-- ============================================================================
-- Record of all calls for analytics

CREATE TABLE public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'missed')),
    page_url TEXT NOT NULL,
    duration_seconds INTEGER,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_call_logs_organization_id ON public.call_logs(organization_id);
CREATE INDEX idx_call_logs_agent_id ON public.call_logs(agent_id);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- ORGANIZATIONS POLICIES
-- ----------------------------------------------------------------------------

-- Users can only see their own organization
CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Only admins can update their organization
CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (
        id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- USERS POLICIES
-- ----------------------------------------------------------------------------

-- Users can see other users in their organization
CREATE POLICY "Users can view users in their organization"
    ON public.users FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid());

-- Admins can insert new users in their organization
CREATE POLICY "Admins can insert users in their organization"
    ON public.users FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete users in their organization (except themselves)
CREATE POLICY "Admins can delete users in their organization"
    ON public.users FOR DELETE
    USING (
        id != auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- SITES POLICIES
-- ----------------------------------------------------------------------------

-- Users can view sites in their organization
CREATE POLICY "Users can view sites in their organization"
    ON public.sites FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Only admins can manage sites
CREATE POLICY "Admins can insert sites"
    ON public.sites FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update sites"
    ON public.sites FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete sites"
    ON public.sites FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- AGENT PROFILES POLICIES
-- ----------------------------------------------------------------------------

-- Users can view agent profiles in their organization
CREATE POLICY "Users can view agent profiles in their organization"
    ON public.agent_profiles FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- Agents can update their own profile
CREATE POLICY "Agents can update their own profile"
    ON public.agent_profiles FOR UPDATE
    USING (user_id = auth.uid());

-- Admins can manage all agent profiles in their org
CREATE POLICY "Admins can insert agent profiles"
    ON public.agent_profiles FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update agent profiles in their org"
    ON public.agent_profiles FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------------------
-- CALL LOGS POLICIES
-- ----------------------------------------------------------------------------

-- Admins can view all call logs in their organization
CREATE POLICY "Admins can view all call logs"
    ON public.call_logs FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Agents can only see their own calls
CREATE POLICY "Agents can view their own calls"
    ON public.call_logs FOR SELECT
    USING (
        agent_id IN (
            SELECT id FROM public.agent_profiles WHERE user_id = auth.uid()
        )
    );

-- Anyone in org can insert call logs (server uses service key)
CREATE POLICY "Users can insert call logs"
    ON public.call_logs FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON public.sites
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_agent_profiles_updated_at
    BEFORE UPDATE ON public.agent_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- FUNCTION: Handle new user signup
-- ============================================================================
-- Creates organization and user record when someone signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
BEGIN
    -- Extract name from metadata or email
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Create a new organization for the user
    INSERT INTO public.organizations (name, slug)
    VALUES (
        user_name || '''s Organization',
        LOWER(REPLACE(user_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;
    
    -- Create the user record (as admin of their org)
    INSERT INTO public.users (id, organization_id, email, full_name, role)
    VALUES (
        NEW.id,
        new_org_id,
        NEW.email,
        user_name,
        'admin'
    );
    
    -- Create an agent profile for the admin
    INSERT INTO public.agent_profiles (user_id, organization_id, display_name)
    VALUES (
        NEW.id,
        new_org_id,
        user_name
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create org and user on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================
-- Run these in Supabase Dashboard > Storage or via API

-- Note: Execute this separately in Supabase Dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('videos', 'videos', true);

-- Storage policy for videos bucket (execute in Dashboard)
-- CREATE POLICY "Users can upload videos to their org folder"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--     bucket_id = 'videos' AND
--     (storage.foldername(name))[1] IN (
--         SELECT organization_id::text FROM public.users WHERE id = auth.uid()
--     )
-- );

-- ============================================================================
-- STORAGE POLICIES FOR VIDEOS BUCKET
-- ============================================================================

-- Allow users to upload videos to their org folder
CREATE POLICY "Users can upload videos to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to update their own videos
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'videos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow public read access to all videos (they're embedded on customer sites)
CREATE POLICY "Public video read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- ============================================================================
-- FIX RLS INFINITE RECURSION
-- ============================================================================
-- The original policies have infinite recursion because they query the users
-- table to check organization_id, but that query also needs to pass the policy.
-- 
-- Solution: Use a SECURITY DEFINER function that bypasses RLS to get the 
-- current user's organization_id.
-- ============================================================================

-- Create a function to get the current user's organization_id
-- SECURITY DEFINER makes it run with the privileges of the function owner (postgres)
-- which bypasses RLS, breaking the recursion
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
    SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organization_id() TO authenticated;

-- Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;

-- ============================================================================
-- FIX ORGANIZATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;

CREATE POLICY "Users can view their own organization"
    ON public.organizations FOR SELECT
    USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE
    USING (id = public.get_user_organization_id() AND public.is_user_admin());

-- ============================================================================
-- FIX USERS POLICIES  
-- ============================================================================

DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON public.users;

-- Users can view their own row directly, or any user in their org
CREATE POLICY "Users can view users in their organization"
    ON public.users FOR SELECT
    USING (
        id = auth.uid() OR 
        organization_id = public.get_user_organization_id()
    );

-- Admins can insert new users in their organization
CREATE POLICY "Admins can insert users in their organization"
    ON public.users FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

-- Admins can delete users in their organization (except themselves)
CREATE POLICY "Admins can delete users in their organization"
    ON public.users FOR DELETE
    USING (
        id != auth.uid() AND
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

-- ============================================================================
-- FIX SITES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sites in their organization" ON public.sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON public.sites;
DROP POLICY IF EXISTS "Admins can update sites" ON public.sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON public.sites;

CREATE POLICY "Users can view sites in their organization"
    ON public.sites FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can insert sites"
    ON public.sites FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

CREATE POLICY "Admins can update sites"
    ON public.sites FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

CREATE POLICY "Admins can delete sites"
    ON public.sites FOR DELETE
    USING (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

-- ============================================================================
-- FIX AGENT PROFILES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view agent profiles in their organization" ON public.agent_profiles;
DROP POLICY IF EXISTS "Admins can insert agent profiles" ON public.agent_profiles;
DROP POLICY IF EXISTS "Admins can update agent profiles in their org" ON public.agent_profiles;

CREATE POLICY "Users can view agent profiles in their organization"
    ON public.agent_profiles FOR SELECT
    USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can insert agent profiles"
    ON public.agent_profiles FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

CREATE POLICY "Admins can update agent profiles in their org"
    ON public.agent_profiles FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

-- ============================================================================
-- FIX CALL LOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view all call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Users can insert call logs" ON public.call_logs;

CREATE POLICY "Admins can view all call logs"
    ON public.call_logs FOR SELECT
    USING (
        organization_id = public.get_user_organization_id() AND 
        public.is_user_admin()
    );

CREATE POLICY "Users can insert call logs"
    ON public.call_logs FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id());

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

-- ============================================================================
-- ADD WAVE VIDEO URL TO AGENT PROFILES
-- ============================================================================
-- Adds support for the 3-video intro sequence:
-- 1. wave_video_url: Plays on loop (muted) until user interaction
-- 2. intro_video_url: Plays once with audio after user interaction
-- 3. loop_video_url: Loops forever after intro finishes
-- ============================================================================

ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS wave_video_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.agent_profiles.wave_video_url IS 'Video that loops muted until user interaction (wave/mimic intro)';

-- ============================================================================
-- ADD CONNECT VIDEO URL TO AGENT PROFILES
-- ============================================================================
-- Adds support for the 4th video in the intro sequence:
-- 1. wave_video_url: Plays on loop (muted) until user interaction
-- 2. intro_video_url: Plays once with audio after user interaction
-- 3. connect_video_url: Plays when visitor turns on their mic
-- 4. loop_video_url: Loops forever after connect video finishes
-- ============================================================================

ALTER TABLE public.agent_profiles
ADD COLUMN IF NOT EXISTS connect_video_url TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.agent_profiles.connect_video_url IS 'Video that plays when visitor enables their microphone';

-- ============================================================================
-- CALL ANALYTICS SCHEMA UPDATE
-- ============================================================================
-- Adds dispositions table and analytics columns to call_logs
-- ============================================================================

-- ============================================================================
-- DISPOSITIONS TABLE
-- ============================================================================
-- Organization-specific call outcomes that agents can assign after calls

CREATE TABLE IF NOT EXISTS public.dispositions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dispositions_organization_id ON public.dispositions(organization_id);
CREATE INDEX IF NOT EXISTS idx_dispositions_active ON public.dispositions(organization_id, is_active);

-- RLS Policies
ALTER TABLE public.dispositions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dispositions in their organization"
    ON public.dispositions FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage dispositions"
    ON public.dispositions FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_dispositions_updated_at
    BEFORE UPDATE ON public.dispositions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ADD ANALYTICS COLUMNS TO CALL_LOGS
-- ============================================================================

-- Add ring timing columns
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS ring_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS answer_time_seconds INTEGER;

-- Add recording URL
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- Add disposition reference
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS disposition_id UUID REFERENCES public.dispositions(id) ON DELETE SET NULL;

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_call_logs_disposition_id ON public.call_logs(disposition_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_page_url ON public.call_logs(page_url);
CREATE INDEX IF NOT EXISTS idx_call_logs_duration ON public.call_logs(duration_seconds);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON public.call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_agent_created ON public.call_logs(agent_id, created_at DESC);

-- ============================================================================
-- SEED DEFAULT DISPOSITIONS FOR EXISTING ORGANIZATIONS
-- ============================================================================

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Interested', '#22c55e', 1
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Not Interested', '#ef4444', 2
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Callback Requested', '#f59e0b', 3
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'No Answer', '#6b7280', 4
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO public.dispositions (organization_id, name, color, display_order)
SELECT id, 'Left Voicemail', '#8b5cf6', 5
FROM public.organizations
ON CONFLICT (organization_id, name) DO NOTHING;

-- ============================================================================
-- AUTO-CREATE DEFAULT DISPOSITIONS FOR NEW ORGANIZATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_dispositions()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.dispositions (organization_id, name, color, display_order) VALUES
        (NEW.id, 'Interested', '#22c55e', 1),
        (NEW.id, 'Not Interested', '#ef4444', 2),
        (NEW.id, 'Callback Requested', '#f59e0b', 3),
        (NEW.id, 'No Answer', '#6b7280', 4),
        (NEW.id, 'Left Voicemail', '#8b5cf6', 5);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_organization_created_create_dispositions ON public.organizations;
CREATE TRIGGER on_organization_created_create_dispositions
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.create_default_dispositions();

-- Make site_id nullable in call_logs to handle cases where site doesn't exist
ALTER TABLE public.call_logs 
ALTER COLUMN site_id DROP NOT NULL;

-- ============================================================================
-- ADD LOGO URL TO ORGANIZATIONS
-- ============================================================================

-- Add logo_url column to organizations table
ALTER TABLE public.organizations
ADD COLUMN logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.logo_url IS 'URL to the organization logo stored in Supabase storage';

-- ============================================================================
-- STORAGE POLICIES FOR LOGOS BUCKET
-- ============================================================================

-- Create logos bucket (run this in Supabase Dashboard if it fails)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow admins to upload logos to their org folder
CREATE POLICY "Admins can upload logos to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow admins to update their org's logos
CREATE POLICY "Admins can update their org logos"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow admins to delete their org's logos
CREATE POLICY "Admins can delete their org logos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'logos' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Allow public read access to logos (they may be displayed on widgets)
CREATE POLICY "Public logo read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

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

-- ============================================================================
-- AGENT INVITES TABLE
-- ============================================================================
-- Tracks pending invitations to join an organization
-- ============================================================================

CREATE TABLE public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES public.users(id),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- One pending invite per email per org
    UNIQUE(organization_id, email)
);

-- Indexes
CREATE INDEX idx_invites_token ON public.invites(token);
CREATE INDEX idx_invites_organization_id ON public.invites(organization_id);
CREATE INDEX idx_invites_email ON public.invites(email);

-- RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Admins can view invites in their organization
CREATE POLICY "Admins can view invites in their organization"
    ON public.invites FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can create invites in their organization
CREATE POLICY "Admins can create invites"
    ON public.invites FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can update invites (for marking as accepted)
CREATE POLICY "Admins can update invites"
    ON public.invites FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Admins can delete/revoke invites
CREATE POLICY "Admins can delete invites"
    ON public.invites FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow public read access for invite acceptance (via token)
-- This allows unauthenticated users to view their invite by token
CREATE POLICY "Anyone can view invite by token"
    ON public.invites FOR SELECT
    USING (true);

-- ============================================================================
-- UPDATE handle_new_user TRIGGER
-- ============================================================================
-- Skip automatic org/user creation for invited users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
BEGIN
    -- Check if user already exists in users table (created via invite flow)
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Check if there's a pending invite for this email
    -- If so, the app will handle user creation, skip here
    IF EXISTS (
        SELECT 1 FROM public.invites 
        WHERE email = NEW.email 
        AND accepted_at IS NULL 
        AND expires_at > NOW()
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Normal signup flow - create new org
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    INSERT INTO public.organizations (name, slug)
    VALUES (
        user_name || '''s Organization',
        LOWER(REPLACE(user_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;
    
    INSERT INTO public.users (id, organization_id, email, full_name, role)
    VALUES (NEW.id, new_org_id, NEW.email, user_name, 'admin');
    
    INSERT INTO public.agent_profiles (user_id, organization_id, display_name)
    VALUES (NEW.id, new_org_id, user_name);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- POOL VIDEO TEMPLATES
-- ============================================================================
-- Adds intro script and example videos to pools so admins can customize
-- what agents record per pool.
-- ============================================================================

-- Add video template columns to agent_pools
ALTER TABLE public.agent_pools 
  ADD COLUMN IF NOT EXISTS intro_script TEXT DEFAULT 'Hey, do you mind turning on your mic real fast? Quick question for you.',
  ADD COLUMN IF NOT EXISTS example_wave_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS example_intro_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS example_loop_video_url TEXT DEFAULT NULL;

-- Add video columns to agent_pool_members (agent's recorded videos PER pool)
ALTER TABLE public.agent_pool_members
  ADD COLUMN IF NOT EXISTS wave_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS intro_video_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS loop_video_url TEXT DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.agent_pools.intro_script IS 'The script text agents should read when recording their intro video for this pool';
COMMENT ON COLUMN public.agent_pools.example_wave_video_url IS 'Example video URL for agents to model their wave video (optional, falls back to system default)';
COMMENT ON COLUMN public.agent_pools.example_loop_video_url IS 'Example video URL for agents to model their loop/smile video (optional, falls back to system default)';
COMMENT ON COLUMN public.agent_pool_members.wave_video_url IS 'Agent wave video URL for this specific pool';
COMMENT ON COLUMN public.agent_pool_members.intro_video_url IS 'Agent intro video URL for this specific pool';
COMMENT ON COLUMN public.agent_pool_members.loop_video_url IS 'Agent loop/smile video URL for this specific pool';

-- ============================================================================
-- RECORDING SETTINGS
-- ============================================================================
-- Adds recording settings to organizations and creates recordings storage bucket.
-- ============================================================================

-- Add recording settings column to organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS recording_settings JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "retention_days": 30
  }'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN public.organizations.recording_settings IS 'Recording settings: { enabled: boolean, retention_days: number }';

-- ============================================================================
-- RECORDINGS STORAGE BUCKET
-- ============================================================================

-- Create recordings bucket if not exists (this is idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR RECORDINGS BUCKET
-- ============================================================================

-- Allow authenticated users to upload recordings to their org folder
CREATE POLICY "Users can upload recordings to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'recordings' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to update their own recordings (for overwriting)
CREATE POLICY "Users can update their own recordings"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'recordings' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow users to delete recordings in their org
CREATE POLICY "Users can delete recordings in their org"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'recordings' AND
    (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.users WHERE id = auth.uid()
    )
);

-- Allow public read access to recordings (for playback)
CREATE POLICY "Public recording read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'recordings');

-- ============================================================================
-- SCHEDULED CLEANUP FUNCTION (for retention policy)
-- ============================================================================
-- This function can be called via a cron job to delete expired recordings

CREATE OR REPLACE FUNCTION delete_expired_recordings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_record RECORD;
    retention_days INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    -- Loop through each organization
    FOR org_record IN 
        SELECT id, recording_settings 
        FROM public.organizations 
        WHERE (recording_settings->>'enabled')::boolean = true
    LOOP
        -- Get retention days (default 30 if not set)
        retention_days := COALESCE((org_record.recording_settings->>'retention_days')::integer, 30);
        cutoff_date := NOW() - (retention_days || ' days')::interval;
        
        -- Update call_logs to remove recording URLs for old recordings
        UPDATE public.call_logs
        SET recording_url = NULL
        WHERE organization_id = org_record.id
          AND recording_url IS NOT NULL
          AND created_at < cutoff_date;
          
        -- Note: Actual file deletion from storage should be handled separately
        -- by a backend job that reads the marked records and deletes files
    END LOOP;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION delete_expired_recordings() IS 'Clears recording URLs from call_logs based on org retention policy. Run via cron.';

-- ============================================================================
-- DISPOSITION VALUE FIELD
-- ============================================================================
-- Adds ability to assign a dollar value to each disposition for tracking
-- revenue/conversions (like Facebook ads conversion value)
-- 
-- Note: Primary disposition is determined by display_order (first = primary)
-- ============================================================================

-- Add value column (dollar amount, like Facebook ads conversion value)
ALTER TABLE public.dispositions 
ADD COLUMN IF NOT EXISTS value DECIMAL(10, 2) DEFAULT NULL;

-- Index for value-based analytics
CREATE INDEX IF NOT EXISTS idx_dispositions_value
ON public.dispositions (organization_id, value)
WHERE value IS NOT NULL;

-- ============================================================================
-- STORAGE BUCKETS AND CALL_LOGS POOL_ID
-- ============================================================================
-- Creates missing storage buckets and adds pool_id to call_logs for analytics
-- ============================================================================

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create videos bucket (for agent intro videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create logos bucket (for organization logos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VIDEOS BUCKET POLICIES
-- ============================================================================

-- Allow authenticated users to upload videos to their org folder
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload videos to their org folder'
    ) THEN
        CREATE POLICY "Users can upload videos to their org folder"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'videos' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow users to update their own videos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update their own videos'
    ) THEN
        CREATE POLICY "Users can update their own videos"
        ON storage.objects FOR UPDATE
        USING (
            bucket_id = 'videos' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow public read access to videos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public video read access'
    ) THEN
        CREATE POLICY "Public video read access"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'videos');
    END IF;
END $$;

-- Allow users to delete videos in their org
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete videos in their org'
    ) THEN
        CREATE POLICY "Users can delete videos in their org"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'videos' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- ============================================================================
-- ADD POOL_ID TO CALL_LOGS (for pool-based analytics)
-- ============================================================================

-- Add pool_id column to call_logs
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES public.agent_pools(id) ON DELETE SET NULL;

-- Create index for pool-based analytics queries
CREATE INDEX IF NOT EXISTS idx_call_logs_pool_id ON public.call_logs(pool_id);

-- Comment for documentation
COMMENT ON COLUMN public.call_logs.pool_id IS 'The pool the visitor was routed to (for analytics)';


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

-- ============================================================================
-- RECORDINGS STORAGE BUCKET
-- ============================================================================
-- Creates the recordings bucket for storing call recordings.
-- Recordings are private and only accessible to the organization's admins.
-- ============================================================================

-- Create recordings bucket (private - not public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RECORDINGS BUCKET POLICIES
-- ============================================================================

-- Allow authenticated users to upload recordings to their org folder
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload recordings to their org folder'
    ) THEN
        CREATE POLICY "Users can upload recordings to their org folder"
        ON storage.objects FOR INSERT
        WITH CHECK (
            bucket_id = 'recordings' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow users to read recordings in their org (for playback)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can read recordings in their org'
    ) THEN
        CREATE POLICY "Users can read recordings in their org"
        ON storage.objects FOR SELECT
        USING (
            bucket_id = 'recordings' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users WHERE id = auth.uid()
            )
        );
    END IF;
END $$;

-- Allow admins to delete recordings in their org
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can delete recordings in their org'
    ) THEN
        CREATE POLICY "Admins can delete recordings in their org"
        ON storage.objects FOR DELETE
        USING (
            bucket_id = 'recordings' AND
            (storage.foldername(name))[1] IN (
                SELECT organization_id::text FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- ============================================================================
-- ADD RECORDING URL UPDATE POLICY TO CALL_LOGS
-- ============================================================================

-- Allow users to update recording_url on call_logs in their org
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'call_logs' 
        AND policyname = 'Users can update call logs in their org'
    ) THEN
        CREATE POLICY "Users can update call logs in their org"
        ON public.call_logs FOR UPDATE
        USING (organization_id = public.get_user_organization_id());
    END IF;
END $$;

-- ============================================================================
-- CANCELLATION FEEDBACK TABLE
-- ============================================================================
-- Stores feedback when users cancel their subscriptions for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cancellation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  primary_reason TEXT NOT NULL,
  additional_reasons TEXT[] DEFAULT '{}',
  detailed_feedback TEXT,
  competitor_name TEXT,
  would_return BOOLEAN,
  return_conditions TEXT,
  agent_count INTEGER,
  monthly_cost DECIMAL(10,2),
  subscription_duration_days INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for querying by organization
CREATE INDEX IF NOT EXISTS idx_cancellation_feedback_org 
ON public.cancellation_feedback(organization_id);

-- Enable RLS
ALTER TABLE public.cancellation_feedback ENABLE ROW LEVEL SECURITY;

-- Only admins can view their org's cancellation feedback
CREATE POLICY "Admins can view their org feedback"
ON public.cancellation_feedback FOR SELECT
USING (
  organization_id = public.get_user_organization_id() 
  AND public.is_user_admin()
);

-- Users can insert feedback for their own org
CREATE POLICY "Users can submit cancellation feedback"
ON public.cancellation_feedback FOR INSERT
WITH CHECK (organization_id = public.get_user_organization_id());
-- ============================================================================
-- SOFT DELETE FOR AGENTS & SAFE CALL LOG RETENTION
-- ============================================================================
-- This migration:
-- 1. Adds soft delete columns to agent_profiles
-- 2. Changes call_logs.agent_id to SET NULL on delete (preserves history)
-- 3. Adds Stripe fields to organizations for seat-based billing
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SOFT DELETE FOR AGENT PROFILES
-- ----------------------------------------------------------------------------

-- Add soft delete columns
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- Index for filtering active agents efficiently
CREATE INDEX IF NOT EXISTS idx_agent_profiles_active 
ON public.agent_profiles(organization_id, is_active) 
WHERE is_active = TRUE;

-- Comment for documentation
COMMENT ON COLUMN public.agent_profiles.is_active IS 'Soft delete flag. FALSE means agent is deactivated but data preserved.';
COMMENT ON COLUMN public.agent_profiles.deactivated_at IS 'Timestamp when agent was deactivated (soft deleted).';

-- ----------------------------------------------------------------------------
-- 2. FIX CALL_LOGS FK TO PRESERVE HISTORY
-- ----------------------------------------------------------------------------

-- Make agent_id nullable (so we can SET NULL on delete)
ALTER TABLE public.call_logs ALTER COLUMN agent_id DROP NOT NULL;

-- Drop the existing CASCADE constraint
ALTER TABLE public.call_logs 
DROP CONSTRAINT IF EXISTS call_logs_agent_id_fkey;

-- Re-add with SET NULL behavior
ALTER TABLE public.call_logs 
ADD CONSTRAINT call_logs_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.agent_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.call_logs.agent_id IS 'Agent who handled the call. NULL if agent was hard-deleted (prefer soft delete).';

-- ----------------------------------------------------------------------------
-- 3. STRIPE BILLING FIELDS ON ORGANIZATIONS
-- ----------------------------------------------------------------------------

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 0;

-- Indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.organizations.stripe_customer_id IS 'Stripe Customer ID for billing.';
COMMENT ON COLUMN public.organizations.stripe_subscription_id IS 'Stripe Subscription ID for seat-based billing.';
COMMENT ON COLUMN public.organizations.stripe_subscription_item_id IS 'Stripe Subscription Item ID for updating seat quantity.';
COMMENT ON COLUMN public.organizations.seat_count IS 'Current billed seat count (active agents + pending invites).';

-- ----------------------------------------------------------------------------
-- 4. UPDATE EXISTING DATA
-- ----------------------------------------------------------------------------

-- Set all existing agents as active
UPDATE public.agent_profiles SET is_active = TRUE WHERE is_active IS NULL;

-- Calculate initial seat count for existing orgs (agents + pending invites)
UPDATE public.organizations o
SET seat_count = (
  SELECT COUNT(*) FROM public.agent_profiles ap 
  WHERE ap.organization_id = o.id AND ap.is_active = TRUE
) + (
  SELECT COUNT(*) FROM public.invites i 
  WHERE i.organization_id = o.id AND i.accepted_at IS NULL AND i.expires_at > NOW()
);

-- ============================================================================
-- ACCOUNT PAUSE FEATURE
-- ============================================================================
-- Adds subscription pause functionality as a downsell option before cancellation.
-- Paused accounts retain all data but cannot make new calls.
-- ============================================================================

-- Add subscription status and pause fields to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pause_months INTEGER,
ADD COLUMN IF NOT EXISTS pause_reason TEXT;

-- Add constraint for valid subscription statuses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organizations_subscription_status_check'
    ) THEN
        ALTER TABLE public.organizations
        ADD CONSTRAINT organizations_subscription_status_check
        CHECK (subscription_status IN ('active', 'paused', 'cancelled'));
    END IF;
END $$;

-- Index for finding accounts that need to be resumed
CREATE INDEX IF NOT EXISTS idx_organizations_pause_ends_at 
ON public.organizations(pause_ends_at) 
WHERE subscription_status = 'paused';

-- Index for subscription status queries
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_status
ON public.organizations(subscription_status);

-- Comments for documentation
COMMENT ON COLUMN public.organizations.subscription_status IS 'Current subscription state: active, paused, or cancelled';
COMMENT ON COLUMN public.organizations.paused_at IS 'Timestamp when the account was paused';
COMMENT ON COLUMN public.organizations.pause_ends_at IS 'Timestamp when the pause period ends and billing resumes';
COMMENT ON COLUMN public.organizations.pause_months IS 'Number of months the account is paused for (1, 2, or 3)';
COMMENT ON COLUMN public.organizations.pause_reason IS 'Optional reason provided when pausing';

-- ============================================================================
-- PAUSE HISTORY TABLE (for tracking pause events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pause_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    action TEXT NOT NULL CHECK (action IN ('paused', 'resumed', 'extended')),
    pause_months INTEGER,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for org lookup
CREATE INDEX IF NOT EXISTS idx_pause_history_org 
ON public.pause_history(organization_id);

-- RLS policies for pause_history
ALTER TABLE public.pause_history ENABLE ROW LEVEL SECURITY;

-- Admins can view their org's pause history
CREATE POLICY "Admins can view org pause history"
ON public.pause_history FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can insert pause history for their org
CREATE POLICY "Admins can insert pause history"
ON public.pause_history FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

COMMENT ON TABLE public.pause_history IS 'Tracks account pause/resume events for analytics';

-- ============================================================================
-- FACEBOOK INTEGRATION
-- ============================================================================
-- Adds Facebook Pixel and Conversion API integration at organization and 
-- disposition levels. This enables firing Facebook events when agents 
-- select specific dispositions after calls.
-- ============================================================================

-- ============================================================================
-- FACEBOOK SETTINGS ON ORGANIZATIONS
-- ============================================================================
-- Organization-level Facebook integration settings stored as JSONB

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS facebook_settings JSONB NOT NULL DEFAULT '{
    "pixel_id": null,
    "capi_access_token": null,
    "test_event_code": null,
    "enabled": false,
    "pixel_base_code": null,
    "dataset_id": null
}'::jsonb;

COMMENT ON COLUMN public.organizations.facebook_settings IS 'Facebook integration: { pixel_id, capi_access_token, test_event_code, enabled, pixel_base_code, dataset_id }';

-- ============================================================================
-- FACEBOOK EVENT FIELDS ON DISPOSITIONS
-- ============================================================================
-- Per-disposition settings for which Facebook event to fire

-- Facebook standard event name (Lead, Purchase, etc.)
ALTER TABLE public.dispositions 
ADD COLUMN IF NOT EXISTS fb_event_name TEXT DEFAULT NULL;

-- Whether to fire the Facebook event for this disposition
ALTER TABLE public.dispositions 
ADD COLUMN IF NOT EXISTS fb_event_enabled BOOLEAN NOT NULL DEFAULT false;

-- Optional custom event parameters stored as JSONB
ALTER TABLE public.dispositions 
ADD COLUMN IF NOT EXISTS fb_event_params JSONB DEFAULT NULL;

COMMENT ON COLUMN public.dispositions.fb_event_name IS 'Facebook standard event name (Lead, Purchase, CompleteRegistration, etc.)';
COMMENT ON COLUMN public.dispositions.fb_event_enabled IS 'Whether to fire this Facebook event when disposition is selected';
COMMENT ON COLUMN public.dispositions.fb_event_params IS 'Optional custom parameters to send with the Facebook event';

-- Index for finding dispositions with FB events enabled
CREATE INDEX IF NOT EXISTS idx_dispositions_fb_event_enabled
ON public.dispositions (organization_id, fb_event_enabled)
WHERE fb_event_enabled = true;

-- ============================================================================
-- WIDGET SETTINGS
-- ============================================================================
-- Adds widget settings at org level (defaults) and pool level (overrides)
-- Settings: size, position, devices
-- ============================================================================

-- Add default widget settings to organizations
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_widget_settings JSONB NOT NULL DEFAULT '{
  "size": "medium",
  "position": "bottom-right",
  "devices": "all",
  "trigger_delay": 3
}'::jsonb;

-- Add optional widget settings override to pools
ALTER TABLE public.agent_pools
ADD COLUMN IF NOT EXISTS widget_settings JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.default_widget_settings IS 'Default widget appearance settings for the organization';
COMMENT ON COLUMN public.agent_pools.widget_settings IS 'Optional widget settings override for this pool (null = use org defaults)';

-- ============================================================================
-- AGENT SESSIONS & ACTIVITY TRACKING
-- ============================================================================
-- This migration adds:
-- 1. agent_sessions - Tracks each login-to-logout session
-- 2. agent_status_changes - Audit log of status transitions within sessions
-- 3. RPC function for atomic time increments
-- ============================================================================

-- ============================================================================
-- AGENT SESSIONS TABLE
-- ============================================================================
-- Tracks each login-to-logout session for an agent.
-- A session starts when agent connects to signaling server and ends on disconnect.

CREATE TABLE public.agent_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Session boundaries
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ DEFAULT NULL,  -- NULL = session still active
    
    -- Computed duration (seconds) - set when session ends
    duration_seconds INTEGER DEFAULT NULL,
    
    -- Time breakdown (updated incrementally and on session end)
    idle_seconds INTEGER NOT NULL DEFAULT 0,
    in_call_seconds INTEGER NOT NULL DEFAULT 0,
    away_seconds INTEGER NOT NULL DEFAULT 0,
    
    -- How the session ended
    ended_reason TEXT CHECK (ended_reason IN ('logout', 'disconnect', 'idle_timeout', 'server_restart')) DEFAULT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying agent's sessions by date (most common query)
CREATE INDEX idx_agent_sessions_agent_date 
ON public.agent_sessions(agent_id, started_at DESC);

-- Index for org-wide queries (team overview)
CREATE INDEX idx_agent_sessions_org_date 
ON public.agent_sessions(organization_id, started_at DESC);

-- Index for finding active sessions
CREATE INDEX idx_agent_sessions_active 
ON public.agent_sessions(agent_id) 
WHERE ended_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE public.agent_sessions IS 'Tracks each login-to-logout session for agents';
COMMENT ON COLUMN public.agent_sessions.duration_seconds IS 'Total session duration in seconds, calculated on session end';
COMMENT ON COLUMN public.agent_sessions.idle_seconds IS 'Time spent in idle/available status';
COMMENT ON COLUMN public.agent_sessions.in_call_seconds IS 'Time spent on calls';
COMMENT ON COLUMN public.agent_sessions.away_seconds IS 'Time spent in away status';


-- ============================================================================
-- AGENT STATUS CHANGES TABLE
-- ============================================================================
-- Audit log of every status change within a session.
-- Used to calculate time breakdowns and for detailed timeline view.

CREATE TABLE public.agent_status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.agent_profiles(id) ON DELETE CASCADE,
    
    -- Status transition
    from_status TEXT NOT NULL,
    to_status TEXT NOT NULL CHECK (to_status IN ('idle', 'in_call', 'away', 'offline')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Optional context
    reason TEXT  -- e.g., 'call_started', 'call_ended', 'ring_no_answer', 'manual'
);

-- Index for querying status changes within a session
CREATE INDEX idx_status_changes_session 
ON public.agent_status_changes(session_id, changed_at);

-- Index for querying by agent
CREATE INDEX idx_status_changes_agent 
ON public.agent_status_changes(agent_id, changed_at DESC);

-- Comments for documentation
COMMENT ON TABLE public.agent_status_changes IS 'Audit log of agent status transitions within sessions';
COMMENT ON COLUMN public.agent_status_changes.reason IS 'Context for the status change (e.g., call_started, ring_no_answer)';


-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_status_changes ENABLE ROW LEVEL SECURITY;

-- Admins can see all sessions in their org
CREATE POLICY "Admins can view org sessions"
ON public.agent_sessions FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Agents can see their own sessions
CREATE POLICY "Agents can view own sessions"
ON public.agent_sessions FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
    )
);

-- Admins can view org status changes
CREATE POLICY "Admins can view org status changes"
ON public.agent_status_changes FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT ap.id FROM public.agent_profiles ap
        JOIN public.users u ON ap.organization_id = u.organization_id
        WHERE u.id = auth.uid() AND u.role = 'admin'
    )
);

-- Agents can view own status changes
CREATE POLICY "Agents can view own status changes"
ON public.agent_status_changes FOR SELECT
TO authenticated
USING (
    agent_id IN (
        SELECT id FROM public.agent_profiles 
        WHERE user_id = auth.uid()
    )
);


-- ============================================================================
-- RPC FUNCTION FOR ATOMIC TIME INCREMENT
-- ============================================================================
-- Used by the server to atomically increment session time fields

CREATE OR REPLACE FUNCTION public.increment_session_time(
    p_session_id UUID,
    p_field TEXT,
    p_seconds INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Validate field name to prevent SQL injection
    IF p_field NOT IN ('idle_seconds', 'in_call_seconds', 'away_seconds') THEN
        RAISE EXCEPTION 'Invalid field name: %', p_field;
    END IF;
    
    -- Perform the update
    EXECUTE format(
        'UPDATE public.agent_sessions SET %I = %I + $1 WHERE id = $2',
        p_field, p_field
    ) USING p_seconds, p_session_id;
END;
$$;

-- Grant execute to service role (server-side only)
REVOKE ALL ON FUNCTION public.increment_session_time FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_session_time TO service_role;

COMMENT ON FUNCTION public.increment_session_time IS 'Atomically increments a time field on an agent session';

-- ============================================================================
-- FOUNDING ADMIN: NOT AN AGENT BY DEFAULT
-- ============================================================================
-- When a new user signs up (creates a new org), their agent profile should
-- be created with is_active = false. They can choose to become an active
-- agent during onboarding if they want to take calls.
--
-- This implements "only pay for agents who take calls" pricing model.
-- ============================================================================

-- Update the handle_new_user function to create inactive agent profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    user_name TEXT;
BEGIN
    -- Check if user already exists in users table (created via invite flow)
    IF EXISTS (SELECT 1 FROM public.users WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;
    
    -- Check if there's a pending invite for this email
    -- If so, the app will handle user creation, skip here
    IF EXISTS (
        SELECT 1 FROM public.invites 
        WHERE email = NEW.email 
        AND accepted_at IS NULL 
        AND expires_at > NOW()
    ) THEN
        RETURN NEW;
    END IF;
    
    -- Normal signup flow - create new org
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Create organization
    INSERT INTO public.organizations (name, slug)
    VALUES (
        user_name || '''s Organization',
        LOWER(REPLACE(user_name, ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
    )
    RETURNING id INTO new_org_id;
    
    -- Create user as admin
    INSERT INTO public.users (id, organization_id, email, full_name, role)
    VALUES (NEW.id, new_org_id, NEW.email, user_name, 'admin');
    
    -- Create agent profile but INACTIVE by default
    -- Founding admin can activate during onboarding if they want to take calls
    -- This ensures they're not billed until they explicitly choose to be an agent
    INSERT INTO public.agent_profiles (user_id, organization_id, display_name, is_active)
    VALUES (NEW.id, new_org_id, user_name, FALSE);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the billing model
COMMENT ON FUNCTION public.handle_new_user() IS 
'Creates org, user, and agent profile for new signups. 
Agent profile is created INACTIVE so founding admins are not billed 
until they explicitly choose to take calls during onboarding.';

-- ============================================================================
-- EMBED VERIFICATION TRACKING
-- ============================================================================
-- Track when an organization first successfully installs the widget

ALTER TABLE public.organizations 
ADD COLUMN embed_verified_at TIMESTAMPTZ,
ADD COLUMN embed_verified_domain TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.organizations.embed_verified_at IS 'Timestamp of first successful widget connection';
COMMENT ON COLUMN public.organizations.embed_verified_domain IS 'Domain where widget was first detected';

-- ============================================================================
-- WIDGET PAGEVIEWS TABLE
-- ============================================================================
-- Track when the widget popup is shown to visitors (before they call)
-- This allows calculating pageview-to-call conversion rate

CREATE TABLE public.widget_pageviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pool_id UUID REFERENCES public.agent_pools(id) ON DELETE SET NULL,
    visitor_id TEXT NOT NULL,
    page_url TEXT NOT NULL,
    agent_id UUID REFERENCES public.agent_profiles(id) ON DELETE SET NULL,
    visitor_country_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_widget_pageviews_organization_id ON public.widget_pageviews(organization_id);
CREATE INDEX idx_widget_pageviews_created_at ON public.widget_pageviews(created_at DESC);
CREATE INDEX idx_widget_pageviews_agent_id ON public.widget_pageviews(agent_id);
CREATE INDEX idx_widget_pageviews_pool_id ON public.widget_pageviews(pool_id);
CREATE INDEX idx_widget_pageviews_org_date ON public.widget_pageviews(organization_id, created_at DESC);
CREATE INDEX idx_widget_pageviews_country ON public.widget_pageviews(visitor_country_code);

-- Enable RLS
ALTER TABLE public.widget_pageviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view pageviews for their organization
CREATE POLICY "Admins can view organization pageviews"
    ON public.widget_pageviews
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
            AND u.organization_id = widget_pageviews.organization_id
            AND u.role = 'admin'
        )
    );

-- Allow insert from service role (server-side tracking)
-- No RLS policy needed for insert as it's done via service role

-- ============================================================================
-- WIDGET THEME SETTING
-- ============================================================================
-- Adds theme setting to widget settings (light/dark/auto)
-- Auto mode follows the visitor's system preference
-- ============================================================================

-- Update default widget settings in organizations to include theme
-- Note: We use jsonb_set to add the theme field to existing settings
UPDATE public.organizations
SET default_widget_settings = default_widget_settings || '{"theme": "dark"}'::jsonb
WHERE NOT (default_widget_settings ? 'theme');

-- Update the default value for new organizations
ALTER TABLE public.organizations
ALTER COLUMN default_widget_settings SET DEFAULT '{
  "size": "medium",
  "position": "bottom-right",
  "devices": "all",
  "trigger_delay": 3,
  "auto_hide_delay": null,
  "show_minimize_button": false,
  "theme": "dark"
}'::jsonb;

-- Also update any existing pool widget_settings that have custom settings
UPDATE public.agent_pools
SET widget_settings = widget_settings || '{"theme": "dark"}'::jsonb
WHERE widget_settings IS NOT NULL 
  AND NOT (widget_settings ? 'theme');

COMMENT ON COLUMN public.organizations.default_widget_settings IS 'Default widget appearance settings for the organization including theme (light/dark/auto)';

-- ============================================================================
-- ADD LOCATION COLUMNS TO CALL_LOGS
-- ============================================================================
-- Stores visitor location resolved from IP address for analytics and filtering
-- ============================================================================

-- Add location columns to call_logs
ALTER TABLE public.call_logs 
ADD COLUMN IF NOT EXISTS visitor_ip TEXT,
ADD COLUMN IF NOT EXISTS visitor_city TEXT,
ADD COLUMN IF NOT EXISTS visitor_region TEXT,
ADD COLUMN IF NOT EXISTS visitor_country TEXT,
ADD COLUMN IF NOT EXISTS visitor_country_code TEXT;

-- Create index for location-based filtering
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_city ON public.call_logs(visitor_city);
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_region ON public.call_logs(visitor_region);
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_country ON public.call_logs(visitor_country);
CREATE INDEX IF NOT EXISTS idx_call_logs_visitor_country_code ON public.call_logs(visitor_country_code);

-- Composite index for common location queries
CREATE INDEX IF NOT EXISTS idx_call_logs_location ON public.call_logs(organization_id, visitor_country_code, visitor_region, visitor_city);

-- Add blocked_countries column to organizations table
-- This stores an array of ISO 3166-1 alpha-2 country codes (e.g., ['CN', 'RU', 'KP'])
-- Visitors from these countries will not see the widget

ALTER TABLE public.organizations
ADD COLUMN blocked_countries text[] DEFAULT '{}' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.blocked_countries IS 
'Array of ISO 3166-1 alpha-2 country codes. Visitors from these countries will not see the widget.';

-- Create index for efficient lookup (GIN index for array containment queries)
CREATE INDEX idx_organizations_blocked_countries ON public.organizations USING GIN (blocked_countries);

-- Add country_list_mode column to organizations table
-- This determines whether the country_list is used as a blocklist or allowlist
-- Mode 'blocklist': countries in the list are BLOCKED (default, current behavior)
-- Mode 'allowlist': ONLY countries in the list are ALLOWED

-- Create enum type for the mode
DO $$ BEGIN
  CREATE TYPE country_list_mode_enum AS ENUM ('blocklist', 'allowlist');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add the mode column with default 'blocklist' to preserve existing behavior
ALTER TABLE public.organizations
ADD COLUMN country_list_mode country_list_mode_enum DEFAULT 'blocklist' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.country_list_mode IS 
'Determines how the blocked_countries list is interpreted. "blocklist" = countries are blocked, "allowlist" = only listed countries are allowed';
