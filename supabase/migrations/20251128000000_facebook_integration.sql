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

