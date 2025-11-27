-- ============================================================================
-- SOFT DELETE FOR AGENTS & SAFE CALL LOG RETENTION
-- ============================================================================
-- This migration:
-- 1. Adds soft delete columns to agent_profiles
-- 2. Changes call_logs.agent_id to SET NULL on delete (preserves history)
-- 3. Adds Stripe fields to organizations for seat-based billing
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SOFT DELETE FOR AGENT PROFILES
-- ----------------------------------------------------------------------------

-- Add soft delete columns
ALTER TABLE public.agent_profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- Index for filtering active agents efficiently
CREATE INDEX IF NOT EXISTS idx_agent_profiles_active 
ON public.agent_profiles(organization_id, is_active) 
WHERE is_active = TRUE;

-- Comment for documentation
COMMENT ON COLUMN public.agent_profiles.is_active IS 'Soft delete flag. FALSE means agent is deactivated but data preserved.';
COMMENT ON COLUMN public.agent_profiles.deactivated_at IS 'Timestamp when agent was deactivated (soft deleted).';

-- ----------------------------------------------------------------------------
-- 2. FIX CALL_LOGS FK TO PRESERVE HISTORY
-- ----------------------------------------------------------------------------

-- Make agent_id nullable (so we can SET NULL on delete)
ALTER TABLE public.call_logs ALTER COLUMN agent_id DROP NOT NULL;

-- Drop the existing CASCADE constraint
ALTER TABLE public.call_logs 
DROP CONSTRAINT IF EXISTS call_logs_agent_id_fkey;

-- Re-add with SET NULL behavior
ALTER TABLE public.call_logs 
ADD CONSTRAINT call_logs_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES public.agent_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.call_logs.agent_id IS 'Agent who handled the call. NULL if agent was hard-deleted (prefer soft delete).';

-- ----------------------------------------------------------------------------
-- 3. STRIPE BILLING FIELDS ON ORGANIZATIONS
-- ----------------------------------------------------------------------------

ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS seat_count INTEGER NOT NULL DEFAULT 0;

-- Indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer 
ON public.organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.organizations.stripe_customer_id IS 'Stripe Customer ID for billing.';
COMMENT ON COLUMN public.organizations.stripe_subscription_id IS 'Stripe Subscription ID for seat-based billing.';
COMMENT ON COLUMN public.organizations.stripe_subscription_item_id IS 'Stripe Subscription Item ID for updating seat quantity.';
COMMENT ON COLUMN public.organizations.seat_count IS 'Current billed seat count (active agents + pending invites).';

-- ----------------------------------------------------------------------------
-- 4. UPDATE EXISTING DATA
-- ----------------------------------------------------------------------------

-- Set all existing agents as active
UPDATE public.agent_profiles SET is_active = TRUE WHERE is_active IS NULL;

-- Calculate initial seat count for existing orgs (agents + pending invites)
UPDATE public.organizations o
SET seat_count = (
  SELECT COUNT(*) FROM public.agent_profiles ap 
  WHERE ap.organization_id = o.id AND ap.is_active = TRUE
) + (
  SELECT COUNT(*) FROM public.invites i 
  WHERE i.organization_id = o.id AND i.accepted_at IS NULL AND i.expires_at > NOW()
);

