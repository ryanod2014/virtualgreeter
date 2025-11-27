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


