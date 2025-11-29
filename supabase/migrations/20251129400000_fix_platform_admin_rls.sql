-- ============================================================================
-- FIX PLATFORM ADMIN RLS RECURSION
-- ============================================================================
-- The platform admin policies have infinite recursion because they query the 
-- users table to check is_platform_admin, but that query also needs to pass 
-- the RLS policy on users table.
--
-- Solution: Use a SECURITY DEFINER function that bypasses RLS.
-- ============================================================================

-- Create a function to check if current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE(
        (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
        FALSE
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- ============================================================================
-- DROP OLD POLICIES AND RECREATE WITH FUNCTION
-- ============================================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Platform admins can view all organizations" ON organizations;
DROP POLICY IF EXISTS "Platform admins can view all users" ON users;
DROP POLICY IF EXISTS "Platform admins can view all feedback" ON feedback_items;
DROP POLICY IF EXISTS "Platform admins can update all feedback" ON feedback_items;
DROP POLICY IF EXISTS "Platform admins can view all cancellation feedback" ON cancellation_feedback;
DROP POLICY IF EXISTS "Platform admins can view all agent profiles" ON agent_profiles;
DROP POLICY IF EXISTS "Platform admins can view all call logs" ON call_logs;
DROP POLICY IF EXISTS "Platform admins can view all surveys" ON pmf_surveys;

-- ============================================================================
-- RECREATE POLICIES USING THE FUNCTION
-- ============================================================================

-- Platform admins can view all organizations
CREATE POLICY "Platform admins can view all organizations"
ON organizations FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can view all users
CREATE POLICY "Platform admins can view all users"
ON users FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can view all feedback items
CREATE POLICY "Platform admins can view all feedback"
ON feedback_items FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can update any feedback (for status changes)
CREATE POLICY "Platform admins can update all feedback"
ON feedback_items FOR UPDATE
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can view all cancellation feedback
CREATE POLICY "Platform admins can view all cancellation feedback"
ON cancellation_feedback FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can view all agent profiles
CREATE POLICY "Platform admins can view all agent profiles"
ON agent_profiles FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can view all call logs
CREATE POLICY "Platform admins can view all call logs"
ON call_logs FOR SELECT
TO authenticated
USING (public.is_platform_admin());

-- Platform admins can view all PMF surveys
CREATE POLICY "Platform admins can view all surveys"
ON pmf_surveys FOR SELECT
TO authenticated
USING (public.is_platform_admin());

