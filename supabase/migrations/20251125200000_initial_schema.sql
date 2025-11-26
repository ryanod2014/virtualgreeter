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

