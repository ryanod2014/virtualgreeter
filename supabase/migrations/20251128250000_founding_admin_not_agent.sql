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

