-- Add blocked_countries column to organizations table
-- This stores an array of ISO 3166-1 alpha-2 country codes (e.g., ['CN', 'RU', 'KP'])
-- Visitors from these countries will not see the widget

ALTER TABLE public.organizations
ADD COLUMN blocked_countries text[] DEFAULT '{}' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.blocked_countries IS 
'Array of ISO 3166-1 alpha-2 country codes. Visitors from these countries will not see the widget.';

-- Create index for efficient lookup (GIN index for array containment queries)
CREATE INDEX idx_organizations_blocked_countries ON public.organizations USING GIN (blocked_countries);

