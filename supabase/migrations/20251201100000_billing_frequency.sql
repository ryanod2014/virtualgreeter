-- ============================================================================
-- BILLING FREQUENCY & 6-MONTH OFFER
-- ============================================================================
-- Adds billing frequency (monthly/annual/six_month) to organizations
-- and tracks whether they have the 6-month offer (one-time signup perk)
-- ============================================================================

-- Add billing_frequency column (defaults to monthly for existing orgs)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS billing_frequency TEXT DEFAULT 'monthly'
CHECK (billing_frequency IN ('monthly', 'annual', 'six_month'));

-- Add has_six_month_offer column (false for existing orgs - they didn't sign up with it)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS has_six_month_offer BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN public.organizations.billing_frequency IS 
'Billing frequency for all seats: monthly ($297), annual ($193), or six_month ($178). Org-wide setting.';

COMMENT ON COLUMN public.organizations.has_six_month_offer IS 
'Whether org has access to 6-month pricing. True only if they signed up with it. Lost forever if they switch away.';

-- Update existing orgs with seat_count to have reasonable defaults
-- If they have a subscription, assume they're on monthly (safest default)
UPDATE public.organizations 
SET billing_frequency = 'monthly', has_six_month_offer = false
WHERE billing_frequency IS NULL;

