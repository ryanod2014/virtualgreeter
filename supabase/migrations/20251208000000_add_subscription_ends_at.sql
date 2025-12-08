-- ============================================================================
-- Migration: Add subscription_ends_at field for grace period tracking
-- ============================================================================
-- Adds subscription_ends_at to track when subscription access ends after
-- cancellation. This enables the grace period feature where users retain
-- access until the end of their billing period.
-- ============================================================================

-- Add subscription_ends_at field to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;

-- Add index for efficient queries of subscriptions ending soon
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_ends_at
ON public.organizations(subscription_ends_at)
WHERE subscription_ends_at IS NOT NULL;

-- Add comment documenting the field
COMMENT ON COLUMN public.organizations.subscription_ends_at IS
'Timestamp when subscription access ends after cancellation. User retains access until this date (grace period). When this date passes, webhook triggers downgrade to free plan.';
