-- ============================================================================
-- Migration: Expand subscription_status constraint
-- ============================================================================
-- Adds 'trialing' and 'past_due' to the allowed subscription statuses
-- Required for proper Stripe webhook handling and trial period support
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.organizations
DROP CONSTRAINT IF EXISTS organizations_subscription_status_check;

-- Add the expanded constraint with new statuses
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_subscription_status_check
CHECK (subscription_status IN ('active', 'paused', 'cancelled', 'trialing', 'past_due'));

-- Update the comment to reflect new statuses
COMMENT ON COLUMN public.organizations.subscription_status IS 
'Current subscription state: active (paying), trialing (trial period), past_due (payment failed), paused, or cancelled';

