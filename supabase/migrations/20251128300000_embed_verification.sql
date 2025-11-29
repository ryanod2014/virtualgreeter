-- ============================================================================
-- EMBED VERIFICATION TRACKING
-- ============================================================================
-- Track when an organization first successfully installs the widget

ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS embed_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS embed_verified_domain TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.organizations.embed_verified_at IS 'Timestamp of first successful widget connection';
COMMENT ON COLUMN public.organizations.embed_verified_domain IS 'Domain where widget was first detected';

