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

