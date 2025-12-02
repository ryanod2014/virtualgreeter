-- Add country_list_mode column to organizations table
-- This determines whether the country_list is used as a blocklist or allowlist
-- Mode 'blocklist': countries in the list are BLOCKED (default, current behavior)
-- Mode 'allowlist': ONLY countries in the list are ALLOWED

-- Create enum type for the mode
DO $$ BEGIN
  CREATE TYPE country_list_mode_enum AS ENUM ('blocklist', 'allowlist');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add the mode column with default 'blocklist' to preserve existing behavior
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS country_list_mode country_list_mode_enum DEFAULT 'blocklist' NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.country_list_mode IS 
'Determines how the blocked_countries list is interpreted. "blocklist" = countries are blocked, "allowlist" = only listed countries are allowed';

