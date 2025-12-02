-- ============================================================================
-- GREETNOW RETARGETING PIXEL
-- ============================================================================
-- Enables GreetNow to fire their own Facebook pixel on B2B customer widgets
-- for retargeting visitors who saw/used the widget.
-- 
-- This is SEPARATE from customers' own facebook_settings which fires on 
-- dispositions for their conversion tracking.
-- ============================================================================

-- ============================================================================
-- ORGANIZATION FLAG
-- ============================================================================
-- Platform admins can enable GreetNow's retargeting pixel per-organization
-- Only enable for B2B customers whose visitors are potential GreetNow leads

ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS greetnow_retargeting_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.organizations.greetnow_retargeting_enabled IS 
  'When true, GreetNow fires their retargeting pixel on this org widget. Platform-admin controlled.';

-- Index for server-side lookups
CREATE INDEX IF NOT EXISTS idx_organizations_greetnow_retargeting 
  ON public.organizations(greetnow_retargeting_enabled) 
  WHERE greetnow_retargeting_enabled = true;

-- ============================================================================
-- PLATFORM SETTINGS TABLE
-- ============================================================================
-- Stores platform-wide settings like GreetNow's Facebook pixel credentials
-- Key-value store for flexibility

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.platform_settings IS 
  'Platform-wide settings (e.g., GreetNow Facebook pixel credentials). Platform-admin only.';

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read platform settings
DROP POLICY IF EXISTS "Platform admins can read platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can read platform settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

-- Only platform admins can insert platform settings
DROP POLICY IF EXISTS "Platform admins can insert platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can insert platform settings"
  ON public.platform_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_platform_admin());

-- Only platform admins can update platform settings
DROP POLICY IF EXISTS "Platform admins can update platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin());

-- Only platform admins can delete platform settings
DROP POLICY IF EXISTS "Platform admins can delete platform settings" ON public.platform_settings;
CREATE POLICY "Platform admins can delete platform settings"
  ON public.platform_settings
  FOR DELETE
  TO authenticated
  USING (public.is_platform_admin());

-- ============================================================================
-- PLATFORM ADMIN UPDATE POLICY FOR ORGANIZATIONS
-- ============================================================================
-- Allow platform admins to update the retargeting flag on any organization

DROP POLICY IF EXISTS "Platform admins can update organization retargeting" ON public.organizations;
CREATE POLICY "Platform admins can update organization retargeting"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ============================================================================
-- INITIALIZE DEFAULT SETTINGS
-- ============================================================================
-- Insert placeholder for GreetNow Facebook pixel settings

INSERT INTO public.platform_settings (key, value)
VALUES (
  'greetnow_facebook_pixel',
  '{
    "enabled": false,
    "pixel_id": null,
    "access_token": null,
    "test_event_code": null
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

