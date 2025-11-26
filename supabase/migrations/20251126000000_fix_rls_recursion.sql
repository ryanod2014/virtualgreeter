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

