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

